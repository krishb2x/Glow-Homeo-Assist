import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";

export type LiveNoteDraft = {
  chiefComplaints: string;
  emotionalState: string;
  physicalSymptoms: string;
  /** Modalities — better/worse factors. Extracted by LLM if available. */
  modalities: string;
  timeline: string;
  needsReview: boolean;
};

export const emptyDraft = (): LiveNoteDraft => ({
  chiefComplaints: "",
  emotionalState: "",
  physicalSymptoms: "",
  modalities: "",
  timeline: "",
  needsReview: true
});

let cachedModel: GenerativeModel | null | undefined;
function getModel(): GenerativeModel | null {
  if (cachedModel !== undefined) return cachedModel;
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    cachedModel = null;
    return null;
  }
  const gen = new GoogleGenerativeAI(key);
  const name = process.env.GEMINI_LIVE_MODEL ?? "gemini-2.0-flash";
  cachedModel = gen.getGenerativeModel({ model: name });
  return cachedModel;
}

/** Returns true when a Gemini API key is present and the model is usable. */
export function isAiAvailable(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

/**
 * Transcribe a short WebM/Opus chunk (e.g. 2–4s) and return plain text.
 * Returns { text: "", usedMock: true } when GEMINI_API_KEY is absent.
 */
export async function transcribeAudioChunk(
  base64: string,
  mimeType: string
): Promise<{ text: string; usedMock: boolean }> {
  const model = getModel();
  if (!model) {
    return { text: "", usedMock: true };
  }
  const prompt =
    "Transcribe the speech in this audio. Output only the words spoken, in the original language. " +
    "If there is no clear speech, output a single dash character.";
  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: mimeType || "audio/webm", data: base64 } },
          { text: prompt }
        ]
      }
    ]
  });
  const text = result.response.text().trim();
  if (text === "-") return { text: "", usedMock: false };
  return { text, usedMock: false };
}

const NOTE_SCHEMA = `{
  "chiefComplaints": string,
  "emotionalState": string,
  "physicalSymptoms": string,
  "modalities": string,
  "timeline": string,
  "needsReview": boolean
}`;

const CLINICAL_SCRIBE_SYSTEM =
  "You are an expert clinical scribe for a homeopathy practice. " +
  "Given the visit transcript (may be mixed English/Hindi/regional language), " +
  `return ONLY valid JSON matching this schema: ${NOTE_SCHEMA}. ` +
  "Rules: be concise and clinical; do not invent facts not in the transcript; " +
  "modalities = factors that make symptoms better or worse (e.g. warmth, cold, motion, rest, time); " +
  "if a field is not supported by the transcript, use an empty string; " +
  "set needsReview=true when anything is uncertain or the transcript is incomplete.";

/**
 * Refine running clinical note fields from the full transcript so far.
 * Used by the WebSocket live pipeline (called every ~4s).
 */
export async function extractNoteDraftFromTranscript(
  fullTranscript: string,
  prior: LiveNoteDraft
): Promise<LiveNoteDraft> {
  const model = getModel();
  if (!model) return prior;
  const result = await model.generateContent(
    CLINICAL_SCRIBE_SYSTEM +
      `\n\nTranscript:\n${fullTranscript}\n\n` +
      `Previous draft (use for continuity; prefer transcript if conflict):\n${JSON.stringify(prior)}`
  );
  return parseDraft(result.response.text(), prior);
}

/**
 * Generate a complete structured note from a full transcript in one shot.
 * Used by the explicit REST "Generate Notes" action (not the live pipeline).
 * Returns null when AI is not available.
 */
export async function generateStructuredNotes(
  fullTranscript: string
): Promise<LiveNoteDraft | null> {
  const model = getModel();
  if (!model) return null;
  const result = await model.generateContent(
    CLINICAL_SCRIBE_SYSTEM +
      "\n\nThis is a FINAL generation — be thorough and complete." +
      `\n\nFull session transcript:\n${fullTranscript}`
  );
  return parseDraft(result.response.text(), emptyDraft());
}

function parseDraft(raw: string, fallback: LiveNoteDraft): LiveNoteDraft {
  const jsonStart = raw.indexOf("{");
  const jsonEnd = raw.lastIndexOf("}");
  if (jsonStart < 0 || jsonEnd < jsonStart) return { ...emptyDraft(), ...fallback };
  try {
    const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1)) as Record<string, unknown>;
    return {
      chiefComplaints: String(parsed.chiefComplaints ?? fallback.chiefComplaints ?? ""),
      emotionalState: String(parsed.emotionalState ?? fallback.emotionalState ?? ""),
      physicalSymptoms: String(parsed.physicalSymptoms ?? fallback.physicalSymptoms ?? ""),
      modalities: String(parsed.modalities ?? fallback.modalities ?? ""),
      timeline: String(parsed.timeline ?? fallback.timeline ?? ""),
      needsReview: Boolean(parsed.needsReview ?? true)
    };
  } catch {
    return { ...emptyDraft(), ...fallback };
  }
}

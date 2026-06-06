import type { ScribeAnalysisOutput } from "./scribeTypes";

// ---------------------------------------------------------------------------
// Prompt builder for homeopathic clinical analysis
// ---------------------------------------------------------------------------

export type ScribePromptInput = {
  /** Patient demographics. */
  patientAge: number | null;
  patientGender: string | null;
  chiefComplaint: string | null;

  /** Doctor's existing free-text notes (note_draft fields). */
  noteDraft: {
    chiefComplaints: string;
    emotionalState: string;
    physicalSymptoms: string;
    modalities: string;
    timeline: string;
  };

  /** Clinical record observations + thinking. */
  clinicalNotes: {
    observations: string;
    diagnosisThinking: string;
  };

  /** Patient history from clinical_record.history. */
  history: {
    pastDiseases: string;
    medications: string;
    familyHistory: string;
    drugAllergies: string;
  };

  /** Vitals snapshot. */
  vitals: {
    bp: string;
    pulse: string;
    temperature: string;
    spO2: string;
  };

  /** Phase 4: Summary of previous finalized consultation. */
  previousConsultationSummary: string | null;

  /** Phase 7: Doctor's custom AI personalization rules. */
  aiScribeInstructions?: string | null;
};

/** Fields in the expected JSON output — used in the prompt to describe the schema. */
const OUTPUT_FIELDS: Array<{ key: keyof ScribeAnalysisOutput; description: string }> = [
  { key: "chiefComplaints", description: "Structured summary of presenting complaints in clinical language. Organize by location, sensation, and severity." },
  { key: "emotionalState", description: "Mental and emotional symptoms. Include mood, anxieties, fears, dreams, sleep quality, and stress patterns." },
  { key: "physicalSymptoms", description: "Physical generals — appetite, thirst, thermal preference, perspiration, cravings/aversions, excretions, and energy patterns." },
  { key: "modalities", description: "Aggravation and amelioration factors. Use < for aggravation and > for amelioration. Include time, temperature, position, weather, food, and motion modifiers." },
  { key: "timeline", description: "Chronological summary of onset, triggers, and progression. Note any periodicity or seasonal patterns." },
  { key: "observations", description: "Clinical observations — behavioral signs, posture, speech patterns, affect, and physical appearance noted by the doctor." },
  { key: "diagnosisThinking", description: "Differential diagnostic reasoning. Organize constitutional picture, miasmatic tendencies, and key distinguishing symptoms." },
  { key: "remedySuggestions", description: "Provide up to 5 top homeopathic remedy candidates based on the clinical record. For each, include the 'name', a brief 'rationale' highlighting why it matches, and 'confidence' (high/medium/low)." },
  { key: "keySymptoms", description: "Array of up to 20 short keyword phrases representing the most clinically significant symptoms (e.g. 'thirstless', 'chilly patient', 'worse 2-4 AM')." },
  { key: "miasmaticHints", description: "Brief miasmatic assessment if patterns are visible (Psoric, Sycotic, Syphilitic, Tubercular). State 'Insufficient data' if unclear." },
  { key: "followUpAssessment", description: "Assessment of improvement, status quo, or aggravation based on comparing the current consultation against the previous consultation baseline." },
  { key: "rubricSuggestions", description: "Array of up to 10 suggested homeopathic rubrics based on the clinical record. For each, include 'chapter' (e.g. MIND, GENERALS), 'rubric' (e.g. ANXIETY - health, about), and 'intensity' (1 to 4)." }
];

function section(label: string, text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  return `### ${label}\n${trimmed}\n`;
}

/**
 * Builds the full prompt sent to Gemini for clinical note analysis.
 *
 * The prompt is designed to:
 * 1. NEVER prescribe or recommend specific remedies
 * 2. Organize and enrich the doctor's existing text
 * 3. Return strict JSON matching ScribeAnalysisOutputSchema
 */
export function buildScribePrompt(input: ScribePromptInput): string {
  const demographics: string[] = [];
  if (input.patientAge != null) demographics.push(`Age: ${input.patientAge}`);
  if (input.patientGender) demographics.push(`Gender: ${input.patientGender}`);

  const caseContent = [
    input.previousConsultationSummary ? section("Previous Consultation Baseline", input.previousConsultationSummary) : "",
    section("Chief Complaint (Registration)", input.chiefComplaint ?? ""),
    section("Doctor's Chief Complaints Notes", input.noteDraft.chiefComplaints),
    section("Timeline & Progression Notes", input.noteDraft.timeline),
    section("Mental / Emotional State Notes", input.noteDraft.emotionalState),
    section("Physical Symptoms Notes", input.noteDraft.physicalSymptoms),
    section("Modalities Notes", input.noteDraft.modalities),
    section("Doctor's Clinical Observations", input.clinicalNotes.observations),
    section("Doctor's Differential Thinking", input.clinicalNotes.diagnosisThinking),
    section("Past Medical History", input.history.pastDiseases),
    section("Current Medications", input.history.medications),
    section("Family History", input.history.familyHistory),
    section("Drug Allergies", input.history.drugAllergies),
    input.vitals.bp || input.vitals.pulse || input.vitals.temperature || input.vitals.spO2
      ? section(
          "Vitals",
          [
            input.vitals.bp ? `BP: ${input.vitals.bp}` : "",
            input.vitals.pulse ? `Pulse: ${input.vitals.pulse}` : "",
            input.vitals.temperature ? `Temp: ${input.vitals.temperature}` : "",
            input.vitals.spO2 ? `SpO₂: ${input.vitals.spO2}` : ""
          ]
            .filter(Boolean)
            .join(", ")
        )
      : ""
  ]
    .filter(Boolean)
    .join("\n");

  const jsonFieldSpec = OUTPUT_FIELDS.map(
    (f) => `  "${f.key}": "${f.description}"`
  ).join(",\n");

  return `You are a clinical documentation assistant specializing in homeopathic medicine.
${
  input.aiScribeInstructions
    ? `\n## DOCTOR'S CUSTOM INSTRUCTIONS\nThe doctor has provided the following personal guidelines for how you should analyze this case:\n"""\n${input.aiScribeInstructions}\n"""\nYou MUST strictly follow these guidelines when structuring the record and suggesting remedies/rubrics.\n`
    : ""
}
## YOUR ROLE
- Organize and structure the doctor's free-text clinical notes into clearly categorized sections.
- Enrich the documentation by identifying patterns, grouping related symptoms, and highlighting modalities.
- Preserve the doctor's original clinical observations — do NOT invent symptoms or findings that are not in the source text.
- Analyze the totality of symptoms and suggest 3 to 5 highly relevant homeopathic remedy candidates with brief rationales.

## PATIENT CONTEXT
${demographics.length > 0 ? demographics.join(" | ") : "Demographics not provided."}

## SOURCE CLINICAL NOTES
${caseContent || "No clinical notes provided yet."}

## OUTPUT FORMAT
Respond with valid JSON only. No markdown, no explanation, no preamble.

The JSON object must have these fields:
{
${jsonFieldSpec}
}

## CRITICAL RULES
1. When suggesting remedies, only output the remedy suggestions in the "remedySuggestions" array. Do NOT name remedies inside the "diagnosisThinking" or other clinical notes fields.
2. If a section has no relevant data in the source notes, return an empty string "" for that field.
3. "keySymptoms" must be an array of short phrases, not full sentences.
4. Preserve the patient's own words when describing symptoms — use quotes where appropriate.
5. Use standard homeopathic notation: < for aggravation, > for amelioration.
6. Keep each field under 3000 characters.
7. If "Previous Consultation Baseline" is present, explicitly compare current symptoms against it to populate "followUpAssessment".
8. When suggesting rubrics in "rubricSuggestions", map symptoms to standard homeopathic repertory chapters and phrases.
`;
}

/** Minimum text content (combined) for AI analysis to be meaningful. */
export function hasEnoughContentForAnalysis(input: ScribePromptInput): boolean {
  const combined = [
    input.noteDraft.chiefComplaints,
    input.noteDraft.emotionalState,
    input.noteDraft.physicalSymptoms,
    input.noteDraft.modalities,
    input.noteDraft.timeline,
    input.clinicalNotes.observations,
    input.clinicalNotes.diagnosisThinking,
    input.chiefComplaint ?? ""
  ].join(" ");
  // Require at least 30 characters of meaningful clinical text
  return combined.replace(/\s+/g, " ").trim().length >= 30;
}

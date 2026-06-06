import { apiFetchJson, haProxyPath } from "./doctor-api";

export type ScribeJobStatus = "PENDING" | "STREAMING" | "DRAFTED" | "INSERTED" | "FAILED" | "DISCARDED";

export type ScribeSection =
  | "chiefComplaints"
  | "emotionalState"
  | "physicalSymptoms"
  | "modalities"
  | "timeline"
  | "observations"
  | "diagnosisThinking"
  | "followUpAssessment";

export type ScribeAnalysisOutput = {
  chiefComplaints: string;
  emotionalState: string;
  physicalSymptoms: string;
  modalities: string;
  timeline: string;
  observations: string;
  diagnosisThinking: string;
  keySymptoms?: string[];
  miasmaticHints?: string;
  remedySuggestions?: Array<{
    name: string;
    rationale: string;
    confidence: "high" | "medium" | "low";
  }>;
  followUpAssessment?: string;
  rubricSuggestions?: Array<{
    chapter: string;
    rubric: string;
    intensity: number;
  }>;
};

export type ScribeJobResponse = {
  id: string;
  status: ScribeJobStatus;
  provider: string;
  draftRecord: ScribeAnalysisOutput | null;
  errorMessage: string | null;
  startedAt: string;
  endedAt: string | null;
};

/** Trigger a new AI analysis for the consultation. */
export async function triggerAiAnalyze(consultationId: string): Promise<ScribeJobResponse> {
  return await apiFetchJson<ScribeJobResponse>(
    haProxyPath(`doctor/consultations/${consultationId}/ai-analyze`),
    { method: "POST" }
  );
}

/** Get recent scribe jobs. */
export async function fetchAiJobs(consultationId: string): Promise<{ jobs: ScribeJobResponse[] }> {
  return await apiFetchJson<{ jobs: ScribeJobResponse[] }>(
    haProxyPath(`doctor/consultations/${consultationId}/ai-jobs`),
    { method: "GET" }
  );
}

/** Accept AI suggestions (appends selected sections to the consultation fields). */
export async function acceptAiResult(
  consultationId: string,
  jobId: string,
  sections: ScribeSection[]
): Promise<{ accepted: true }> {
  return await apiFetchJson<{ accepted: true }>(
    haProxyPath(`doctor/consultations/${consultationId}/ai-accept`),
    {
      method: "POST",
      body: JSON.stringify({ jobId, sections })
    }
  );
}

/** Discard AI output. */

export async function discardAiResult(consultationId: string, jobId: string): Promise<void> {
  await apiFetchJson(haProxyPath(`doctor/consultations/${consultationId}/ai-discard`), {
    method: "POST",
    body: JSON.stringify({ jobId })
  });
}

// ---------------------------------------------------------------------------
// Phase 6: Repertorization Engine
// ---------------------------------------------------------------------------

export type RepertorizationOutput = {
  remedies: Array<{
    name: string;
    score: number;
    matchingRubrics: string[];
    rationale: string;
  }>;
};

export async function triggerAiRepertorize(
  consultationId: string,
  rubrics: Array<{ chapter: string; rubric: string; intensity: number }>
): Promise<RepertorizationOutput> {
  const res = await apiFetchJson<RepertorizationOutput>(haProxyPath(`doctor/consultations/${consultationId}/ai-repertorize`), {
    method: "POST",
    body: JSON.stringify({ rubrics })
  });
  return res;
}

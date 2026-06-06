import { z } from "zod";

// ---------------------------------------------------------------------------
// AI Scribe output schema — the validated structure saved to scribe_jobs.draft_record
// ---------------------------------------------------------------------------

/**
 * Structured clinical analysis produced by the AI scribe.
 *
 * Maps 1:1 to existing NoteDraft (5 fields) + ClinicalNotes (2 fields).
 * Includes remedy suggestions for Phase 2 Remedy Intelligence.
 */
export const ScribeAnalysisOutputSchema = z.object({
  /** Structured summary of the patient's presenting complaints. */
  chiefComplaints: z.string().max(4000).default(""),
  /** Emotional / mental symptoms extracted from free-text notes. */
  emotionalState: z.string().max(4000).default(""),
  /** Physical generals — appetite, thirst, thermals, excretions. */
  physicalSymptoms: z.string().max(4000).default(""),
  /** Aggravation / amelioration modifiers from the case. */
  modalities: z.string().max(4000).default(""),
  /** Onset, triggers, and symptom progression timeline. */
  timeline: z.string().max(4000).default(""),
  /** Clinical observations — behavioral signs, affect, posture. */
  observations: z.string().max(4000).default(""),
  /** Differential thinking — diagnostic hypotheses, miasmatic notes. */
  diagnosisThinking: z.string().max(4000).default(""),
  /** Top symptom keywords extracted for quick scanning. */
  keySymptoms: z.array(z.string().max(200)).max(20).default([]),
  /** Optional miasmatic pattern hints. */
  miasmaticHints: z.string().max(2000).default(""),
  /** Suggested homeopathic remedies (Phase 2). */
  remedySuggestions: z.array(z.object({
    name: z.string(),
    rationale: z.string(),
    confidence: z.enum(["high", "medium", "low"])
  })).max(5).optional(),
  /** Phase 4: Follow-up assessment comparing against baseline. */
  followUpAssessment: z.string().max(4000).optional(),
  /** Phase 5: Suggested homeopathic rubrics. */
  rubricSuggestions: z.array(z.object({
    chapter: z.string(),
    rubric: z.string(),
    intensity: z.number().min(1).max(4)
  })).max(10).optional()
});
export type ScribeAnalysisOutput = z.infer<typeof ScribeAnalysisOutputSchema>;

// ---------------------------------------------------------------------------
// Repertorization Output Schema (Phase 6)
// ---------------------------------------------------------------------------

export const RepertorizationOutputSchema = z.object({
  remedies: z.array(z.object({
    name: z.string(),
    score: z.number(),
    matchingRubrics: z.array(z.string()),
    rationale: z.string()
  })).max(10)
});
export type RepertorizationOutput = z.infer<typeof RepertorizationOutputSchema>;

// ---------------------------------------------------------------------------
// Scribe job row shape (matches public.scribe_jobs)
// ---------------------------------------------------------------------------

export const ScribeJobStatusSchema = z.enum([
  "PENDING",
  "STREAMING",
  "DRAFTED",
  "INSERTED",
  "FAILED",
  "DISCARDED"
]);
export type ScribeJobStatus = z.infer<typeof ScribeJobStatusSchema>;

export type ScribeJobRow = {
  id: string;
  clinic_id: string;
  consultation_id: string;
  doctor_id: string;
  status: ScribeJobStatus;
  provider: string;
  prompt_template: string | null;
  draft_record: ScribeAnalysisOutput | null;
  error_code: string | null;
  error_message: string | null;
  started_at: string;
  ended_at: string | null;
};

/** Sections the doctor can accept from AI output. */
export const SCRIBE_SECTIONS = [
  "chiefComplaints",
  "emotionalState",
  "physicalSymptoms",
  "modalities",
  "timeline",
  "observations",
  "diagnosisThinking",
  "followUpAssessment"
] as const;
export type ScribeSection = (typeof SCRIBE_SECTIONS)[number];

/** API response shape for the client. */
export type ScribeJobResponse = {
  id: string;
  status: ScribeJobStatus;
  provider: string;
  draftRecord: ScribeAnalysisOutput | null;
  errorMessage: string | null;
  startedAt: string;
  endedAt: string | null;
};

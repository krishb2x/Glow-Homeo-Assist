// Canonical shape of consultations.clinical_record (JSONB column).
//
// Mirrors the runtime shape used by LiveConsultationClient.tsx so this can
// be adopted incrementally without a data migration. New step keys
// (chiefComplaint, assessment, outcome, audit) are optional in the Zod
// schema so legacy rows continue to validate.
//
// Owner: encounters module (apps/api/src/modules/encounters).
// Used by:
//   - apps/api: validate every PATCH /doctor/consultations/:id/clinical-record
//   - apps/web: type-safe slices for the 9 step components
//   - packages/scribe: produce a `draft_record` of the same shape
import { z } from "zod";

// ---------------------------------------------------------------------------
// Primitive sub-shapes
// ---------------------------------------------------------------------------

export const ConsultationStepIdSchema = z.enum([
  "patient",
  "history",
  "examination",
  "notes",
  "ai",
  "prescription",
  "advice",
  "followup",
  "finalize"
]);
export type ConsultationStepId = z.infer<typeof ConsultationStepIdSchema>;

/** A single lab/observation row recorded in the Examination step. */
export const LabEntrySchema = z.object({
  id: z.string().min(1),
  testName: z.string().max(200).default(""),
  result: z.string().max(2000).default(""),
  notes: z.string().max(2000).default("")
});
export type LabEntry = z.infer<typeof LabEntrySchema>;

/**
 * Free-text history slice (kept lean — heavier breakdown will live in observations).
 *
 * `familyHistory` and `drugAllergies` were added in the v2.1 chart refresh.
 * Both default to `""`, so existing rows from older deployments parse cleanly
 * with `safeParse` — no data migration required.
 */
export const HistorySchema = z.object({
  pastDiseases: z.string().max(4000).default(""),
  medications: z.string().max(4000).default(""),
  familyHistory: z.string().max(4000).default(""),
  drugAllergies: z.string().max(4000).default("")
});
export type History = z.infer<typeof HistorySchema>;

/** Doctor's structured clinical-notes block from the Notes step. */
export const ClinicalNotesSchema = z.object({
  observations: z.string().max(200000).default(""),
  diagnosisThinking: z.string().max(200000).default("")
});
export type ClinicalNotes = z.infer<typeof ClinicalNotesSchema>;

/**
 * Vital signs captured during the Examination step.
 * All values are free-text so the doctor can record units inline
 * (e.g. `120/80`, `98.6 °F`, `99 %`).
 */
export const VitalsSchema = z.object({
  bp: z.string().max(40).default(""),
  pulse: z.string().max(40).default(""),
  temperature: z.string().max(40).default(""),
  spO2: z.string().max(40).default(""),
  weight: z.string().max(40).default(""),
  height: z.string().max(40).default(""),
  respiratoryRate: z.string().max(40).default(""),
  recordedAt: z.string().datetime({ offset: true }).optional()
});
export type Vitals = z.infer<typeof VitalsSchema>;

/** AI / human note draft (matches existing NoteDraft used by AI step). */
export const NoteDraftSchema = z.object({
  chiefComplaints: z.string().max(4000).default(""),
  emotionalState: z.string().max(4000).default(""),
  physicalSymptoms: z.string().max(4000).default(""),
  modalities: z.string().max(4000).default(""),
  timeline: z.string().max(4000).default("")
});
export type NoteDraft = z.infer<typeof NoteDraftSchema>;

/** Timing slot used on prescription items. */
export const TimingSlotSchema = z.enum(["morning", "afternoon", "evening", "night"]);
export type TimingSlot = z.infer<typeof TimingSlotSchema>;

/**
 * A single line of the prescription. Each line is either a homeopathic remedy
 * or a supplement / supportive medicine. Stored under
 * `consultations.note_final.prescription` or `prescriptions.items`.
 */
export const PrescriptionItemSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["remedy", "medicine"]),
  name: z.string().min(1).max(200),
  potency: z.string().max(40).default(""),
  doseCount: z.string().max(60).default(""),
  frequency: z.string().max(40).default("twice"),
  customFrequency: z.string().max(80).default(""),
  timingSlots: z.array(TimingSlotSchema).max(4).default([]),
  duration: z.string().max(80).default(""),
  instructions: z.string().max(2000).default("")
});
export type PrescriptionItem = z.infer<typeof PrescriptionItemSchema>;

/** A single advice card recorded on the Advice step. */
export const AdviceCardSchema = z.object({
  id: z.string().min(1),
  category: z.enum(["diet", "lifestyle", "restriction"]),
  title: z.string().max(200).default(""),
  detail: z.string().max(4000).default("")
});
export type AdviceCard = z.infer<typeof AdviceCardSchema>;

/** Follow-up summary written from the Follow-up step. */
export const FollowUpPlanSchema = z.object({
  enabled: z.boolean().default(false),
  recommendedAt: z.string().datetime({ offset: true }).nullable().optional(),
  reason: z.string().max(2000).default(""),
  symptomsToMonitor: z.array(z.string().max(200)).max(20).default([])
});
export type FollowUpPlan = z.infer<typeof FollowUpPlanSchema>;

/**
 * v2 extensions — optional now, will become required once UI emits them.
 * Keep these tightly scoped to avoid bloating the JSON shape.
 */
export const ChiefComplaintSchema = z.object({
  summary: z.string().max(2000).default(""),
  onset: z.string().max(200).optional(),
  severity: z.number().int().min(0).max(10).optional(),
  location: z.string().max(200).optional()
});
export type ChiefComplaint = z.infer<typeof ChiefComplaintSchema>;

export const AssessmentSchema = z.object({
  mind: z.string().max(4000).default(""),
  sleep: z.string().max(4000).default(""),
  appetite: z.string().max(4000).default(""),
  thermals: z.string().max(4000).default(""),
  differentials: z.array(z.string().max(200)).max(20).default([])
});
export type Assessment = z.infer<typeof AssessmentSchema>;

export const OutcomeNoteSchema = z.object({
  note: z.string().max(4000).default(""),
  expectedOutcome: z.string().max(2000).default(""),
  riskFlags: z.array(z.string().max(200)).max(20).default([])
});
export type OutcomeNote = z.infer<typeof OutcomeNoteSchema>;

// ---------------------------------------------------------------------------
// Canonical clinical_record
// ---------------------------------------------------------------------------

/**
 * Canonical shape stored in `consultations.clinical_record`.
 *
 * v1 keys (labs / clinicalNotes / history) are required for back-compat.
 * v2 keys (chiefComplaint / assessment / outcome / draft / prescription
 * / advice / followUp) are optional — the API tolerates either shape.
 *
 * When writing from the v2 UI, send the full shape; when reading from a v1
 * row, parse with .safeParse and treat missing keys as empty.
 */
export const ClinicalRecordSchema = z.object({
  version: z.number().int().min(0).default(0),

  // v1 fields (kept for back-compat with existing prod rows)
  labs: z.array(LabEntrySchema).default([]),
  clinicalNotes: ClinicalNotesSchema.default(ClinicalNotesSchema.parse({})),
  history: HistorySchema.default(HistorySchema.parse({})),

  // v2 fields (new)
  vitals: VitalsSchema.optional(),
  chiefComplaint: ChiefComplaintSchema.optional(),
  assessment: AssessmentSchema.optional(),
  draft: NoteDraftSchema.optional(),
  prescription: z
    .object({
      items: z.array(PrescriptionItemSchema).default([]),
      durationDays: z.number().int().positive().optional(),
      notes: z.string().max(4000).optional()
    })
    .optional(),
  advice: z.array(AdviceCardSchema).optional(),
  followUp: FollowUpPlanSchema.optional(),
  outcome: OutcomeNoteSchema.optional()
});
export type ClinicalRecord = z.infer<typeof ClinicalRecordSchema>;

/** Empty record. Use in the UI when starting a fresh consult. */
export function emptyClinicalRecord(): ClinicalRecord {
  return ClinicalRecordSchema.parse({});
}

/**
 * Safe parser — never throws. Coerces unknown JSON into a valid record by
 * filling missing keys with defaults. Used on consultation read paths
 * where the row may be a v1 shape.
 */
export function parseClinicalRecord(raw: unknown): ClinicalRecord {
  const result = ClinicalRecordSchema.safeParse(raw);
  if (result.success) return result.data;
  return emptyClinicalRecord();
}

/** PATCH body slice for `consultations.clinical_record` (v1 keys only — incremental adoption). */
export const ClinicalRecordPatchSchema = z
  .object({
    labs: z.array(LabEntrySchema).optional(),
    clinicalNotes: ClinicalNotesSchema.partial().optional(),
    history: HistorySchema.partial().optional(),
    vitals: VitalsSchema.partial().optional(),
    chiefComplaint: ChiefComplaintSchema.partial().optional(),
    assessment: AssessmentSchema.partial().optional(),
    draft: NoteDraftSchema.partial().optional(),
    prescription: z
      .object({
        items: z.array(PrescriptionItemSchema).optional(),
        durationDays: z.number().int().positive().optional(),
        notes: z.string().max(4000).optional()
      })
      .optional(),
    advice: z.array(AdviceCardSchema).optional(),
    followUp: FollowUpPlanSchema.partial().optional(),
    outcome: OutcomeNoteSchema.partial().optional()
  })
  .strict();
export type ClinicalRecordPatch = z.infer<typeof ClinicalRecordPatchSchema>;

/** PATCH body for `consultations.note_draft`. */
export const NoteDraftPatchSchema = z
  .object({
    chiefComplaints: z.string().max(200000).optional(),
    emotionalState: z.string().max(200000).optional(),
    physicalSymptoms: z.string().max(200000).optional(),
    modalities: z.string().max(200000).optional(),
    timeline: z.string().max(200000).optional(),
    needsReview: z.boolean().optional()
  })
  .strict();
export type NoteDraftPatch = z.infer<typeof NoteDraftPatchSchema>;

/** PATCH body for `consultations.advice`. */
export const AdvicePatchSchema = z
  .object({
    diet: z.string().max(20000),
    lifestyle: z.string().max(20000)
  })
  .strict();
export type AdvicePatch = z.infer<typeof AdvicePatchSchema>;

/** Deep-merge a clinical_record patch into the stored JSON (immutable top-level keys). */
export function mergeClinicalRecordPatch(
  prev: unknown,
  patch: ClinicalRecordPatch
): Record<string, unknown> {
  const base =
    typeof prev === "object" && prev !== null && !Array.isArray(prev)
      ? { ...(prev as Record<string, unknown>) }
      : {};

  if (patch.labs !== undefined) base.labs = patch.labs;

  if (patch.clinicalNotes !== undefined) {
    const cn =
      typeof base.clinicalNotes === "object" &&
      base.clinicalNotes !== null &&
      !Array.isArray(base.clinicalNotes)
        ? (base.clinicalNotes as Record<string, unknown>)
        : {};
    base.clinicalNotes = { ...cn, ...patch.clinicalNotes };
  }

  if (patch.history !== undefined) {
    const h =
      typeof base.history === "object" && base.history !== null && !Array.isArray(base.history)
        ? (base.history as Record<string, unknown>)
        : {};
    base.history = { ...h, ...patch.history };
  }

  if (patch.vitals !== undefined) {
    const v =
      typeof base.vitals === "object" && base.vitals !== null && !Array.isArray(base.vitals)
        ? (base.vitals as Record<string, unknown>)
        : {};
    base.vitals = { ...v, ...patch.vitals };
  }

  const shallowKeys = [
    "chiefComplaint",
    "assessment",
    "draft",
    "prescription",
    "advice",
    "followUp",
    "outcome"
  ] as const;
  for (const key of shallowKeys) {
    const inc = patch[key];
    if (inc === undefined) continue;
    const existing = base[key];
    if (
      typeof inc === "object" &&
      inc !== null &&
      !Array.isArray(inc) &&
      typeof existing === "object" &&
      existing !== null &&
      !Array.isArray(existing)
    ) {
      base[key] = { ...(existing as Record<string, unknown>), ...(inc as Record<string, unknown>) };
    } else {
      base[key] = inc;
    }
  }

  return base;
}

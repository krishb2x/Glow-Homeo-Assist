/**
 * Per-step validators for the live consultation.
 *
 * Each validator takes a strongly-typed `ConsultationSnapshot` and returns:
 *   - `done`     — true if the step has the minimum content required to be
 *                  considered completed
 *   - `missing`  — short, human-readable items the doctor would need to
 *                  add for the step to be considered complete
 *   - `warnings` — soft, non-blocking issues worth surfacing (e.g. vitals
 *                  outside expected adult ranges)
 *
 * The shape is intentionally side-effect-free so it can be reused inside the
 * autosave loop, the workflow sidebar, and the finalize confirmation
 * checklist.
 */

import type { ConsultationStep } from "./clinical-workflow-config";

export type AdviceCardLite = {
  category: "diet" | "lifestyle" | "restriction";
  title: string;
  detail: string;
};

export type PrescriptionEntryLite = {
  name: string;
  potency?: string;
  doseCount?: string;
  duration?: string;
};

/** All inputs the validators need. Subset of `LiveConsultationClient` state. */
export type ConsultationSnapshot = {
  patient: {
    initialChiefComplaint: string;
    storedChiefComplaint: string | null;
  };
  history: {
    pastDiseases: string;
    medications: string;
    familyHistory: string;
    drugAllergies: string;
  };
  vitals: {
    bp: string;
    pulse: string;
    temperature: string;
    spO2: string;
  };
  labs: Array<{ testName: string; result: string }>;
  observations: string;
  notes: {
    chiefComplaints: string;
    emotionalState: string;
    physicalSymptoms: string;
    modalities: string;
    timeline: string;
  };
  prescription: PrescriptionEntryLite[];
  advice: {
    diet: string;
    lifestyle: string;
    cards: AdviceCardLite[];
  };
  followUp: {
    enabled: boolean;
    recommendedAt: string | null;
  };
  finalize: {
    sessionEnded: boolean;
    lifecycleStatus: string;
  };
};

export type StepValidation = {
  done: boolean;
  missing: string[];
  warnings: string[];
};

const NUMERIC = /^[0-9]+(?:\.[0-9]+)?$/;

function within(value: string, lo: number, hi: number): boolean {
  if (!NUMERIC.test(value.trim())) return true; // silently ignore non-numeric (e.g. "98.6 F" hand-typed)
  const n = Number(value);
  return n >= lo && n <= hi;
}

function bpParts(bp: string): [number, number] | null {
  const m = /^\s*(\d{2,3})\s*\/\s*(\d{2,3})\s*$/.exec(bp);
  if (!m) return null;
  return [Number(m[1]), Number(m[2])];
}

export function validatePatient(s: ConsultationSnapshot): StepValidation {
  const missing: string[] = [];
  const cc = (s.patient.initialChiefComplaint || s.patient.storedChiefComplaint || "").trim();
  if (!cc) missing.push("Chief complaint");
  return { done: missing.length === 0, missing, warnings: [] };
}

export function validateHistory(s: ConsultationSnapshot): StepValidation {
  const { pastDiseases, medications, familyHistory } = s.history;
  const anyContent = Boolean(pastDiseases.trim() || medications.trim() || familyHistory.trim());
  return {
    done: anyContent,
    missing: anyContent ? [] : ["Past diseases, current medications, or family history"],
    warnings: []
  };
}

export function validateExamination(s: ConsultationSnapshot): StepValidation {
  const missing: string[] = [];
  const warnings: string[] = [];
  const { bp, pulse, temperature, spO2 } = s.vitals;
  const hasVitals = Boolean(bp.trim() || pulse.trim() || temperature.trim() || spO2.trim());
  const hasLabs = s.labs.some((l) => l.testName.trim());
  const hasGeneral = Boolean(s.observations.trim());
  if (!hasVitals && !hasLabs && !hasGeneral) {
    missing.push("Vitals, labs, or general observations");
  }
  // Soft range checks (adult ranges; advisory only)
  if (pulse.trim() && !within(pulse, 40, 180)) warnings.push("Pulse looks unusual");
  if (temperature.trim() && !within(temperature, 90, 108)) warnings.push("Temperature looks unusual");
  if (spO2.trim() && !within(spO2, 70, 100)) warnings.push("SpO₂ looks unusual");
  const bpp = bpParts(bp);
  if (bpp && (bpp[0] > 200 || bpp[0] < 70 || bpp[1] > 130 || bpp[1] < 40)) {
    warnings.push("BP looks unusual");
  }
  return { done: missing.length === 0, missing, warnings };
}

export function validateNotes(s: ConsultationSnapshot): StepValidation {
  const n = s.notes;
  const any = Boolean(
    n.chiefComplaints.trim() ||
      n.emotionalState.trim() ||
      n.physicalSymptoms.trim() ||
      n.modalities.trim() ||
      n.timeline.trim()
  );
  return {
    done: any,
    missing: any ? [] : ["At least one of chief complaints / emotional / physical / modalities / timeline"],
    warnings: []
  };
}

export function validateAi(_s: ConsultationSnapshot): StepValidation {
  return { done: true, missing: [], warnings: [] };
}

export function validatePrescription(s: ConsultationSnapshot): StepValidation {
  const missing: string[] = [];
  const warnings: string[] = [];
  const named = s.prescription.filter((e) => e.name.trim());
  if (named.length === 0) {
    missing.push("At least one remedy or supplement");
  }
  for (const entry of named) {
    if (!entry.potency?.trim() && !entry.doseCount?.trim()) {
      warnings.push(`${entry.name}: missing potency / dose`);
      break;
    }
    if (!entry.duration?.trim()) {
      warnings.push(`${entry.name}: no duration set`);
      break;
    }
  }
  return { done: missing.length === 0, missing, warnings };
}

export function validateAdvice(s: ConsultationSnapshot): StepValidation {
  const cardsHaveText = s.advice.cards.some((c) => c.title.trim() || c.detail.trim());
  const legacyText = Boolean(s.advice.diet.trim() || s.advice.lifestyle.trim());
  const any = cardsHaveText || legacyText;
  return {
    done: any,
    missing: any ? [] : ["Add at least one advice card (diet / lifestyle / restriction)"],
    warnings: []
  };
}

export function validateFollowUp(s: ConsultationSnapshot): StepValidation {
  const missing: string[] = [];
  const { enabled, recommendedAt } = s.followUp;
  if (enabled && !recommendedAt) missing.push("Follow-up date");
  return {
    done: missing.length === 0,
    missing,
    warnings: enabled || !recommendedAt ? [] : []
  };
}

export function validateFinalize(s: ConsultationSnapshot): StepValidation {
  const done = s.finalize.sessionEnded && s.finalize.lifecycleStatus === "FINALIZED";
  return { done, missing: done ? [] : ["Review & finalize the consultation"], warnings: [] };
}

const VALIDATORS: Record<ConsultationStep, (s: ConsultationSnapshot) => StepValidation> = {
  patient: validatePatient,
  history: validateHistory,
  examination: validateExamination,
  notes: validateNotes,
  ai: validateAi,
  prescription: validatePrescription,
  advice: validateAdvice,
  followup: validateFollowUp,
  finalize: validateFinalize
};

export function validateAllSteps(
  s: ConsultationSnapshot
): Record<ConsultationStep, StepValidation> {
  return {
    patient: VALIDATORS.patient(s),
    history: VALIDATORS.history(s),
    examination: VALIDATORS.examination(s),
    notes: VALIDATORS.notes(s),
    ai: VALIDATORS.ai(s),
    prescription: VALIDATORS.prescription(s),
    advice: VALIDATORS.advice(s),
    followup: VALIDATORS.followup(s),
    finalize: VALIDATORS.finalize(s)
  };
}

export function validateStep(step: ConsultationStep, s: ConsultationSnapshot): StepValidation {
  return VALIDATORS[step](s);
}

export type FinalizeReadiness = {
  canFinalize: boolean;
  blockedReason: string | null;
  blockers: string[];
};

/** Hard gates before finalize & send — chief complaint, assessment, Rx or explicit skip. */
export function buildFinalizeReadiness(args: {
  validations: Record<ConsultationStep, StepValidation>;
  skipPrescription: boolean;
  pendingPriorOutcome: boolean;
  priorOutcomeSaved: boolean;
  sendPrescriptionEmail: boolean;
  notifyEmail: string;
}): FinalizeReadiness {
  const blockers: string[] = [];

  if (!args.validations.patient.done) {
    blockers.push(...args.validations.patient.missing);
  }
  if (!args.validations.notes.done) {
    blockers.push(...args.validations.notes.missing);
  }
  if (!args.skipPrescription && !args.validations.prescription.done) {
    blockers.push(...args.validations.prescription.missing);
  }
  if (!args.validations.followup.done) {
    blockers.push(...args.validations.followup.missing);
  }
  if (args.pendingPriorOutcome && !args.priorOutcomeSaved) {
    blockers.push("Document outcome from the previous visit");
  }
  if (args.sendPrescriptionEmail && !args.notifyEmail.trim()) {
    blockers.push("Email address for prescription delivery");
  }

  return {
    canFinalize: blockers.length === 0,
    blockedReason:
      blockers.length > 0
        ? blockers.length === 1
          ? blockers[0]!
          : `Complete ${blockers.length} required items before finalizing`
        : null,
    blockers
  };
}

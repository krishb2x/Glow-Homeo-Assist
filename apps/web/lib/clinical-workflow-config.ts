import type { LucideIcon } from "lucide-react";
import {
  Calendar,
  ClipboardList,
  FileSignature,
  FileText,
  FlaskConical,
  Heart,
  Pill,
  User
} from "lucide-react";

export type ConsultationStep =
  | "patient"
  | "history"
  | "examination"
  | "notes"
  | "ai"
  | "prescription"
  | "advice"
  | "followup"
  | "finalize";

export type ClinicalPhase = "arrival" | "treatment" | "continuity";

export type ClinicalWorkflowStep = {
  id: ConsultationStep;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  phase: ClinicalPhase;
  description: string;
};

export const CLINICAL_PHASES: Record<
  ClinicalPhase,
  { label: string; subtitle: string }
> = {
  arrival: { label: "Subjective", subtitle: "Patient overview, history, and examination" },
  treatment: { label: "Assessment & plan", subtitle: "Clinical assessment, prescription, and advice" },
  continuity: { label: "Continuity of care", subtitle: "Follow-up planning and visit completion" }
};

export const CLINICAL_WORKFLOW_STEPS: ClinicalWorkflowStep[] = [
  {
    id: "patient",
    label: "Patient overview",
    shortLabel: "Patient Overview",
    icon: User,
    phase: "arrival",
    description: "Review patient details and document today's chief complaint"
  },
  {
    id: "history",
    label: "Clinical history",
    shortLabel: "History",
    icon: ClipboardList,
    phase: "arrival",
    description: "Present illness, past history, medications, and allergies"
  },
  {
    id: "examination",
    label: "Examination",
    shortLabel: "Examination",
    icon: FlaskConical,
    phase: "arrival",
    description: "Objective findings, vitals, and clinical observations"
  },
  {
    id: "notes",
    label: "Clinical assessment",
    shortLabel: "Clinical Assessment",
    icon: FileText,
    phase: "treatment",
    description: "Clinical impression and structured case record"
  },
  {
    id: "prescription",
    label: "Prescription",
    shortLabel: "Prescription",
    icon: Pill,
    phase: "treatment",
    description: "Remedies, potency, and dosing instructions"
  },
  {
    id: "advice",
    label: "Patient advice",
    shortLabel: "Advice",
    icon: Heart,
    phase: "treatment",
    description: "Diet, lifestyle, and restrictions for the patient"
  },
  {
    id: "followup",
    label: "Follow-up plan",
    shortLabel: "Follow-up",
    icon: Calendar,
    phase: "continuity",
    description: "When to return and what to monitor"
  },
  {
    id: "finalize",
    label: "Complete visit",
    shortLabel: "Complete Visit",
    icon: FileSignature,
    phase: "continuity",
    description: "Review chart, export records, and complete the visit"
  }
];

/** Linear chart steps — AI is ambient (header/drawer), not a numbered workflow step. */
export const PRIMARY_WORKFLOW_STEPS: ClinicalWorkflowStep[] = CLINICAL_WORKFLOW_STEPS.filter(
  (s) => s.id !== "ai"
);

export function stepIndex(step: ConsultationStep): number {
  return CLINICAL_WORKFLOW_STEPS.findIndex((s) => s.id === step);
}

export function primaryStepIndex(step: ConsultationStep): number {
  const normalized = step === "ai" ? "notes" : step;
  return PRIMARY_WORKFLOW_STEPS.findIndex((s) => s.id === normalized);
}

export function stepMeta(step: ConsultationStep): ClinicalWorkflowStep {
  return CLINICAL_WORKFLOW_STEPS[stepIndex(step)] ?? CLINICAL_WORKFLOW_STEPS[0]!;
}

export function nextStep(step: ConsultationStep): ConsultationStep | null {
  const normalized = step === "ai" ? "notes" : step;
  const i = primaryStepIndex(normalized);
  if (i < 0) return PRIMARY_WORKFLOW_STEPS[0]?.id ?? null;
  return i < PRIMARY_WORKFLOW_STEPS.length - 1 ? PRIMARY_WORKFLOW_STEPS[i + 1]!.id : null;
}

export function prevStep(step: ConsultationStep): ConsultationStep | null {
  const normalized = step === "ai" ? "notes" : step;
  const i = primaryStepIndex(normalized);
  return i > 0 ? PRIMARY_WORKFLOW_STEPS[i - 1]!.id : null;
}

export function workflowProgress(step: ConsultationStep): number {
  const i = primaryStepIndex(step);
  if (i < 0) return 0;
  return Math.round(((i + 1) / PRIMARY_WORKFLOW_STEPS.length) * 100);
}

export function completedStepCount(stepDone: Record<ConsultationStep, boolean>): number {
  return PRIMARY_WORKFLOW_STEPS.filter((s) => stepDone[s.id]).length;
}

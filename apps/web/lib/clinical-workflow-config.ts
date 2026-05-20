import type { LucideIcon } from "lucide-react";
import {
  Calendar,
  ClipboardList,
  FileSignature,
  FileText,
  FlaskConical,
  Heart,
  Pill,
  User,
  Zap
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
  arrival: { label: "Arrival & case-taking", subtitle: "Who is in the room and what is the story?" },
  treatment: { label: "Treatment & record", subtitle: "Notes, prescription, and advice under your signature" },
  continuity: { label: "Continuity", subtitle: "Follow-up rhythm and closing the visit" }
};

export const CLINICAL_WORKFLOW_STEPS: ClinicalWorkflowStep[] = [
  {
    id: "patient",
    label: "Patient overview",
    shortLabel: "Overview",
    icon: User,
    phase: "arrival",
    description: "Verify identity, demographics, and prior visit context"
  },
  {
    id: "history",
    label: "Clinical history",
    shortLabel: "History",
    icon: ClipboardList,
    phase: "arrival",
    description: "Past illness, medications, and background"
  },
  {
    id: "examination",
    label: "Examination",
    shortLabel: "Exam",
    icon: FlaskConical,
    phase: "arrival",
    description: "Observations, labs, and differential thinking"
  },
  {
    id: "notes",
    label: "Case notes",
    shortLabel: "Notes",
    icon: FileText,
    phase: "treatment",
    description: "Structured case record you will finalize"
  },
  {
    id: "ai",
    label: "AI notetaker",
    shortLabel: "AI notes",
    icon: Zap,
    phase: "treatment",
    description: "Optional live transcription — always review before use"
  },
  {
    id: "prescription",
    label: "Prescription",
    shortLabel: "Rx",
    icon: Pill,
    phase: "treatment",
    description: "Remedies, potency, and dosing instructions"
  },
  {
    id: "advice",
    label: "Advice",
    shortLabel: "Advice",
    icon: Heart,
    phase: "treatment",
    description: "Diet, lifestyle, and restrictions for the patient"
  },
  {
    id: "followup",
    label: "Follow-up",
    shortLabel: "Follow-up",
    icon: Calendar,
    phase: "continuity",
    description: "When to return and what to monitor"
  },
  {
    id: "finalize",
    label: "Finalize",
    shortLabel: "Finalize",
    icon: FileSignature,
    phase: "continuity",
    description: "Review, export, and close the consultation"
  }
];

export function stepIndex(step: ConsultationStep): number {
  return CLINICAL_WORKFLOW_STEPS.findIndex((s) => s.id === step);
}

export function stepMeta(step: ConsultationStep): ClinicalWorkflowStep {
  return CLINICAL_WORKFLOW_STEPS[stepIndex(step)] ?? CLINICAL_WORKFLOW_STEPS[0]!;
}

export function nextStep(step: ConsultationStep): ConsultationStep | null {
  const i = stepIndex(step);
  return i >= 0 && i < CLINICAL_WORKFLOW_STEPS.length - 1
    ? CLINICAL_WORKFLOW_STEPS[i + 1]!.id
    : null;
}

export function prevStep(step: ConsultationStep): ConsultationStep | null {
  const i = stepIndex(step);
  return i > 0 ? CLINICAL_WORKFLOW_STEPS[i - 1]!.id : null;
}

export function workflowProgress(step: ConsultationStep): number {
  const i = stepIndex(step);
  if (i < 0) return 0;
  return Math.round(((i + 1) / CLINICAL_WORKFLOW_STEPS.length) * 100);
}

export function completedStepCount(stepDone: Record<ConsultationStep, boolean>): number {
  return CLINICAL_WORKFLOW_STEPS.filter((s) => stepDone[s.id]).length;
}

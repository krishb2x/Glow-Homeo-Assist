import type { ConsultationStep } from "./clinical-workflow-config";
import { PRIMARY_WORKFLOW_STEPS } from "./clinical-workflow-config";

const PREFIX = "glowhomeo_consult_step_";
const PRIMARY_IDS = new Set(PRIMARY_WORKFLOW_STEPS.map((s) => s.id));

function key(consultationId: string): string {
  return `${PREFIX}${consultationId}`;
}

/** Last workflow step the doctor viewed for this consultation (per device). */
export function getSavedConsultationStep(consultationId: string): ConsultationStep | null {
  if (typeof window === "undefined" || !consultationId) return null;
  try {
    const raw = localStorage.getItem(key(consultationId));
    if (!raw) return null;
    const step = raw as ConsultationStep;
    if (step === "ai") return "notes";
    return PRIMARY_IDS.has(step) ? step : null;
  } catch {
    return null;
  }
}

export function saveConsultationStep(consultationId: string, step: ConsultationStep): void {
  if (typeof window === "undefined" || !consultationId) return;
  const normalized = step === "ai" ? "notes" : step;
  if (!PRIMARY_IDS.has(normalized)) return;
  try {
    localStorage.setItem(key(consultationId), normalized);
  } catch {
    /* quota */
  }
}

export function clearSavedConsultationStep(consultationId: string): void {
  if (typeof window === "undefined" || !consultationId) return;
  try {
    localStorage.removeItem(key(consultationId));
  } catch {
    /* ignore */
  }
}

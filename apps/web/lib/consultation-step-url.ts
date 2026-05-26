import type { ConsultationStep } from "./clinical-workflow-config";
import { PRIMARY_WORKFLOW_STEPS } from "./clinical-workflow-config";

const PRIMARY_IDS = new Set(PRIMARY_WORKFLOW_STEPS.map((s) => s.id));

/** Parse `?step=` query into a valid primary workflow step. */
export function stepFromQuery(param: string | null | undefined): ConsultationStep {
  if (!param) return "patient";
  if (param === "ai") return "notes";
  if (PRIMARY_IDS.has(param as ConsultationStep)) return param as ConsultationStep;
  return "patient";
}

export function stepToQuery(step: ConsultationStep): string {
  const normalized = step === "ai" ? "notes" : step;
  return PRIMARY_IDS.has(normalized) ? normalized : "patient";
}

export function consultationStepHref(consultationId: string, step: ConsultationStep): string {
  return `/consultation/${encodeURIComponent(consultationId)}?step=${stepToQuery(step)}`;
}

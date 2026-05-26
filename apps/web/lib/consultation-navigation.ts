import type { ConsultationStep } from "./clinical-workflow-config";
import { consultationStepHref } from "./consultation-step-url";
import { getSavedConsultationStep } from "./consultation-step-persistence";

/** Spread on `<Link>` when opening a live visit from the hub (dashboard stays open). */
export const CONSULTATION_TAB_LINK = {
  target: "_blank" as const,
  rel: "noopener noreferrer" as const
};

/** Live visit or auto-start URLs open in a new tab; the patient picker hub stays in-place. */
export function shouldOpenConsultationInNewTab(href: string): boolean {
  if (href === "/consultation") return false;
  return href.startsWith("/consultation/") || href.startsWith("/consultation?");
}

export function consultationLinkProps(href: string): typeof CONSULTATION_TAB_LINK | Record<string, never> {
  return shouldOpenConsultationInNewTab(href) ? CONSULTATION_TAB_LINK : {};
}

/** Opens a consultation workspace in a new browser tab. */
export function openConsultationTab(path: string): void {
  window.open(path, "_blank", "noopener,noreferrer");
}

/** Live consult URL — resumes at last viewed step when available. */
export function liveConsultationHref(consultationId: string, step?: ConsultationStep): string {
  const resolved =
    step ??
    (typeof window !== "undefined" ? getSavedConsultationStep(consultationId) : null) ??
    "patient";
  return consultationStepHref(consultationId, resolved);
}

export type ConsultStartParams = {
  patientId?: string;
  appointmentId?: string;
  consultationMode?: "ONLINE" | "IN_CLINIC";
};

/** Hub URL that auto-starts or resumes a visit (opens in a new tab). */
export function consultationStartHref(params: ConsultStartParams = {}): string {
  const sp = new URLSearchParams();
  if (params.patientId) sp.set("patientId", params.patientId);
  if (params.appointmentId) sp.set("appointmentId", params.appointmentId);
  if (params.consultationMode === "ONLINE") sp.set("consultationMode", "ONLINE");
  const q = sp.toString();
  return q ? `/consultation?${q}` : "/consultation";
}

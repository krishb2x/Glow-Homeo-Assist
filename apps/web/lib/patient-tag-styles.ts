import type { PatientTag } from "./doctor-api";

export type { PatientTag };

const STYLES: Record<PatientTag, string> = {
  chronic: "bg-slate-100/95 text-slate-800 ring-slate-300/60",
  acute: "bg-amber-50 text-amber-900 ring-amber-200/80",
  first_visit: "bg-hs-primary-very-light text-hs-primary ring-hs-primary/25",
  follow_up: "bg-violet-50 text-violet-900 ring-violet-200/70"
};

export function tagClass(t: PatientTag): string {
  return STYLES[t] ?? "bg-hs-cream/80 text-hs-ink ring-hs-border/40";
}

export const PATIENT_TAG_LABEL: Record<PatientTag, string> = {
  chronic: "Chronic",
  acute: "Acute",
  first_visit: "First visit",
  follow_up: "Follow-up"
};

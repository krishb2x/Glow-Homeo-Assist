import { WHATSAPP_VARIABLES, type WhatsAppVariable } from "./types";

export type PersonalizationContext = {
  patientName: string;
  patientAge?: number | null;
  patientPhone?: string | null;
  clinicName: string;
  doctorName: string;
  lastVisitAt?: string | null;
  chiefComplaint?: string | null;
  appointmentDate?: string | null;
  prescriptionLink?: string | null;
  followupDate?: string | null;
};

const VAR_MAP: Record<WhatsAppVariable, (ctx: PersonalizationContext) => string> = {
  patient_name: (c) => c.patientName || "Patient",
  patient_age: (c) => (c.patientAge != null ? String(c.patientAge) : ""),
  patient_phone: (c) => c.patientPhone?.trim() ?? "",
  clinic_name: (c) => c.clinicName || "Clinic",
  doctor_name: (c) => c.doctorName || "Doctor",
  last_visit_date: (c) => {
    if (!c.lastVisitAt) return "";
    try {
      return new Date(c.lastVisitAt).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric"
      });
    } catch {
      return "";
    }
  },
  chief_complaint: (c) => c.chiefComplaint?.trim() ?? "",
  appointment_date: (c) => formatInDate(c.appointmentDate),
  prescription_link: (c) => c.prescriptionLink?.trim() ?? "",
  followup_date: (c) => formatInDate(c.followupDate)
};

function formatInDate(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  } catch {
    return "";
  }
}

/** Extract `{{variable}}` names from a template body. */
export function extractTemplateVariables(body: string): WhatsAppVariable[] {
  const found = new Set<WhatsAppVariable>();
  const re = /\{\{\s*([a-z_]+)\s*\}\}/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    const key = m[1]?.toLowerCase();
    if (key && (WHATSAPP_VARIABLES as readonly string[]).includes(key)) {
      found.add(key as WhatsAppVariable);
    }
  }
  return [...found];
}

/** Replace `{{patient_name}}` style placeholders with context values. */
export function personalizeTemplate(body: string, ctx: PersonalizationContext): string {
  return body.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_, raw: string) => {
    const key = raw.toLowerCase() as WhatsAppVariable;
    const fn = VAR_MAP[key];
    return fn ? fn(ctx) : "";
  });
}

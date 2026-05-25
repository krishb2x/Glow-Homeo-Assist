import type { SupabaseClient } from "@supabase/supabase-js";
import type { NotificationTemplateVars } from "./types";

/** Internal template names synced from Meta (whatsapp_templates.name). */
export const TELEMEDICINE_TEMPLATE_SLUGS: Record<string, string> = {
  appointment_invite_whatsapp: "telemedicine_appointment_invite",
  appointment_reminder_whatsapp: "telemedicine_appointment_reminder",
  consultation_summary_whatsapp: "telemedicine_consultation_summary",
  prescription_delivery_whatsapp: "telemedicine_prescription_ready"
};

const ENV_META_MAP: Record<string, string> = {
  appointment_invite_whatsapp: "META_TEMPLATE_APPOINTMENT_INVITE",
  appointment_reminder_whatsapp: "META_TEMPLATE_APPOINTMENT_REMINDER",
  consultation_summary_whatsapp: "META_TEMPLATE_CONSULTATION_SUMMARY",
  prescription_delivery_whatsapp: "META_TEMPLATE_PRESCRIPTION"
};

/** Maps logical vars → Meta {{1}}…{{n}} order (comma-separated env or DB jsonb). */
const DEFAULT_PARAM_ORDER: Record<string, (keyof NotificationTemplateVars)[]> = {
  appointment_invite_whatsapp: [
    "patientName",
    "doctorName",
    "clinicName",
    "appointmentDate",
    "appointmentTime",
    "meetingLink"
  ],
  appointment_reminder_whatsapp: [
    "patientName",
    "doctorName",
    "clinicName",
    "appointmentDate",
    "appointmentTime",
    "meetingLink"
  ],
  consultation_summary_whatsapp: [
    "patientName",
    "doctorName",
    "clinicName",
    "consultationSummary",
    "prescriptionLink"
  ],
  prescription_delivery_whatsapp: ["patientName", "doctorName", "clinicName", "prescriptionLink"]
};

function varValue(v: NotificationTemplateVars, key: keyof NotificationTemplateVars): string {
  const val = v[key];
  return val != null ? String(val).trim() : "";
}

function parseParamOrder(topic: string, fromDb: unknown): (keyof NotificationTemplateVars)[] {
  if (Array.isArray(fromDb) && fromDb.every((x) => typeof x === "string")) {
    return fromDb as (keyof NotificationTemplateVars)[];
  }
  const envKey = `META_TEMPLATE_PARAMS_${topic.toUpperCase().replace(/_WHATSAPP$/, "")}`;
  const raw = process.env[envKey]?.trim();
  if (raw) {
    return raw.split(",").map((s) => s.trim()) as (keyof NotificationTemplateVars)[];
  }
  return DEFAULT_PARAM_ORDER[topic] ?? ["patientName", "doctorName", "clinicName"];
}

export type TelemedicineWhatsAppSend = {
  body: string;
  metaTemplateName?: string;
  languageCode?: string;
  templateParameters?: string[];
};

export async function resolveTelemedicineWhatsAppSend(
  client: SupabaseClient,
  args: {
    clinicId: string;
    doctorId: string | null;
    topic: string;
    vars: NotificationTemplateVars;
    fallbackBody: string;
  }
): Promise<TelemedicineWhatsAppSend> {
  const slug = TELEMEDICINE_TEMPLATE_SLUGS[args.topic];
  const envName = ENV_META_MAP[args.topic] ? process.env[ENV_META_MAP[args.topic]]?.trim() : undefined;

  let metaTemplateName: string | null = envName || null;
  let languageCode = "en";
  let paramOrder: (keyof NotificationTemplateVars)[] = DEFAULT_PARAM_ORDER[args.topic] ?? [];

  if (slug) {
    const { data: row } = await client
      .from("whatsapp_templates")
      .select("meta_template_name,language_code,variables,status")
      .eq("clinic_id", args.clinicId)
      .eq("name", slug)
      .in("status", ["approved", "pending_approval"])
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (row) {
      const t = row as {
        meta_template_name: string | null;
        language_code: string;
        variables: unknown;
        status: string;
      };
      if (t.status === "approved" && t.meta_template_name?.trim()) {
        metaTemplateName = t.meta_template_name.trim();
        languageCode = t.language_code || "en";
        paramOrder = parseParamOrder(args.topic, t.variables);
      }
    }
  }

  if (!metaTemplateName) {
    return { body: args.fallbackBody };
  }

  const templateParameters = paramOrder.map((k) => varValue(args.vars, k) || "—");

  return {
    body: args.fallbackBody,
    metaTemplateName,
    languageCode,
    templateParameters
  };
}

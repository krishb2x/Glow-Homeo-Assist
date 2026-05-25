import type { SupabaseClient } from "@supabase/supabase-js";
import { v4 as uuid } from "uuid";
import { resolveAudience } from "./audienceResolver";
import { personalizeTemplate, type PersonalizationContext } from "./variableResolver";
import type { AudienceSpec } from "./types";

const RATE_MS = Number(process.env.WHATSAPP_SEND_INTERVAL_MS ?? "1000");

export async function createWhatsAppBroadcast(args: {
  client: SupabaseClient;
  admin: SupabaseClient;
  clinicId: string;
  doctorId: string;
  doctorName: string;
  clinicName: string;
  templateId?: string;
  body: string;
  audience: AudienceSpec;
  scheduledAt?: string;
}): Promise<{ broadcastId: string; total: number; skippedNoPhone: number }> {
  const { patients, skippedNoPhone } = await resolveAudience(args.client, args.clinicId, args.audience);

  let templateBody = args.body;
  let metaTemplateName: string | null = null;
  let languageCode = "en";

  if (args.templateId) {
    const { data: tpl } = await args.client
      .from("whatsapp_templates")
      .select("body,meta_template_name,language_code,status")
      .eq("id", args.templateId)
      .eq("clinic_id", args.clinicId)
      .maybeSingle();
    if (tpl) {
      const t = tpl as { body: string; meta_template_name: string | null; language_code: string };
      templateBody = t.body;
      metaTemplateName = t.meta_template_name;
      languageCode = t.language_code ?? "en";
    }
  }

  const broadcastId = uuid();
  const baseTime = args.scheduledAt ? new Date(args.scheduledAt).getTime() : Date.now();

  await args.client.from("whatsapp_broadcasts").insert({
    id: broadcastId,
    clinic_id: args.clinicId,
    doctor_id: args.doctorId,
    template_id: args.templateId ?? null,
    audience_spec: args.audience,
    body_preview: templateBody.slice(0, 500),
    status: "queued",
    total_recipients: patients.length,
    skipped_count: skippedNoPhone,
    scheduled_at: new Date(baseTime).toISOString()
  });

  let index = 0;
  for (const p of patients) {
    const ctx: PersonalizationContext = {
      patientName: p.name,
      patientAge: p.age,
      patientPhone: p.phone,
      clinicName: args.clinicName,
      doctorName: args.doctorName,
      lastVisitAt: p.last_visit_at,
      chiefComplaint: p.initial_chief_complaint
    };
    const personalized = personalizeTemplate(templateBody, ctx);
    const deliveryId = uuid();
    const jobId = uuid();
    const scheduledFor = new Date(baseTime + index * RATE_MS).toISOString();
    index += 1;

    await args.client.from("whatsapp_broadcast_deliveries").insert({
      id: deliveryId,
      broadcast_id: broadcastId,
      clinic_id: args.clinicId,
      patient_id: p.id,
      notification_job_id: jobId,
      phone: p.phone!,
      personalized_body: personalized,
      status: "queued"
    });

    await args.admin.from("notification_jobs").insert({
      id: jobId,
      clinic_id: args.clinicId,
      patient_id: p.id,
      channel: "whatsapp",
      topic: "whatsapp_broadcast",
      payload: {
        phone: p.phone,
        body: personalized,
        broadcastId,
        deliveryId,
        doctorId: args.doctorId,
        metaTemplateName,
        languageCode
      },
      idempotency_key: `broadcast:${broadcastId}:patient:${p.id}`,
      scheduled_for: scheduledFor,
      status: "QUEUED"
    });
  }

  await args.client
    .from("whatsapp_broadcasts")
    .update({ status: patients.length > 0 ? "sending" : "completed", started_at: new Date().toISOString() })
    .eq("id", broadcastId);

  return { broadcastId, total: patients.length, skippedNoPhone };
}

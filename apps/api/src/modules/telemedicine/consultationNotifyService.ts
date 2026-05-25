import type { SupabaseClient } from "@supabase/supabase-js";
import { v4 as uuid } from "uuid";
import { logger } from "../../lib/logger";
import { loadDoctorWhatsAppConnection } from "../whatsapp/sendMessage";
import { sendWhatsAppMessage } from "../whatsapp/sendMessage";
import { sendPrescriptionEmail } from "../distribution/notificationProviders";
import {
  appointmentInviteEmail,
  appointmentInviteWhatsApp,
  appointmentReminderWhatsApp,
  consultationSummaryWhatsApp,
  formatAppointmentDateTime,
  prescriptionWhatsApp
} from "./messageTemplates";
import { createPatientAccessToken, joinUrl } from "./patientAccess";
import { buildJitsiRoomUrl, roomIdForConsultation } from "./meetingService";
import type { NotificationTemplateVars } from "./types";

async function enqueueJob(
  client: SupabaseClient,
  job: {
    clinicId: string;
    patientId: string;
    channel: "email" | "whatsapp";
    topic: string;
    payload: Record<string, unknown>;
    idempotencyKey: string;
    scheduledFor?: string;
    doctorId?: string;
  }
): Promise<string | null> {
  const id = uuid();
  const { error } = await client.from("notification_jobs").insert({
    id,
    clinic_id: job.clinicId,
    patient_id: job.patientId,
    channel: job.channel,
    topic: job.topic,
    payload: { ...job.payload, doctorId: job.doctorId },
    idempotency_key: job.idempotencyKey,
    scheduled_for: job.scheduledFor ?? new Date().toISOString(),
    status: "QUEUED"
  });
  if (error) {
    if (error.code === "23505") return null;
    logger.warn("telemedicine_enqueue_failed", { topic: job.topic, message: error.message });
    return null;
  }
  return id;
}

async function loadNotifyContext(
  client: SupabaseClient,
  clinicId: string,
  patientId: string,
  doctorId: string
): Promise<{
  patientName: string;
  patientPhone: string | null;
  patientEmail: string | null;
  doctorName: string;
  clinicName: string;
} | null> {
  const { data: patient } = await client
    .from("patients")
    .select("name,phone,email")
    .eq("id", patientId)
    .eq("clinic_id", clinicId)
    .maybeSingle();
  if (!patient) return null;

  const { data: profile } = await client
    .from("profiles")
    .select("full_name")
    .eq("id", doctorId)
    .maybeSingle();

  const { data: clinic } = await client.from("clinics").select("name").eq("id", clinicId).maybeSingle();

  const p = patient as { name: string; phone: string | null; email?: string | null };
  return {
    patientName: p.name,
    patientPhone: p.phone,
    patientEmail: p.email ?? null,
    doctorName: (profile as { full_name?: string } | null)?.full_name ?? "Doctor",
    clinicName: (clinic as { name: string } | null)?.name ?? "Clinic"
  };
}

function varsFrom(
  ctx: Awaited<ReturnType<typeof loadNotifyContext>>,
  extra: Partial<NotificationTemplateVars>
): NotificationTemplateVars {
  return {
    patientName: ctx!.patientName,
    doctorName: ctx!.doctorName,
    clinicName: ctx!.clinicName,
    ...extra
  };
}

/** Send appointment invite (email + WhatsApp) — standard India clinic telehealth flow. */
export async function sendAppointmentInvite(args: {
  client: SupabaseClient;
  admin: SupabaseClient;
  clinicId: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  scheduledFor: string;
  consultationMode: "IN_CLINIC" | "ONLINE";
  meetingLink: string;
}): Promise<{ email: string; whatsapp: string }> {
  const ctx = await loadNotifyContext(args.client, args.clinicId, args.patientId, args.doctorId);
  if (!ctx) return { email: "skipped", whatsapp: "skipped" };

  const { date, time } = formatAppointmentDateTime(args.scheduledFor);
  const v = varsFrom(ctx, {
    appointmentDate: date,
    appointmentTime: time,
    meetingLink: args.meetingLink
  });

  let emailStatus = "skipped";
  let waStatus = "skipped";

  if (ctx.patientEmail) {
    const mail = appointmentInviteEmail(v);
    await enqueueJob(args.client, {
      clinicId: args.clinicId,
      patientId: args.patientId,
      channel: "email",
      topic: "appointment_invite_email",
      idempotencyKey: `appointment:${args.appointmentId}:invite_email`,
      doctorId: args.doctorId,
      payload: {
        to: ctx.patientEmail,
        subject: mail.subject,
        html: mail.html,
        text: mail.text
      }
    });
    emailStatus = "queued";
  }

  if (ctx.patientPhone) {
    const body =
      args.consultationMode === "ONLINE"
        ? appointmentInviteWhatsApp(v)
        : `Hello ${v.patientName}, your visit with ${v.doctorName} at ${v.clinicName} is scheduled for ${date} at ${time}.`;
    await enqueueJob(args.client, {
      clinicId: args.clinicId,
      patientId: args.patientId,
      channel: "whatsapp",
      topic: "appointment_invite_whatsapp",
      idempotencyKey: `appointment:${args.appointmentId}:invite_wa`,
      doctorId: args.doctorId,
      payload: {
        phone: ctx.patientPhone,
        body,
        templateVars: v
      }
    });
    waStatus = "queued";
  }

  await args.client
    .from("appointments")
    .update({ invite_sent_at: new Date().toISOString() })
    .eq("id", args.appointmentId);

  return { email: emailStatus, whatsapp: waStatus };
}

export async function scheduleAppointmentReminders(args: {
  client: SupabaseClient;
  clinicId: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  scheduledFor: string;
  meetingLink: string;
}): Promise<void> {
  const ctx = await loadNotifyContext(args.client, args.clinicId, args.patientId, args.doctorId);
  if (!ctx?.patientPhone) return;

  const scheduled = new Date(args.scheduledFor).getTime();
  const reminder24 = new Date(scheduled - 24 * 3600000).toISOString();
  const reminder1 = new Date(scheduled - 60 * 60 * 1000).toISOString();
  const { date, time } = formatAppointmentDateTime(args.scheduledFor);
  const body = appointmentReminderWhatsApp(
    varsFrom(ctx, { appointmentDate: date, appointmentTime: time, meetingLink: args.meetingLink })
  );

  if (new Date(reminder24).getTime() > Date.now()) {
    await enqueueJob(args.client, {
      clinicId: args.clinicId,
      patientId: args.patientId,
      channel: "whatsapp",
      topic: "appointment_reminder_whatsapp",
      idempotencyKey: `appointment:${args.appointmentId}:reminder_24h`,
      scheduledFor: reminder24,
      doctorId: args.doctorId,
      payload: {
        phone: ctx.patientPhone,
        body,
        window: "24h",
        appointmentId: args.appointmentId,
        templateVars: varsFrom(ctx, { appointmentDate: date, appointmentTime: time, meetingLink: args.meetingLink })
      }
    });
  }

  if (new Date(reminder1).getTime() > Date.now()) {
    await enqueueJob(args.client, {
      clinicId: args.clinicId,
      patientId: args.patientId,
      channel: "whatsapp",
      topic: "appointment_reminder_whatsapp",
      idempotencyKey: `appointment:${args.appointmentId}:reminder_1h`,
      scheduledFor: reminder1,
      doctorId: args.doctorId,
      payload: {
        phone: ctx.patientPhone,
        body,
        window: "1h",
        appointmentId: args.appointmentId,
        templateVars: varsFrom(ctx, { appointmentDate: date, appointmentTime: time, meetingLink: args.meetingLink })
      }
    });
  }
}

export async function sendPostConsultationNotifications(args: {
  client: SupabaseClient;
  admin: SupabaseClient;
  clinicId: string;
  consultationId: string;
  patientId: string;
  doctorId: string;
  summaryLine: string;
  prescriptionLink: string;
  sendEmail?: boolean;
  sendWhatsApp?: boolean;
}): Promise<void> {
  const ctx = await loadNotifyContext(args.client, args.clinicId, args.patientId, args.doctorId);
  if (!ctx) return;

  const v = varsFrom(ctx, {
    consultationSummary: args.summaryLine,
    prescriptionLink: args.prescriptionLink
  });

  if (args.sendEmail && ctx.patientEmail) {
    await enqueueJob(args.client, {
      clinicId: args.clinicId,
      patientId: args.patientId,
      channel: "email",
      topic: "consultation_summary_email",
      idempotencyKey: `consultation:${args.consultationId}:summary_email`,
      doctorId: args.doctorId,
      payload: {
        to: ctx.patientEmail,
        subject: `Consultation summary — ${ctx.clinicName}`,
        html: `<p>Dear ${v.patientName},</p><p>${args.summaryLine}</p><p><a href="${args.prescriptionLink}">View prescription</a></p>`,
        text: `${args.summaryLine}\n${args.prescriptionLink}`
      }
    });
  }

  if (args.sendWhatsApp && ctx.patientPhone) {
    await enqueueJob(args.client, {
      clinicId: args.clinicId,
      patientId: args.patientId,
      channel: "whatsapp",
      topic: "consultation_summary_whatsapp",
      idempotencyKey: `consultation:${args.consultationId}:summary_wa`,
      doctorId: args.doctorId,
      payload: {
        phone: ctx.patientPhone,
        body: consultationSummaryWhatsApp(v),
        templateVars: v
      }
    });
  }
}

export async function prepareOnlineAppointment(args: {
  client: SupabaseClient;
  admin: SupabaseClient;
  clinicId: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  scheduledFor: string;
}): Promise<{ meetingUrl: string; joinToken: string }> {
  const join = await createPatientAccessToken({
    admin: args.admin,
    clinicId: args.clinicId,
    patientId: args.patientId,
    appointmentId: args.appointmentId,
    purpose: "join_consultation",
    expiresInHours: 96
  });

  await args.client
    .from("appointments")
    .update({
      consultation_mode: "ONLINE",
      meeting_url: join.url,
      join_token: join.token
    })
    .eq("id", args.appointmentId);

  return { meetingUrl: join.url, joinToken: join.token };
}

export { prescriptionWhatsApp, buildJitsiRoomUrl, roomIdForConsultation, joinUrl };

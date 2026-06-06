import type { SupabaseClient } from "@supabase/supabase-js";
import { v4 as uuid } from "uuid";
import { logger } from "../../lib/logger";
import { loadClinicWhatsAppConnection, sendWhatsAppMessage } from "../whatsapp/sendMessage";
import {
  appointmentInviteEmail,
  appointmentInviteWhatsApp,
  appointmentReminderEmail,
  appointmentReminderWhatsApp,
  consultationSummaryEmail,
  consultationSummaryWhatsApp,
  consultationReadyWhatsApp,
  consultationMissedWhatsApp,
  formatAppointmentDateTime,
  prescriptionWhatsApp
} from "./messageTemplates";
import { createPatientAccessToken, joinUrl } from "./patientAccess";
import { roomIdForConsultation } from "./meetingService";
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
    const mail = appointmentInviteEmail(
      v,
      args.consultationMode === "ONLINE" ? "ONLINE" : "IN_CLINIC"
    );
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
  if (!ctx) return;

  const scheduled = new Date(args.scheduledFor).getTime();
  const reminder24 = new Date(scheduled - 24 * 3600000).toISOString();
  const reminder1 = new Date(scheduled - 60 * 60 * 1000).toISOString();
  const { date, time } = formatAppointmentDateTime(args.scheduledFor);
  const templateVars = varsFrom(ctx, {
    appointmentDate: date,
    appointmentTime: time,
    meetingLink: args.meetingLink
  });
  const waBody = appointmentReminderWhatsApp(templateVars);
  const emailMail = appointmentReminderEmail(templateVars);

  const enqueueReminder = async (
    window: "24h" | "1h",
    scheduledFor: string,
    idempotencySuffix: string
  ): Promise<void> => {
    if (new Date(scheduledFor).getTime() <= Date.now()) return;

    if (ctx.patientPhone) {
      await enqueueJob(args.client, {
        clinicId: args.clinicId,
        patientId: args.patientId,
        channel: "whatsapp",
        topic: "appointment_reminder_whatsapp",
        idempotencyKey: `appointment:${args.appointmentId}:reminder_${idempotencySuffix}_wa`,
        scheduledFor,
        doctorId: args.doctorId,
        payload: {
          phone: ctx.patientPhone,
          body: waBody,
          window,
          appointmentId: args.appointmentId,
          templateVars
        }
      });
    }

    if (ctx.patientEmail) {
      await enqueueJob(args.client, {
        clinicId: args.clinicId,
        patientId: args.patientId,
        channel: "email",
        topic: "appointment_reminder_email",
        idempotencyKey: `appointment:${args.appointmentId}:reminder_${idempotencySuffix}_email`,
        scheduledFor,
        doctorId: args.doctorId,
        payload: {
          to: ctx.patientEmail,
          subject: emailMail.subject,
          html: emailMail.html,
          text: emailMail.text,
          window,
          appointmentId: args.appointmentId,
          templateVars
        }
      });
    }

    try {
      const { supabaseAdmin } = await import("../../supabase");
      const { enqueuePatientPushJob } = await import("../patient/patientNotificationEnqueue");
      const { PATIENT_NOTIFICATION_TOPICS } = await import("../patient/types");
      const pushTopic =
        window === "24h"
          ? PATIENT_NOTIFICATION_TOPICS.appointmentReminder24h
          : PATIENT_NOTIFICATION_TOPICS.appointmentReminder1h;
      await enqueuePatientPushJob(supabaseAdmin, {
        clinicId: args.clinicId,
        patientId: args.patientId,
        topic: pushTopic,
        idempotencyKey: `appointment:${args.appointmentId}:reminder_${idempotencySuffix}_push`,
        scheduledFor,
        payload: { appointmentId: args.appointmentId, window }
      });
    } catch {
      /* push optional */
    }
  };

  await enqueueReminder("24h", reminder24, "24h");
  await enqueueReminder("1h", reminder1, "1h");
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
    const mail = consultationSummaryEmail({
      ...v,
      consultationSummary: args.summaryLine,
      prescriptionLink: args.prescriptionLink
    });
    await enqueueJob(args.client, {
      clinicId: args.clinicId,
      patientId: args.patientId,
      channel: "email",
      topic: "consultation_summary_email",
      idempotencyKey: `consultation:${args.consultationId}:summary_email`,
      doctorId: args.doctorId,
      payload: {
        to: ctx.patientEmail,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        templateVars: { ...v, consultationSummary: args.summaryLine, prescriptionLink: args.prescriptionLink }
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

  const { error: upErr } = await args.client
    .from("appointments")
    .update({
      consultation_mode: "ONLINE",
      meeting_url: join.url,
      join_token: join.token
    })
    .eq("id", args.appointmentId);

  if (upErr) {
    await args.admin.from("patient_access_tokens").delete().eq("token", join.token);
    throw new Error(upErr.message);
  }

  return { meetingUrl: join.url, joinToken: join.token };
}

/** Notify patient that doctor is ready (room live). */
export async function sendConsultationReadyNotification(args: {
  admin: SupabaseClient;
  clinicId: string;
  consultationId: string;
}): Promise<void> {
  const { data: consult } = await args.admin
    .from("consultations")
    .select("patient_id,attending_user_id,appointment_id")
    .eq("id", args.consultationId)
    .eq("clinic_id", args.clinicId)
    .maybeSingle();
  if (!consult) return;
  const c = consult as { patient_id: string; attending_user_id: string | null; appointment_id: string | null };
  const doctorId = c.attending_user_id;
  if (!doctorId) return;

  const ctx = await loadNotifyContext(args.admin, args.clinicId, c.patient_id, doctorId);
  if (!ctx?.patientPhone) return;

  let meetingLink = "";
  const { data: tok } = await args.admin
    .from("patient_access_tokens")
    .select("token")
    .eq("consultation_id", args.consultationId)
    .eq("purpose", "join_consultation")
    .gt("expires_at", new Date().toISOString())
    .limit(1)
    .maybeSingle();
  if (tok) {
    meetingLink = joinUrl((tok as { token: string }).token);
  } else if (c.appointment_id) {
    const { data: apt } = await args.admin
      .from("appointments")
      .select("join_token,meeting_url")
      .eq("id", c.appointment_id)
      .maybeSingle();
    if (apt) {
      const a = apt as { join_token: string | null; meeting_url: string | null };
      meetingLink = a.meeting_url ?? (a.join_token ? joinUrl(a.join_token) : "");
    }
  }
  if (!meetingLink) return;

  const v = varsFrom(ctx, { meetingLink });
  await enqueueJob(args.admin, {
    clinicId: args.clinicId,
    patientId: c.patient_id,
    channel: "whatsapp",
    topic: "consultation_ready_whatsapp",
    idempotencyKey: `consultation:${args.consultationId}:ready_wa`,
    doctorId,
    payload: {
      phone: ctx.patientPhone,
      body: consultationReadyWhatsApp(v),
      templateVars: v
    }
  });
}

export async function cancelAppointmentNotificationJobs(
  client: SupabaseClient,
  appointmentId: string
): Promise<void> {
  const keys = [
    `appointment:${appointmentId}:reminder_24h_wa`,
    `appointment:${appointmentId}:reminder_1h_wa`,
    `appointment:${appointmentId}:reminder_24h_email`,
    `appointment:${appointmentId}:reminder_1h_email`,
    `appointment:${appointmentId}:invite_email`,
    `appointment:${appointmentId}:invite_wa`
  ];
  await client
    .from("notification_jobs")
    .update({ status: "CANCELLED" })
    .in("idempotency_key", keys)
    .eq("status", "QUEUED");
}

export async function rescheduleAppointmentReminders(args: {
  client: SupabaseClient;
  clinicId: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  scheduledFor: string;
  meetingLink: string;
}): Promise<void> {
  await cancelAppointmentNotificationJobs(args.client, args.appointmentId);
  await scheduleAppointmentReminders(args);
}

export { prescriptionWhatsApp, roomIdForConsultation, joinUrl };

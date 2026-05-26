import type { SupabaseClient } from "@supabase/supabase-js";
import { v4 as uuid } from "uuid";
import { logger } from "../../lib/logger";
import { consultationMissedWhatsApp, consultationMissedEmail, formatAppointmentDateTime } from "./messageTemplates";
import { joinUrl } from "./patientAccess";
import { writeConsultationEvent } from "./consultationEventsService";

const GRACE_MINUTES = Number(process.env.MISSED_CONSULTATION_GRACE_MIN ?? "20");

async function enqueueMissedJob(
  admin: SupabaseClient,
  args: {
    clinicId: string;
    patientId: string;
    doctorId: string;
    appointmentId: string;
    channel: "whatsapp" | "email";
    phone?: string;
    email?: string;
    body?: string;
    mail?: { subject: string; html: string; text: string };
    templateVars: Record<string, unknown>;
  }
): Promise<void> {
  const isEmail = args.channel === "email";
  await admin.from("notification_jobs").insert({
    id: uuid(),
    clinic_id: args.clinicId,
    patient_id: args.patientId,
    channel: args.channel,
    topic: isEmail ? "consultation_missed_email" : "consultation_missed_whatsapp",
    payload: isEmail
      ? {
          to: args.email,
          subject: args.mail!.subject,
          html: args.mail!.html,
          text: args.mail!.text,
          doctorId: args.doctorId,
          appointmentId: args.appointmentId,
          templateVars: args.templateVars
        }
      : {
          phone: args.phone,
          body: args.body,
          doctorId: args.doctorId,
          appointmentId: args.appointmentId,
          templateVars: args.templateVars
        },
    idempotency_key: isEmail
      ? `appointment:${args.appointmentId}:missed_email`
      : `appointment:${args.appointmentId}:missed_wa`,
    scheduled_for: new Date().toISOString(),
    status: "QUEUED"
  });
}

/** Mark ONLINE appointments past grace window with no doctor join as missed. */
export async function processMissedConsultationJobs(admin: SupabaseClient, limit = 30): Promise<number> {
  const cutoff = new Date(Date.now() - GRACE_MINUTES * 60 * 1000).toISOString();
  const { data: appointments, error } = await admin
    .from("appointments")
    .select("id,clinic_id,patient_id,doctor_id,scheduled_for,join_token,meeting_url")
    .eq("consultation_mode", "ONLINE")
    .in("status", ["CONFIRMED", "REQUESTED", "IN_PROGRESS"])
    .is("missed_at", null)
    .is("no_show_notified_at", null)
    .lt("scheduled_for", cutoff)
    .limit(limit);

  if (error) {
    logger.warn("missed_consultation_query_failed", { message: error.message });
    return 0;
  }

  let processed = 0;
  for (const apt of appointments ?? []) {
    const a = apt as {
      id: string;
      clinic_id: string;
      patient_id: string;
      doctor_id: string;
      scheduled_for: string;
      join_token: string | null;
      meeting_url: string | null;
    };

    const { data: consult } = await admin
      .from("consultations")
      .select("id")
      .eq("appointment_id", a.id)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let doctorJoined = false;
    if (consult) {
      const { data: vs } = await admin
        .from("video_sessions")
        .select("doctor_joined_at")
        .eq("consultation_id", (consult as { id: string }).id)
        .not("doctor_joined_at", "is", null)
        .limit(1)
        .maybeSingle();
      doctorJoined = Boolean(vs);
    }

    if (doctorJoined) continue;

    const now = new Date().toISOString();

    const { data: patient } = await admin
      .from("patients")
      .select("name,phone,email")
      .eq("id", a.patient_id)
      .maybeSingle();
    const { data: profile } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", a.doctor_id)
      .maybeSingle();
    const { data: clinic } = await admin.from("clinics").select("name").eq("id", a.clinic_id).maybeSingle();

    const p = patient as { name: string; phone: string | null; email?: string | null } | null;
    const { date, time } = formatAppointmentDateTime(a.scheduled_for);
    const templateVars = {
      patientName: p?.name ?? "Patient",
      doctorName: (profile as { full_name?: string } | null)?.full_name ?? "Doctor",
      clinicName: (clinic as { name: string } | null)?.name ?? "Clinic",
      appointmentDate: date,
      appointmentTime: time,
      meetingLink: a.meeting_url ?? (a.join_token ? joinUrl(a.join_token) : "")
    };

    let notifyQueued = false;
    if (p?.phone) {
      try {
        await enqueueMissedJob(admin, {
          clinicId: a.clinic_id,
          patientId: a.patient_id,
          doctorId: a.doctor_id,
          appointmentId: a.id,
          channel: "whatsapp",
          phone: p.phone,
          body: consultationMissedWhatsApp(templateVars),
          templateVars
        });
        notifyQueued = true;
      } catch (e) {
        logger.warn("missed_consultation_notify_failed", {
          appointmentId: a.id,
          channel: "whatsapp",
          message: e instanceof Error ? e.message : String(e)
        });
      }
    }

    if (p?.email) {
      try {
        const mail = consultationMissedEmail(templateVars);
        await enqueueMissedJob(admin, {
          clinicId: a.clinic_id,
          patientId: a.patient_id,
          doctorId: a.doctor_id,
          appointmentId: a.id,
          channel: "email",
          email: p.email,
          mail,
          templateVars
        });
        notifyQueued = true;
      } catch (e) {
        logger.warn("missed_consultation_notify_failed", {
          appointmentId: a.id,
          channel: "email",
          message: e instanceof Error ? e.message : String(e)
        });
      }
    }

    await admin
      .from("appointments")
      .update({
        missed_at: now,
        status: "NO_SHOW",
        ...(notifyQueued ? { no_show_notified_at: now } : {})
      })
      .eq("id", a.id);

    if (consult) {
      void writeConsultationEvent(admin, {
        clinicId: a.clinic_id,
        consultationId: (consult as { id: string }).id,
        eventType: "missed",
        actorRole: "system",
        payload: { appointmentId: a.id }
      });
    }

    processed += 1;
  }

  if (processed > 0) {
    logger.info("missed_consultations_processed", { count: processed });
  }
  return processed;
}

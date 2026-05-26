import type express from "express";
import { z } from "zod";
import type { AuthClaims } from "../../auth";
import { authRequired, requireAppRoles } from "../../auth";
import { getDb } from "../../db";
import { supabaseAdmin } from "../../supabase";
import { resolveClinicScope } from "../../lib/clinicScope";
import { jsonSuccess, jsonError } from "../../lib/apiEnvelope";
import { rateLimitMiddleware } from "../../lib/rateLimit";
import { resolvePatientAccessToken } from "./patientAccess";
import {
  getConsultationMeeting,
  provisionVideoSession,
  buildDailyPatientJoin,
  roomIdForConsultation,
  getVideoSessionState,
  admitPatientToRoom,
  endVideoSession
} from "./meetingService";
import {
  getConsultationRecordingUrl,
  verifyRecordingWebhookSecret
} from "./recordingService";
import { handleDailyWebhook, verifyDailyWebhookSignature } from "./dailyWebhookHandler";
import { prepareOnlineAppointment, sendAppointmentInvite } from "./consultationNotifyService";
import { auditPublicAccess } from "../../lib/publicAccessAudit";

function verifyDailyWebhookRequest(req: express.Request): boolean {
  const secret = process.env.DAILY_WEBHOOK_SECRET?.trim();
  if (!secret) return false;
  const headerSecret =
    (req.headers["x-webhook-secret"] as string) ||
    (req.headers["x-daily-webhook-secret"] as string) ||
    (req.headers.authorization as string)?.replace(/^Bearer\s+/i, "");
  if (headerSecret === secret) return true;
  const sig = req.headers["x-webhook-signature"] as string | undefined;
  const rawBody = (req as express.Request & { rawBody?: string }).rawBody;
  if (sig && rawBody) {
    return verifyDailyWebhookSignature(rawBody, sig);
  }
  return false;
}

const publicJoinLimit = rateLimitMiddleware({
  keyPrefix: "public_join",
  windowMs: 60_000,
  max: Number(process.env.RATE_PUBLIC_JOIN_PER_MIN ?? "30"),
  keyExtra: (req) => String(req.params.token ?? "")
});

const publicPrescriptionLimit = rateLimitMiddleware({
  keyPrefix: "public_rx",
  windowMs: 60_000,
  max: Number(process.env.RATE_PUBLIC_RX_PER_MIN ?? "20"),
  keyExtra: (req) => String(req.params.token ?? "")
});

export function registerTelemedicineRoutes(app: express.Express): void {
  /** Public: patient opens join link (no auth). */
  app.get("/public/join/:token", publicJoinLimit, async (req, res) => {
    const token = z.string().uuid().safeParse(req.params.token);
    if (!token.success) {
      jsonError(res, 400, "Invalid link", { code: "VALIDATION_ERROR" });
      return;
    }

    const resolved = await resolvePatientAccessToken(supabaseAdmin, token.data);
    if (!resolved.valid || resolved.purpose !== "join_consultation") {
      void auditPublicAccess(supabaseAdmin, req, {
        action: "public_join",
        purpose: resolved.purpose,
        token: token.data,
        clinicId: resolved.clinicId,
        consultationId: resolved.consultationId,
        patientId: resolved.patientId,
        outcome: "denied"
      });
      jsonError(res, 404, "This link has expired or is invalid.", { code: "NOT_FOUND" });
      return;
    }

    let consultationId = resolved.consultationId;
    let scheduledFor: string | null = null;
    let doctorName = "Doctor";
    let clinicName = "Clinic";
    let patientName = "Patient";
    let recordingEnabled = false;

    if (!consultationId && resolved.appointmentId) {
      const { data: apt } = await supabaseAdmin
        .from("appointments")
        .select("scheduled_for,patient_id,doctor_id,clinic_id,consultation_mode,status")
        .eq("id", resolved.appointmentId)
        .maybeSingle();
      if (apt) {
        const a = apt as {
          scheduled_for: string;
          patient_id: string;
          doctor_id: string;
          clinic_id: string;
        };
        scheduledFor = a.scheduled_for;
        const { data: p } = await supabaseAdmin.from("patients").select("name").eq("id", a.patient_id).maybeSingle();
        patientName = (p as { name: string } | null)?.name ?? "Patient";
        const { data: pr } = await supabaseAdmin.from("profiles").select("full_name").eq("id", a.doctor_id).maybeSingle();
        doctorName = (pr as { full_name?: string } | null)?.full_name ?? "Doctor";
        const { data: c } = await supabaseAdmin.from("clinics").select("name").eq("id", a.clinic_id).maybeSingle();
        clinicName = (c as { name: string } | null)?.name ?? "Clinic";

        const { data: live } = await supabaseAdmin
          .from("consultations")
          .select("id,recording_enabled")
          .eq("appointment_id", resolved.appointmentId)
          .is("ended_at", null)
          .order("started_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (live) {
          consultationId = (live as { id: string }).id;
          recordingEnabled = Boolean((live as { recording_enabled?: boolean }).recording_enabled);
        }
      }
    }

    if (consultationId) {
      const { data: vs } = await supabaseAdmin
        .from("video_sessions")
        .select("id,room_id,room_url,status,patient_waiting_since")
        .eq("consultation_id", consultationId)
        .not("status", "eq", "ENDED")
        .limit(1)
        .maybeSingle();
      const vsRow = vs as {
        id?: string;
        room_id?: string;
        room_url?: string;
        status?: string;
        patient_waiting_since?: string | null;
      } | null;

      if (!vsRow?.room_id) {
        jsonSuccess(res, 200, {
          mode: "scheduled",
          patientName,
          doctorName,
          clinicName,
          scheduledFor,
          consultationId,
          message:
            "Your doctor is preparing the consultation room. This page will connect you automatically when ready."
        });
        return;
      }

      const roomId = vsRow.room_id;
      const join = await buildDailyPatientJoin({ roomName: roomId, displayName: patientName });
      void auditPublicAccess(supabaseAdmin, req, {
        action: "public_join",
        purpose: "join_consultation",
        token: token.data,
        clinicId: resolved.clinicId,
        consultationId,
        patientId: resolved.patientId,
        outcome: "allowed"
      });
      jsonSuccess(res, 200, {
        mode: "live",
        patientName,
        doctorName,
        clinicName,
        scheduledFor,
        consultationId,
        roomUrl: vsRow?.room_url ?? join.roomUrl,
        meetingToken: join.meetingToken,
        roomName: roomId,
        status: vsRow?.status ?? "PROVISIONED",
        recordingEnabled,
        videoSessionId: vsRow?.id ?? null
      });
      return;
    }

    jsonSuccess(res, 200, {
      mode: "scheduled",
      patientName,
      doctorName,
      clinicName,
      scheduledFor,
      message:
        "Your consultation room opens when the doctor starts the visit. You will receive a reminder on WhatsApp before your slot."
    });
  });

  /** Public: view prescription by token. */
  app.get("/public/prescription/:token", publicPrescriptionLimit, async (req, res) => {
    const token = z.string().uuid().safeParse(req.params.token);
    if (!token.success) {
      jsonError(res, 400, "Invalid link", { code: "VALIDATION_ERROR" });
      return;
    }
    const resolved = await resolvePatientAccessToken(supabaseAdmin, token.data);
    if (
      !resolved.valid ||
      !resolved.consultationId ||
      (resolved.purpose !== "view_prescription" && resolved.purpose !== "view_report")
    ) {
      void auditPublicAccess(supabaseAdmin, req, {
        action: "public_prescription",
        purpose: resolved.purpose,
        token: token.data,
        clinicId: resolved.clinicId,
        consultationId: resolved.consultationId,
        patientId: resolved.patientId,
        outcome: "denied"
      });
      jsonError(res, 404, "Prescription link expired or invalid.", { code: "NOT_FOUND" });
      return;
    }

    const { data: rx } = await supabaseAdmin
      .from("prescriptions")
      .select("items,created_at")
      .eq("consultation_id", resolved.consultationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: patient } = await supabaseAdmin
      .from("patients")
      .select("name")
      .eq("id", resolved.patientId!)
      .maybeSingle();

    void auditPublicAccess(supabaseAdmin, req, {
      action: "public_prescription",
      purpose: resolved.purpose,
      token: token.data,
      clinicId: resolved.clinicId,
      consultationId: resolved.consultationId,
      patientId: resolved.patientId,
      outcome: "allowed"
    });

    jsonSuccess(res, 200, {
      patientName: (patient as { name: string } | null)?.name ?? "Patient",
      consultationId: resolved.consultationId,
      prescription: rx ?? null
    });
  });

  /** Public: persist recording consent when patient enters a recorded consultation. */
  app.post("/public/join/:token/recording-consent", publicJoinLimit, async (req, res) => {
    const token = z.string().uuid().safeParse(req.params.token);
    if (!token.success) {
      jsonError(res, 400, "Invalid link", { code: "VALIDATION_ERROR" });
      return;
    }
    const resolved = await resolvePatientAccessToken(supabaseAdmin, token.data);
    if (!resolved.valid || resolved.purpose !== "join_consultation" || !resolved.consultationId) {
      jsonError(res, 404, "This link has expired or is invalid.", { code: "NOT_FOUND" });
      return;
    }
    const xf = req.headers["x-forwarded-for"];
    const ip =
      typeof xf === "string" && xf.length > 0
        ? xf.split(",")[0]?.trim() ?? null
        : req.socket.remoteAddress ?? null;
    const now = new Date().toISOString();
    await supabaseAdmin
      .from("consultations")
      .update({ recording_consent_at: now, recording_consent_ip: ip })
      .eq("id", resolved.consultationId)
      .is("recording_consent_at", null);
    void auditPublicAccess(supabaseAdmin, req, {
      action: "recording_consent",
      purpose: "join_consultation",
      token: token.data,
      clinicId: resolved.clinicId,
      consultationId: resolved.consultationId,
      patientId: resolved.patientId,
      outcome: "allowed"
    });
    jsonSuccess(res, 200, { ok: true, recordedAt: now });
  });

  app.get(
    "/doctor/consultations/:id/meeting",
    authRequired,
    requireAppRoles(["DOCTOR", "SUPER_ADMIN"]),
    async (req, res) => {
      const claims = (req as express.Request & { user: AuthClaims }).user;
      const clinicId = resolveClinicScope(req, claims, res);
      if (!clinicId) return;
      const id = z.string().uuid().safeParse(req.params.id);
      if (!id.success) {
        jsonError(res, 400, "Invalid id", { code: "VALIDATION_ERROR" });
        return;
      }
      const client = getDb(claims);
      const { data: profile } = await client.from("profiles").select("full_name").eq("id", claims.userId).maybeSingle();
      const meeting = await getConsultationMeeting(
        client,
        id.data,
        clinicId,
        (profile as { full_name?: string } | null)?.full_name ?? undefined
      );
      jsonSuccess(res, 200, meeting);
    }
  );

  app.get(
    "/doctor/consultations/:id/video-session",
    authRequired,
    requireAppRoles(["DOCTOR", "SUPER_ADMIN"]),
    async (req, res) => {
      const claims = (req as express.Request & { user: AuthClaims }).user;
      const clinicId = resolveClinicScope(req, claims, res);
      if (!clinicId) return;
      const id = z.string().uuid().safeParse(req.params.id);
      if (!id.success) {
        jsonError(res, 400, "Invalid id", { code: "VALIDATION_ERROR" });
        return;
      }
      const client = getDb(claims);
      const state = await getVideoSessionState(client, supabaseAdmin, id.data, clinicId);
      jsonSuccess(res, 200, state);
    }
  );

  app.post(
    "/doctor/consultations/:id/end-video",
    authRequired,
    requireAppRoles(["DOCTOR", "SUPER_ADMIN"]),
    async (req, res) => {
      const claims = (req as express.Request & { user: AuthClaims }).user;
      const clinicId = resolveClinicScope(req, claims, res);
      if (!clinicId) return;
      const id = z.string().uuid().safeParse(req.params.id);
      if (!id.success) {
        jsonError(res, 400, "Invalid id", { code: "VALIDATION_ERROR" });
        return;
      }
      const result = await endVideoSession({
        admin: supabaseAdmin,
        consultationId: id.data,
        clinicId,
        reason: typeof req.body?.reason === "string" ? req.body.reason : "doctor_ended"
      });
      jsonSuccess(res, 200, result);
    }
  );

  app.post(
    "/doctor/consultations/:id/admit-patient",
    authRequired,
    requireAppRoles(["DOCTOR", "SUPER_ADMIN"]),
    async (req, res) => {
      const claims = (req as express.Request & { user: AuthClaims }).user;
      const clinicId = resolveClinicScope(req, claims, res);
      if (!clinicId) return;
      const id = z.string().uuid().safeParse(req.params.id);
      if (!id.success) {
        jsonError(res, 400, "Invalid id", { code: "VALIDATION_ERROR" });
        return;
      }
      const result = await admitPatientToRoom({
        admin: supabaseAdmin,
        consultationId: id.data,
        clinicId
      });
      jsonSuccess(res, 200, result);
    }
  );

  app.post(
    "/doctor/consultations/:id/provision-video",
    authRequired,
    requireAppRoles(["DOCTOR", "SUPER_ADMIN"]),
    async (req, res) => {
      const claims = (req as express.Request & { user: AuthClaims }).user;
      const clinicId = resolveClinicScope(req, claims, res);
      if (!clinicId) return;
      const id = z.string().uuid().safeParse(req.params.id);
      if (!id.success) {
        jsonError(res, 400, "Invalid id", { code: "VALIDATION_ERROR" });
        return;
      }
      const client = getDb(claims);
      const { data: row } = await client
        .from("consultations")
        .select("id,patient_id,consultation_mode,appointment_id")
        .eq("id", id.data)
        .eq("clinic_id", clinicId)
        .maybeSingle();
      if (!row) {
        jsonError(res, 404, "Consultation not found", { code: "NOT_FOUND" });
        return;
      }
      const r = row as { patient_id: string; appointment_id: string | null };
      const { data: profile } = await client.from("profiles").select("full_name").eq("id", claims.userId).maybeSingle();
      const recording = Boolean(req.body?.recordingEnabled);
      let scheduledFor: string | null = null;
      if (r.appointment_id) {
        const { data: apt } = await client
          .from("appointments")
          .select("scheduled_for")
          .eq("id", r.appointment_id)
          .maybeSingle();
        scheduledFor = (apt as { scheduled_for?: string } | null)?.scheduled_for ?? null;
      }
      const session = await provisionVideoSession({
        client,
        admin: supabaseAdmin,
        clinicId,
        consultationId: id.data,
        patientId: r.patient_id,
        doctorDisplayName: (profile as { full_name?: string } | null)?.full_name ?? "Doctor",
        recordingEnabled: recording,
        scheduledFor
      });
      jsonSuccess(res, 200, session);
    }
  );

  app.post(
    "/doctor/appointments/:id/resend-invite",
    authRequired,
    requireAppRoles(["DOCTOR", "SUPER_ADMIN"]),
    async (req, res) => {
      const claims = (req as express.Request & { user: AuthClaims }).user;
      const clinicId = resolveClinicScope(req, claims, res);
      if (!clinicId) return;
      const id = z.string().uuid().safeParse(req.params.id);
      if (!id.success) {
        jsonError(res, 400, "Invalid id", { code: "VALIDATION_ERROR" });
        return;
      }
      const client = getDb(claims);
      const { data: apt } = await client
        .from("appointments")
        .select("id,patient_id,doctor_id,scheduled_for,consultation_mode,meeting_url,join_token")
        .eq("id", id.data)
        .eq("clinic_id", clinicId)
        .maybeSingle();
      if (!apt) {
        jsonError(res, 404, "Not found", { code: "NOT_FOUND" });
        return;
      }
      const a = apt as {
        patient_id: string;
        doctor_id: string;
        scheduled_for: string;
        consultation_mode: string;
        meeting_url: string | null;
        join_token: string | null;
      };
      let link = a.meeting_url;
      if (!link && a.join_token) {
        const { joinUrl } = await import("./patientAccess");
        link = joinUrl(a.join_token);
      }
      if (!link) {
        const prep = await prepareOnlineAppointment({
          client,
          admin: supabaseAdmin,
          clinicId,
          appointmentId: id.data,
          patientId: a.patient_id,
          doctorId: a.doctor_id,
          scheduledFor: a.scheduled_for
        });
        link = prep.meetingUrl;
      }
      const sent = await sendAppointmentInvite({
        client,
        admin: supabaseAdmin,
        clinicId,
        appointmentId: id.data,
        patientId: a.patient_id,
        doctorId: a.doctor_id,
        scheduledFor: a.scheduled_for,
        consultationMode: a.consultation_mode as "IN_CLINIC" | "ONLINE",
        meetingLink: link!
      });
      jsonSuccess(res, 200, sent);
    }
  );

  /** Webhook: Daily.co room events (participants, recording). */
  app.post("/webhooks/daily", async (req, res) => {
    if (!verifyDailyWebhookRequest(req)) {
      jsonError(res, 401, "Unauthorized", { code: "UNAUTHORIZED" });
      return;
    }
    try {
      const result = await handleDailyWebhook(supabaseAdmin, req.body ?? {});
      jsonSuccess(res, 200, result);
    } catch (e) {
      jsonError(res, 500, e instanceof Error ? e.message : "Webhook failed", { code: "INTERNAL_ERROR" });
    }
  });

  /** Legacy recording ingest (manual / migration). Prefer Daily webhook. */
  app.post("/webhooks/daily/recording", async (req, res) => {
    const secret =
      (req.headers["x-recording-secret"] as string) ||
      (req.headers.authorization as string)?.replace(/^Bearer\s+/i, "");
    if (!verifyRecordingWebhookSecret(secret)) {
      jsonError(res, 401, "Unauthorized", { code: "UNAUTHORIZED" });
      return;
    }
    const parsed = z
      .object({
        consultationId: z.string().uuid(),
        videoSessionId: z.string().uuid().optional(),
        sourceUrl: z.string().url().optional(),
        sourceObjectKey: z.string().min(1).optional(),
        contentType: z.string().max(120).optional(),
        durationSeconds: z.coerce.number().int().min(0).optional()
      })
      .safeParse(req.body);
    if (!parsed.success) {
      jsonError(res, 400, "Invalid payload", { code: "VALIDATION_ERROR" });
      return;
    }
    if (!parsed.data.sourceUrl && !parsed.data.sourceObjectKey) {
      jsonError(res, 400, "sourceUrl or sourceObjectKey required", { code: "VALIDATION_ERROR" });
      return;
    }
    try {
      const { ingestConsultationRecording } = await import("./recordingService");
      const result = await ingestConsultationRecording({
        admin: supabaseAdmin,
        consultationId: parsed.data.consultationId,
        videoSessionId: parsed.data.videoSessionId,
        sourceUrl: parsed.data.sourceUrl,
        sourceObjectKey: parsed.data.sourceObjectKey,
        contentType: parsed.data.contentType,
        durationSeconds: parsed.data.durationSeconds
      });
      jsonSuccess(res, 200, result);
    } catch (e) {
      jsonError(res, 500, e instanceof Error ? e.message : "Recording ingest failed", {
        code: "INTERNAL_ERROR"
      });
    }
  });

  app.get(
    "/doctor/consultations/:id/recording",
    authRequired,
    requireAppRoles(["DOCTOR", "SUPER_ADMIN"]),
    async (req, res) => {
      const claims = (req as express.Request & { user: AuthClaims }).user;
      const clinicId = resolveClinicScope(req, claims, res);
      if (!clinicId) return;
      const id = z.string().uuid().safeParse(req.params.id);
      if (!id.success) {
        jsonError(res, 400, "Invalid id", { code: "VALIDATION_ERROR" });
        return;
      }
      const client = getDb(claims);
      const rec = await getConsultationRecordingUrl(client, id.data, clinicId);
      if (!rec) {
        jsonError(res, 404, "No recording for this consultation", { code: "NOT_FOUND" });
        return;
      }
      jsonSuccess(res, 200, rec);
    }
  );

  /** Webhook: Resend email delivery events (bounce, complaint, delivered). */
  app.post("/webhooks/resend", async (req, res) => {
    const rawBody = (req as express.Request & { rawBody?: string }).rawBody ?? JSON.stringify(req.body ?? {});
    const { verifyResendWebhookSignature, handleResendWebhook } = await import(
      "../distribution/resendWebhookHandler"
    );
    const ok = verifyResendWebhookSignature(rawBody, {
      id: req.headers["svix-id"] as string | undefined,
      timestamp: req.headers["svix-timestamp"] as string | undefined,
      signature: req.headers["svix-signature"] as string | undefined
    });
    if (!ok) {
      jsonError(res, 401, "Unauthorized", { code: "UNAUTHORIZED" });
      return;
    }
    try {
      await handleResendWebhook(supabaseAdmin, req.body ?? {});
      jsonSuccess(res, 200, { received: true });
    } catch (e) {
      jsonError(res, 500, e instanceof Error ? e.message : "Webhook failed", { code: "INTERNAL_ERROR" });
    }
  });
}

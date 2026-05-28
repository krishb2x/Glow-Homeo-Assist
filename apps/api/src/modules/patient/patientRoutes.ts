import type { Express } from "express";
import { z } from "zod";
import { jsonError, jsonSuccess } from "../../lib/apiEnvelope";
import { logAndSanitizeError } from "../../lib/safeError";
import { checkLoginRateLimit } from "../../lib/loginRateLimit";
import { doctorRateLimit } from "../../lib/rateLimit";
import { supabaseAdmin } from "../../supabase";
import { AppError } from "../../lib/errors";
import { loginPatientWithCode } from "./patientCodeAuth";
import { loginPatientWithAccessToken } from "./patientAuthExchange";
import { fetchPatientProfile } from "./patientProfile";
import { requirePatientAuth } from "./patientAuth";
import { patientHandler } from "./patientRouteHelpers";
import { buildPatientToday } from "./patientTodayService";
import { listPatientVisits, getPatientVisitDetail, getPatientPrescription } from "./patientVisitsService";
import {
  upsertMedicationLog,
  listMedicationLogs,
  upsertDietLog,
  createCheckIn,
  listCheckIns
} from "./patientAdherenceService";
import { listPatientMessages, sendPatientMessage } from "./patientMessagesService";
import {
  listPatientAppointments,
  createPatientAppointmentRequest,
  cancelPatientAppointment,
  getPatientAppointmentMeeting
} from "./patientAppointmentsService";
import {
  listPatientDocuments,
  presignPatientDocumentUpload,
  completePatientDocumentUpload
} from "./patientDocumentsService";
import { getPatientSettings, patchPatientSettings, createFamilyShareToken } from "./patientSettingsService";
import { listPatientFollowUps, completePatientFollowUp } from "./patientFollowUpsService";
import { listPatientContent, markContentViewed, markContentCompleted } from "./patientContentService";
import { upsertPatientPushToken, deletePatientPushTokensForUser } from "./patientPushService";
import { isS3Configured } from "../../s3";

const patientTodayLimit = doctorRateLimit("patient_today", 60);
const patientAdherenceLimit = doctorRateLimit("patient_adherence", 120);
const patientMessagePostLimit = doctorRateLimit("patient_messages_post", 30);
const patientAppointmentPostLimit = doctorRateLimit("patient_appointments_post", 5);
const patientFamilyShareLimit = doctorRateLimit("patient_family_share", 5);

const LoginBodySchema = z
  .object({
    patientCode: z.string().min(4).max(40).optional(),
    patient_code: z.string().min(4).max(40).optional()
  })
  .refine((b) => Boolean(b.patientCode?.trim() || b.patient_code?.trim()), {
    message: "patientCode or patient_code is required",
    path: ["patientCode"]
  });

function resolveLoginCode(body: z.infer<typeof LoginBodySchema>): string {
  return (body.patientCode ?? body.patient_code ?? "").trim();
}

export function registerPatientRoutes(app: Express): void {
  app.post("/patient/auth/login", async (req, res) => {
    const limit = checkLoginRateLimit(req);
    if (!limit.allowed) {
      res.setHeader("Retry-After", String(limit.retryAfterSec));
      jsonError(res, 429, "Too many login attempts. Please wait and try again.", { code: "RATE_LIMITED" });
      return;
    }

    const parsed = LoginBodySchema.safeParse(req.body);
    if (!parsed.success) {
      jsonError(res, 400, "Invalid request body", { code: "VALIDATION_ERROR", details: parsed.error.flatten() });
      return;
    }

    try {
      const result = await loginPatientWithCode(resolveLoginCode(parsed.data));
      const profile = await fetchPatientProfile(supabaseAdmin, result.patient.id, result.patient.clinic_id);
      jsonSuccess(res, 200, {
        session: result.session,
        token: result.session.access_token,
        patient: profile ?? {
          id: result.patient.id,
          name: result.patient.name,
          phone: result.patient.phone ?? undefined,
          patientCode: result.patient.patient_code ?? undefined
        },
        clinic: result.clinic
      });
    } catch (e) {
      if (e instanceof AppError && e.code === "SCHEMA_NOT_READY") {
        jsonError(res, e.statusCode, e.message, { code: e.code });
        return;
      }
      const code = (e as { code?: string }).code;
      if (code === "INVALID_PATIENT_CODE") {
        jsonError(res, 401, "Patient code not found. Check the code on your prescription.", {
          code: "INVALID_PATIENT_CODE"
        });
        return;
      }
      if (code === "PATIENT_CODE_MISSING") {
        jsonError(res, 400, "This patient record has no code yet. Ask your clinic to update your profile.", {
          code: "PATIENT_CODE_MISSING"
        });
        return;
      }
      logAndSanitizeError("patient_auth_login", e);
      jsonError(res, 500, "Unable to sign in. Please try again later.", { code: "AUTH_FAILED" });
    }
  });

  app.post("/patient/auth/exchange-token", async (req, res) => {
    const parsed = z.object({ token: z.string().uuid() }).safeParse(req.body);
    if (!parsed.success) {
      jsonError(res, 400, "Invalid request", { code: "VALIDATION_ERROR" });
      return;
    }
    try {
      const result = await loginPatientWithAccessToken(parsed.data.token);
      const profile = await fetchPatientProfile(supabaseAdmin, result.patient.id, result.patient.clinic_id);
      jsonSuccess(res, 200, {
        session: result.session,
        token: result.session.access_token,
        patient: profile,
        clinic: result.clinic
      });
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === "INVALID_TOKEN") {
        jsonError(res, 401, "Link expired or invalid.", { code: "INVALID_TOKEN" });
        return;
      }
      logAndSanitizeError("patient_auth_exchange", e);
      jsonError(res, 500, "Unable to sign in.", { code: "AUTH_FAILED" });
    }
  });

  app.post(
    "/patient/auth/logout",
    requirePatientAuth,
    patientHandler("patient_auth_logout", async (req, res) => {
      const token =
        typeof req.body?.token === "string" ? req.body.token : undefined;
      await deletePatientPushTokensForUser(supabaseAdmin, req.patient.patientId, token);
      jsonSuccess(res, 200, { ok: true });
    })
  );

  app.get(
    "/patient/me",
    requirePatientAuth,
    patientTodayLimit,
    patientHandler("patient_me", async (req, res) => {
      const profile = await fetchPatientProfile(
        supabaseAdmin,
        req.patient.patientId,
        req.patient.clinicId
      );
      if (!profile) {
        jsonError(res, 404, "Patient not found", { code: "NOT_FOUND" });
        return;
      }
      const { data: clinicRow } = await supabaseAdmin
        .from("clinics")
        .select("id,name,phone,email,location")
        .eq("id", req.patient.clinicId)
        .maybeSingle();
      jsonSuccess(res, 200, {
        patient: profile,
        clinic: clinicRow
          ? {
              id: (clinicRow as { id: string }).id,
              name: (clinicRow as { name: string }).name,
              phone: (clinicRow as { phone?: string | null }).phone ?? undefined,
              email: (clinicRow as { email?: string | null }).email ?? undefined,
              address: (clinicRow as { location?: string | null }).location ?? undefined
            }
          : { id: req.patient.clinicId, name: "Clinic" },
        flags: {
          messagingEnabled: true,
          onlineConsultEnabled: true,
          contentEnabled: true
        }
      });
    })
  );

  app.get(
    "/patient/today",
    requirePatientAuth,
    patientTodayLimit,
    patientHandler("patient_today", async (req, res) => {
      const data = await buildPatientToday(supabaseAdmin, req.patient);
      jsonSuccess(res, 200, data);
    })
  );

  app.post(
    "/patient/push-token",
    requirePatientAuth,
    patientHandler("patient_push_token", async (req, res) => {
      const parsed = z
        .object({
          platform: z.enum(["ios", "android", "web"]),
          token: z.string().min(8),
          appVersion: z.string().optional(),
          locale: z.string().optional()
        })
        .safeParse(req.body);
      if (!parsed.success) {
        jsonError(res, 400, "Invalid request", { code: "VALIDATION_ERROR", details: parsed.error.flatten() });
        return;
      }
      await upsertPatientPushToken(supabaseAdmin, req.patient, parsed.data);
      jsonSuccess(res, 200, { ok: true });
    })
  );

  app.get(
    "/patient/visits",
    requirePatientAuth,
    patientHandler("patient_visits_list", async (req, res) => {
      const limit = parseInt(String(req.query.limit ?? "20"), 10);
      const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;
      const data = await listPatientVisits(supabaseAdmin, req.patient, { limit, cursor });
      jsonSuccess(res, 200, data);
    })
  );

  app.get(
    "/patient/visits/:id",
    requirePatientAuth,
    patientHandler("patient_visit_detail", async (req, res) => {
      const idParse = z.string().uuid().safeParse(req.params.id);
      if (!idParse.success) {
        jsonError(res, 400, "Invalid visit id", { code: "VALIDATION_ERROR" });
        return;
      }
      const data = await getPatientVisitDetail(supabaseAdmin, req.patient, idParse.data);
      if (!data) {
        jsonError(res, 404, "Visit not found", { code: "NOT_FOUND" });
        return;
      }
      jsonSuccess(res, 200, data);
    })
  );

  app.get(
    "/patient/prescriptions/:id",
    requirePatientAuth,
    patientHandler("patient_prescription", async (req, res) => {
      const idParse = z.string().uuid().safeParse(req.params.id);
      if (!idParse.success) {
        jsonError(res, 400, "Invalid prescription id", { code: "VALIDATION_ERROR" });
        return;
      }
      const rx = await getPatientPrescription(supabaseAdmin, req.patient, idParse.data);
      if (!rx) {
        jsonError(res, 404, "Prescription not found", { code: "NOT_FOUND" });
        return;
      }
      jsonSuccess(res, 200, {
        id: rx.id,
        items: rx.items,
        pdfUrl: rx.pdfUrl,
        consultationId: rx.consultationId
      });
    })
  );

  app.post(
    "/patient/medication-logs",
    requirePatientAuth,
    patientAdherenceLimit,
    patientHandler("patient_med_log_post", async (req, res) => {
      const parsed = z
        .object({
          prescriptionId: z.string().uuid(),
          itemId: z.string().min(1),
          slot: z.enum(["morning", "afternoon", "evening", "night"]),
          status: z.enum(["TAKEN", "SKIPPED", "DELAYED"]),
          takenAt: z.string().optional(),
          note: z.string().max(500).optional()
        })
        .safeParse(req.body);
      if (!parsed.success) {
        jsonError(res, 400, "Invalid request", { code: "VALIDATION_ERROR", details: parsed.error.flatten() });
        return;
      }
      const row = await upsertMedicationLog(supabaseAdmin, req.patient, parsed.data);
      jsonSuccess(res, 200, row);
    })
  );

  app.get(
    "/patient/medication-logs",
    requirePatientAuth,
    patientAdherenceLimit,
    patientHandler("patient_med_log_list", async (req, res) => {
      const since = typeof req.query.since === "string" ? req.query.since : undefined;
      const items = await listMedicationLogs(supabaseAdmin, req.patient, since);
      jsonSuccess(res, 200, { items });
    })
  );

  app.post(
    "/patient/diet-logs",
    requirePatientAuth,
    patientAdherenceLimit,
    patientHandler("patient_diet_log", async (req, res) => {
      const parsed = z
        .object({
          date: z.string().optional(),
          onPlan: z.boolean(),
          note: z.string().max(500).optional()
        })
        .safeParse(req.body);
      if (!parsed.success) {
        jsonError(res, 400, "Invalid request", { code: "VALIDATION_ERROR" });
        return;
      }
      const row = await upsertDietLog(supabaseAdmin, req.patient, parsed.data);
      jsonSuccess(res, 200, row);
    })
  );

  app.post(
    "/patient/check-ins",
    requirePatientAuth,
    patientAdherenceLimit,
    patientHandler("patient_check_in_post", async (req, res) => {
      const parsed = z
        .object({
          wellbeingScore: z.number().int().min(0).max(10).optional(),
          symptoms: z.array(z.string()).optional(),
          energy: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
          sleep: z.enum(["POOR", "OK", "GOOD"]).optional(),
          mood: z.enum(["DOWN", "STABLE", "LIFTED"]).optional(),
          freeText: z.string().max(2000).optional()
        })
        .safeParse(req.body);
      if (!parsed.success) {
        jsonError(res, 400, "Invalid request", { code: "VALIDATION_ERROR" });
        return;
      }
      const row = await createCheckIn(supabaseAdmin, req.patient, parsed.data);
      jsonSuccess(res, 201, row);
    })
  );

  app.get(
    "/patient/check-ins",
    requirePatientAuth,
    patientAdherenceLimit,
    patientHandler("patient_check_in_list", async (req, res) => {
      const since = typeof req.query.since === "string" ? req.query.since : undefined;
      const items = await listCheckIns(supabaseAdmin, req.patient, since);
      jsonSuccess(res, 200, { items });
    })
  );

  app.get(
    "/patient/follow-ups",
    requirePatientAuth,
    patientHandler("patient_follow_ups", async (req, res) => {
      const data = await listPatientFollowUps(supabaseAdmin, req.patient);
      jsonSuccess(res, 200, data);
    })
  );

  app.post(
    "/patient/follow-ups/:id/complete",
    requirePatientAuth,
    patientHandler("patient_follow_up_complete", async (req, res) => {
      const idParse = z.string().uuid().safeParse(req.params.id);
      if (!idParse.success) {
        jsonError(res, 400, "Invalid id", { code: "VALIDATION_ERROR" });
        return;
      }
      const parsed = z
        .object({
          wellbeingScore: z.number().int().min(0).max(10).optional(),
          symptoms: z.array(z.string()).optional(),
          energy: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
          sleep: z.enum(["POOR", "OK", "GOOD"]).optional(),
          mood: z.enum(["DOWN", "STABLE", "LIFTED"]).optional(),
          freeText: z.string().max(2000).optional()
        })
        .safeParse(req.body);
      if (!parsed.success) {
        jsonError(res, 400, "Invalid request", { code: "VALIDATION_ERROR" });
        return;
      }
      const result = await completePatientFollowUp(
        supabaseAdmin,
        req.patient,
        idParse.data,
        parsed.data
      );
      jsonSuccess(res, 200, result);
    })
  );

  app.get(
    "/patient/appointments",
    requirePatientAuth,
    patientHandler("patient_appointments_list", async (req, res) => {
      const data = await listPatientAppointments(supabaseAdmin, req.patient);
      jsonSuccess(res, 200, data);
    })
  );

  app.post(
    "/patient/appointments",
    requirePatientAuth,
    patientAppointmentPostLimit,
    patientHandler("patient_appointments_create", async (req, res) => {
      const parsed = z
        .object({
          preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          preferredTimeWindow: z.enum(["MORNING", "AFTERNOON", "EVENING"]),
          mode: z.enum(["ONLINE", "IN_CLINIC"]),
          reason: z.string().min(1).max(500)
        })
        .safeParse(req.body);
      if (!parsed.success) {
        jsonError(res, 400, "Invalid request", { code: "VALIDATION_ERROR", details: parsed.error.flatten() });
        return;
      }
      const row = await createPatientAppointmentRequest(supabaseAdmin, req.patient, parsed.data);
      jsonSuccess(res, 201, row);
    })
  );

  app.post(
    "/patient/appointments/:id/cancel",
    requirePatientAuth,
    patientHandler("patient_appointments_cancel", async (req, res) => {
      const idParse = z.string().uuid().safeParse(req.params.id);
      if (!idParse.success) {
        jsonError(res, 400, "Invalid id", { code: "VALIDATION_ERROR" });
        return;
      }
      const parsed = z
        .object({
          reason: z.enum(["feeling-better", "schedule-conflict", "other"]),
          note: z.string().max(500).optional()
        })
        .safeParse(req.body);
      if (!parsed.success) {
        jsonError(res, 400, "Invalid request", { code: "VALIDATION_ERROR" });
        return;
      }
      await cancelPatientAppointment(supabaseAdmin, req.patient, idParse.data, parsed.data);
      jsonSuccess(res, 200, { ok: true });
    })
  );

  app.get(
    "/patient/appointments/:id/meeting",
    requirePatientAuth,
    patientHandler("patient_appointments_meeting", async (req, res) => {
      const idParse = z.string().uuid().safeParse(req.params.id);
      if (!idParse.success) {
        jsonError(res, 400, "Invalid id", { code: "VALIDATION_ERROR" });
        return;
      }
      const meeting = await getPatientAppointmentMeeting(supabaseAdmin, req.patient, idParse.data);
      if (!meeting) {
        jsonError(res, 404, "Appointment not found", { code: "NOT_FOUND" });
        return;
      }
      jsonSuccess(res, 200, meeting);
    })
  );

  app.get(
    "/patient/messages",
    requirePatientAuth,
    patientHandler("patient_messages_list", async (req, res) => {
      const since = typeof req.query.since === "string" ? req.query.since : undefined;
      const limit = parseInt(String(req.query.limit ?? "50"), 10);
      const items = await listPatientMessages(supabaseAdmin, req.patient, { since, limit });
      jsonSuccess(res, 200, { items });
    })
  );

  app.post(
    "/patient/messages",
    requirePatientAuth,
    patientMessagePostLimit,
    patientHandler("patient_messages_post", async (req, res) => {
      const parsed = z
        .object({
          body: z.string().min(1).max(4000),
          attachmentMediaObjectIds: z.array(z.string().uuid()).optional()
        })
        .safeParse(req.body);
      if (!parsed.success) {
        jsonError(res, 400, "Invalid request", { code: "VALIDATION_ERROR" });
        return;
      }
      const msg = await sendPatientMessage(supabaseAdmin, req.patient, parsed.data);
      jsonSuccess(res, 201, msg);
    })
  );

  app.get(
    "/patient/content",
    requirePatientAuth,
    patientHandler("patient_content_list", async (req, res) => {
      const kind = typeof req.query.kind === "string" ? req.query.kind : undefined;
      const category = typeof req.query.category === "string" ? req.query.category : undefined;
      const limit = parseInt(String(req.query.limit ?? "20"), 10);
      const items = await listPatientContent(supabaseAdmin, req.patient, { kind, category, limit });
      jsonSuccess(res, 200, { items });
    })
  );

  app.post(
    "/patient/content/:id/viewed",
    requirePatientAuth,
    patientHandler("patient_content_viewed", async (req, res) => {
      const idParse = z.string().uuid().safeParse(req.params.id);
      if (!idParse.success) {
        jsonError(res, 400, "Invalid id", { code: "VALIDATION_ERROR" });
        return;
      }
      await markContentViewed(supabaseAdmin, req.patient, idParse.data);
      jsonSuccess(res, 200, { ok: true });
    })
  );

  app.post(
    "/patient/content/:id/completed",
    requirePatientAuth,
    patientHandler("patient_content_completed", async (req, res) => {
      const idParse = z.string().uuid().safeParse(req.params.id);
      if (!idParse.success) {
        jsonError(res, 400, "Invalid id", { code: "VALIDATION_ERROR" });
        return;
      }
      await markContentCompleted(supabaseAdmin, req.patient, idParse.data);
      jsonSuccess(res, 200, { ok: true });
    })
  );

  app.get(
    "/patient/documents",
    requirePatientAuth,
    patientHandler("patient_documents_list", async (req, res) => {
      const items = await listPatientDocuments(supabaseAdmin, req.patient);
      jsonSuccess(res, 200, { items });
    })
  );

  app.post(
    "/patient/documents/presign-upload",
    requirePatientAuth,
    patientHandler("patient_documents_presign", async (req, res) => {
      if (!isS3Configured()) {
        jsonError(res, 503, "Upload is not available.", { code: "STORAGE_UNAVAILABLE" });
        return;
      }
      const parsed = z
        .object({
          filename: z.string().min(1),
          contentType: z.string().min(1),
          kind: z.enum(["patient_photo", "document"]).optional()
        })
        .safeParse(req.body);
      if (!parsed.success) {
        jsonError(res, 400, "Invalid request", { code: "VALIDATION_ERROR" });
        return;
      }
      const data = await presignPatientDocumentUpload(req.patient, {
        filename: parsed.data.filename,
        contentType: parsed.data.contentType,
        kind: parsed.data.kind
      });
      jsonSuccess(res, 200, data);
    })
  );

  app.post(
    "/patient/documents/complete-upload",
    requirePatientAuth,
    patientHandler("patient_documents_complete", async (req, res) => {
      const parsed = z
        .object({
          objectKey: z.string().min(1),
          kind: z.enum(["patient_photo", "document"]),
          mimeType: z.string().min(1),
          sizeBytes: z.number().int().optional(),
          title: z.string().max(200).optional()
        })
        .safeParse(req.body);
      if (!parsed.success) {
        jsonError(res, 400, "Invalid request", { code: "VALIDATION_ERROR" });
        return;
      }
      const data = await completePatientDocumentUpload(supabaseAdmin, req.patient, parsed.data);
      jsonSuccess(res, 201, data);
    })
  );

  app.get(
    "/patient/settings",
    requirePatientAuth,
    patientHandler("patient_settings_get", async (req, res) => {
      const settings = await getPatientSettings(supabaseAdmin, req.patient);
      jsonSuccess(res, 200, settings);
    })
  );

  app.patch(
    "/patient/settings",
    requirePatientAuth,
    patientHandler("patient_settings_patch", async (req, res) => {
      const parsed = z
        .object({
          locale: z.string().optional(),
          channels: z.record(z.boolean()).optional(),
          reminderTimes: z.record(z.string()).optional(),
          quietHours: z.object({ start: z.string(), end: z.string() }).partial().optional()
        })
        .safeParse(req.body);
      if (!parsed.success) {
        jsonError(res, 400, "Invalid request", { code: "VALIDATION_ERROR" });
        return;
      }
      const settings = await patchPatientSettings(supabaseAdmin, req.patient, parsed.data);
      jsonSuccess(res, 200, settings);
    })
  );

  app.post(
    "/patient/family-share",
    requirePatientAuth,
    patientFamilyShareLimit,
    patientHandler("patient_family_share", async (req, res) => {
      const data = await createFamilyShareToken(supabaseAdmin, req.patient);
      jsonSuccess(res, 200, data);
    })
  );
}

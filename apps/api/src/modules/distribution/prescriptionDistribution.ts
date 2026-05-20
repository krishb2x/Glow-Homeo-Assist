import type { SupabaseClient } from "@supabase/supabase-js";
import { v4 as uuid } from "uuid";
import { buildPrescriptionSlipHtml, toRxLines, type RxDocumentMeta } from "@homeoassist/print";
import { createDownloadUrl, buildObjectKey, getPrivateBucketName, isS3Configured, putObjectBuffer } from "../../s3";
import { logger } from "../../lib/logger";
import { writeAuditV2Event } from "../../lib/auditV2";
import { renderHtmlToPdf } from "./pdfRenderer";
import { sendPrescriptionEmail, sendPrescriptionWhatsApp } from "./notificationProviders";
import type {
  NotificationJobRow,
  PrescriptionDistributionOptions,
  PrescriptionDistributionResult
} from "./types";

type PipelineContext = {
  admin: SupabaseClient;
  client: SupabaseClient;
  clinicId: string;
  consultationId: string;
  patientId: string;
  doctorId: string;
  actorRole?: string;
  followUpRecommendedAt?: string | null;
  followUpNote?: string | null;
  distribute?: PrescriptionDistributionOptions;
};

function isMissingTableError(err: { message?: string; code?: string } | null): boolean {
  if (!err) return false;
  const msg = err.message ?? "";
  return err.code === "42P01" || msg.includes("does not exist") || msg.includes("Could not find");
}

function patientPortalUrl(consultationId: string): string {
  const base = process.env.APP_PUBLIC_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/patient/consultations/${consultationId}/prescription`;
}

async function loadSlipContext(ctx: PipelineContext): Promise<{
  html: string;
  meta: RxDocumentMeta;
  patientPhone: string | null;
  patientEmail: string | null;
} | null> {
  const { data: row, error: loadErr } = await ctx.client
    .from("consultations")
    .select("id,patient_id,consultation_mode,started_at,follow_up_recommended_at,advice")
    .eq("id", ctx.consultationId)
    .eq("clinic_id", ctx.clinicId)
    .maybeSingle();

  if (loadErr || !row) return null;

  const [{ data: patient }, { data: clinic }, { data: profile }, { data: rxRows }] = await Promise.all([
    ctx.client.from("patients").select("name,phone,age,gender").eq("id", ctx.patientId).maybeSingle(),
    ctx.client.from("clinics").select("name,location,address,phone,email,registration_number").eq("id", ctx.clinicId).maybeSingle(),
    ctx.client
      .from("profiles")
      .select("full_name,credentials,registration_number,signature_object_key,prescription_document_prefs")
      .eq("id", ctx.doctorId)
      .maybeSingle(),
    ctx.client
      .from("prescriptions")
      .select("items")
      .eq("consultation_id", ctx.consultationId)
      .order("created_at", { ascending: false })
      .limit(1)
  ]);

  const ext = row as {
    started_at: string;
    consultation_mode: string;
    follow_up_recommended_at: string | null;
    advice: { diet?: string; lifestyle?: string } | null;
  };

  const items = (rxRows?.[0] as { items?: unknown[] } | undefined)?.items ?? [];
  const lines = Array.isArray(items)
    ? items.map((it) => {
        const o = it as Record<string, string>;
        return {
          remedyName: String(o.remedyName ?? o.name ?? "—"),
          potency: String(o.potency ?? "—"),
          dosage: String(o.dosage ?? o.doseCount ?? "—"),
          frequency: String(o.frequency ?? "—"),
          duration: String(o.duration ?? "—"),
          instructions: String(o.instructions ?? "")
        };
      })
    : [];

  const pr = profile as {
    full_name?: string | null;
    credentials?: string | null;
    registration_number?: string | null;
    signature_object_key?: string | null;
    prescription_document_prefs?: unknown;
  } | null;

  const rawPrefs =
    pr?.prescription_document_prefs && typeof pr.prescription_document_prefs === "object"
      ? (pr.prescription_document_prefs as Record<string, unknown>)
      : {};

  let signatureUrl: string | null = null;
  const sigKey = pr?.signature_object_key?.trim() ?? "";
  if (sigKey && sigKey.startsWith(`clinics/${ctx.clinicId}/`)) {
    try {
      signatureUrl = await createDownloadUrl(sigKey);
    } catch {
      signatureUrl = null;
    }
  }

  const pat = patient as { name?: string; phone?: string | null; age?: number | null; gender?: string | null } | null;
  const cl = clinic as {
    name?: string;
    location?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    registration_number?: string | null;
  } | null;

  const doctorName = pr?.full_name?.trim() || "Doctor";
  const started = new Date(ext.started_at);

  const meta: RxDocumentMeta = {
    clinicName: cl?.name ?? "Clinic",
    clinicAddressLine: cl?.address?.trim() || cl?.location?.trim() || null,
    clinicPhone: cl?.phone ?? null,
    clinicEmail: cl?.email ?? null,
    doctorName,
    qualification: pr?.credentials ?? null,
    registrationNumber: pr?.registration_number ?? cl?.registration_number ?? null,
    consultationId: ctx.consultationId,
    visitDateLabel: started.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" }),
    consultationModeLabel: ext.consultation_mode === "ONLINE" ? "Online" : "In-Clinic",
    patientName: pat?.name ?? "Patient",
    patientAge: pat?.age ?? null,
    patientGender: pat?.gender ?? null,
    patientCode: ctx.patientId,
    followUpDateLabel: ext.follow_up_recommended_at
      ? new Date(ext.follow_up_recommended_at).toLocaleDateString("en-IN", {
          year: "numeric",
          month: "short",
          day: "numeric"
        })
      : null,
    signatureImageUrl: signatureUrl,
    doctorSignatureLine: doctorName.toLowerCase().startsWith("dr.") ? doctorName : `Dr. ${doctorName}`,
    qrUrl: patientPortalUrl(ctx.consultationId),
    documentPrefs: {
      showClinicDetails: rawPrefs.showClinicDetails !== false,
      showSignature: rawPrefs.showSignature !== false,
      showRegistrationNumber: rawPrefs.showRegistrationNumber !== false
    }
  };

  const html = buildPrescriptionSlipHtml({
    meta,
    lines: toRxLines(lines),
    advice: { diet: ext.advice?.diet ?? "", lifestyle: ext.advice?.lifestyle ?? "" }
  });

  return {
    html,
    meta,
    patientPhone: pat?.phone?.trim() || null,
    patientEmail: ctx.distribute?.notifyEmail?.trim() || null
  };
}

async function storePrescriptionAsset(
  ctx: PipelineContext,
  html: string
): Promise<{ mediaObjectId: string; storageKey: string | null; mimeType: string; downloadUrl: string | null }> {
  const mediaId = uuid();
  const bucket = getPrivateBucketName();
  let objectKey: string | null = null;
  let mimeType = "text/html";
  let body = Buffer.from(html, "utf-8");

  const pdf = await renderHtmlToPdf(html);
  if (pdf) {
    mimeType = pdf.mimeType;
    body = Buffer.from(pdf.buffer);
  }

  if (isS3Configured()) {
    const ext = mimeType === "application/pdf" ? "pdf" : "html";
    objectKey = buildObjectKey(ctx.clinicId, "pdf", `rx-${ctx.consultationId}.${ext}`);
    try {
      await putObjectBuffer(objectKey, body, mimeType);
    } catch (e) {
      logger.warn("prescription_upload_failed", { message: e instanceof Error ? e.message : String(e) });
      objectKey = null;
    }
  }

  const { error: mediaErr } = await ctx.client.from("media_objects").insert({
    id: mediaId,
    clinic_id: ctx.clinicId,
    patient_id: ctx.patientId,
    consultation_id: ctx.consultationId,
    uploaded_by: ctx.doctorId,
    kind: "prescription_pdf",
    storage_bucket: bucket || "local",
    storage_object_key: objectKey ?? `inline:${ctx.consultationId}`,
    mime_type: mimeType,
    size_bytes: body.length,
    metadata: {
      renderEngine: pdf ? "puppeteer_a4" : "html_fallback",
      patientAppPath: `/patient/consultations/${ctx.consultationId}/prescription`
    }
  });

  if (mediaErr && !isMissingTableError(mediaErr)) {
    throw new Error(mediaErr.message);
  }

  await ctx.client
    .from("consultations")
    .update({ pdf_object_id: mediaId, pdf_ready: true })
    .eq("id", ctx.consultationId)
    .eq("clinic_id", ctx.clinicId);

  let downloadUrl: string | null = null;
  if (objectKey && isS3Configured()) {
    try {
      downloadUrl = await createDownloadUrl(objectKey);
    } catch {
      downloadUrl = null;
    }
  }

  return { mediaObjectId: mediaId, storageKey: objectKey, mimeType, downloadUrl };
}

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
  }
): Promise<string | null> {
  const id = uuid();
  const { error } = await client.from("notification_jobs").insert({
    id,
    clinic_id: job.clinicId,
    patient_id: job.patientId,
    channel: job.channel,
    topic: job.topic,
    payload: job.payload,
    idempotency_key: job.idempotencyKey,
    scheduled_for: job.scheduledFor ?? new Date().toISOString(),
    status: "QUEUED"
  });
  if (error) {
    if (error.code === "23505") return null;
    if (isMissingTableError(error)) return null;
    logger.warn("notification_enqueue_failed", { topic: job.topic, message: error.message });
    return null;
  }
  return id;
}

export async function processNotificationJob(admin: SupabaseClient, job: NotificationJobRow): Promise<boolean> {
  const payload = job.payload ?? {};

  if (job.topic === "prescription_delivery_email" && job.channel === "email") {
    const to = String(payload.to ?? "");
    if (!to) return false;
    const result = await sendPrescriptionEmail({
      to,
      subject: String(payload.subject ?? "Your prescription"),
      html: String(payload.html ?? ""),
      text: String(payload.text ?? "")
    });
    await admin
      .from("notification_jobs")
      .update({
        status: result.ok ? "SENT" : "FAILED",
        sent_at: result.ok ? new Date().toISOString() : null,
        last_error: result.ok ? null : result.error,
        attempts: job.attempts + 1
      })
      .eq("id", job.id);
    return result.ok;
  }

  if (
    (job.topic === "prescription_delivery_whatsapp" || job.topic === "follow_up_reminder") &&
    job.channel === "whatsapp"
  ) {
    const phone = String(payload.phone ?? "");
    if (!phone) return false;
    const result = await sendPrescriptionWhatsApp({
      toPhone: phone,
      body: String(payload.body ?? "")
    });
    await admin
      .from("notification_jobs")
      .update({
        status: result.ok ? "SENT" : "FAILED",
        sent_at: result.ok ? new Date().toISOString() : null,
        last_error: result.ok ? null : result.error,
        attempts: job.attempts + 1
      })
      .eq("id", job.id);
    return result.ok;
  }

  return false;
}

export async function processDueNotificationJobs(admin: SupabaseClient, limit = 20): Promise<number> {
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("notification_jobs")
    .select("id,clinic_id,patient_id,channel,topic,payload,idempotency_key,scheduled_for,status,attempts")
    .eq("status", "QUEUED")
    .lte("scheduled_for", now)
    .order("scheduled_for", { ascending: true })
    .limit(limit);

  if (error) {
    if (!isMissingTableError(error)) logger.warn("notification_poll_failed", { message: error.message });
    return 0;
  }

  let processed = 0;
  for (const row of data ?? []) {
    const ok = await processNotificationJob(admin, row as NotificationJobRow);
    if (ok) processed += 1;
  }
  return processed;
}

export async function runPrescriptionDistributionPipeline(
  ctx: PipelineContext
): Promise<PrescriptionDistributionResult> {
  const result: PrescriptionDistributionResult = {
    mediaObjectId: null,
    pdfReady: false,
    mimeType: "text/html",
    storageKey: null,
    downloadUrl: null,
    email: "skipped",
    whatsapp: "skipped"
  };

  const loaded = await loadSlipContext(ctx);
  if (!loaded) {
    logger.warn("distribution_context_missing", { consultationId: ctx.consultationId });
    return result;
  }

  const { html, meta, patientPhone, patientEmail } = loaded;

  try {
    const stored = await storePrescriptionAsset(ctx, html);
    result.mediaObjectId = stored.mediaObjectId;
    result.pdfReady = true;
    result.mimeType = stored.mimeType;
    result.storageKey = stored.storageKey;
    result.downloadUrl = stored.downloadUrl;
  } catch (e) {
    logger.warn("prescription_store_failed", { message: e instanceof Error ? e.message : String(e) });
    return result;
  }

  const portalLink = patientPortalUrl(ctx.consultationId);
  const linkForMessage = result.downloadUrl ?? portalLink;
  const distribute = ctx.distribute ?? {};

  if (distribute.sendEmail && patientEmail) {
    const jobId = await enqueueJob(ctx.client, {
      clinicId: ctx.clinicId,
      patientId: ctx.patientId,
      channel: "email",
      topic: "prescription_delivery_email",
      idempotencyKey: `consultation:${ctx.consultationId}:rx_email`,
      payload: {
        to: patientEmail,
        subject: `Prescription from ${meta.clinicName}`,
        html: `<p>Dear ${meta.patientName},</p>
<p>Your prescription from <strong>${meta.doctorName}</strong> at ${meta.clinicName} is ready.</p>
<p><a href="${linkForMessage}">View your prescription</a></p>`,
        text: `Your prescription from ${meta.doctorName} at ${meta.clinicName}: ${linkForMessage}`
      }
    });
    if (jobId) {
      const { data: jobRow } = await ctx.admin
        .from("notification_jobs")
        .select("id,clinic_id,patient_id,channel,topic,payload,idempotency_key,scheduled_for,status,attempts")
        .eq("id", jobId)
        .maybeSingle();
      if (jobRow) {
        result.email = (await processNotificationJob(ctx.admin, jobRow as NotificationJobRow)) ? "sent" : "failed";
      } else {
        result.email = "queued";
      }
    } else {
      result.email = "failed";
      result.emailDetail = "Could not enqueue email job";
    }
  } else if (distribute.sendEmail) {
    result.email = "skipped";
    result.emailDetail = "No patient email provided";
  }

  if (distribute.sendWhatsApp && patientPhone) {
    const jobId = await enqueueJob(ctx.client, {
      clinicId: ctx.clinicId,
      patientId: ctx.patientId,
      channel: "whatsapp",
      topic: "prescription_delivery_whatsapp",
      idempotencyKey: `consultation:${ctx.consultationId}:rx_whatsapp`,
      payload: {
        phone: patientPhone,
        body: `Hello ${meta.patientName}, your prescription from ${meta.doctorName} (${meta.clinicName}) is ready.\n\nView: ${linkForMessage}\n\n— GlowHomeo Assist`
      }
    });
    if (jobId) {
      const { data: jobRow } = await ctx.admin
        .from("notification_jobs")
        .select("id,clinic_id,patient_id,channel,topic,payload,idempotency_key,scheduled_for,status,attempts")
        .eq("id", jobId)
        .maybeSingle();
      if (jobRow) {
        result.whatsapp = (await processNotificationJob(ctx.admin, jobRow as NotificationJobRow)) ? "sent" : "failed";
      } else {
        result.whatsapp = "queued";
      }
    } else {
      result.whatsapp = "failed";
    }
  } else if (distribute.sendWhatsApp) {
    result.whatsapp = "skipped";
    result.whatsappDetail = "No patient phone on file";
  }

  if (ctx.followUpRecommendedAt && patientPhone) {
    await enqueueJob(ctx.client, {
      clinicId: ctx.clinicId,
      patientId: ctx.patientId,
      channel: "whatsapp",
      topic: "follow_up_reminder",
      idempotencyKey: `consultation:${ctx.consultationId}:follow_up_reminder`,
      scheduledFor: ctx.followUpRecommendedAt,
      payload: {
        phone: patientPhone,
        reason: ctx.followUpNote ?? "Follow-up visit",
        body: `Reminder: follow-up visit scheduled for ${meta.followUpDateLabel ?? "soon"}. — ${meta.clinicName}`
      }
    });
  }

  void writeAuditV2Event(ctx.admin, {
    clinicId: ctx.clinicId,
    actorId: ctx.doctorId,
    actorRole: ctx.actorRole ?? "DOCTOR",
    entityType: "consultation",
    entityId: ctx.consultationId,
    action: "prescription_distributed",
    payload: {
      mediaObjectId: result.mediaObjectId,
      mimeType: result.mimeType,
      email: result.email,
      whatsapp: result.whatsapp
    }
  });

  return result;
}

export async function runConsultationFinalizeSideEffects(
  ctx: PipelineContext
): Promise<PrescriptionDistributionResult> {
  return runPrescriptionDistributionPipeline(ctx);
}

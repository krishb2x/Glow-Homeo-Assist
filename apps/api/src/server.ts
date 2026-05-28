import http from "http";
import "./lib/loadMonorepoEnv";
import express from "express";
import cors from "cors";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { authRequired, requireAppRoles, AuthClaims } from "./auth";
import { mapProfileRoleStringToDomain } from "./profileAuth";
import { createSupabaseUserClient, supabaseAdmin, supabaseAnon } from "./supabase";
import { getDb } from "./db";
import {
  buildObjectKey,
  createDownloadUrl,
  createUploadUrl,
  deleteObjectByKey
} from "./s3";
import { registerHomeoSyncDoctorRoutes } from "./homeosyncDoctorApi";
import { logger } from "./lib/logger";
import { allocatePatientCode, allocateVisitCode, parseSymptomsToMonitor } from "./lib/healthcareIds";
import { jsonSuccess, jsonError } from "./lib/apiEnvelope";
import { jsonErrorDb, logAndSanitizeError, CLIENT_SAFE_MSG } from "./lib/safeError";
import { checkMarketingLeadLimit } from "./lib/marketingLeadRateLimit";
import { resolveFeatures, getClinicFeatures, PLAN_FEATURES } from "./lib/features";
import { assertRequiredTablesExist } from "./lib/dbSchemaCheck";
import { assertProductionEnvironment } from "./lib/productionConfig";
import { requestContextMiddleware } from "./lib/requestContext";
import { checkLoginRateLimit } from "./lib/loginRateLimit";
import { PatientCreateBodySchema, PatientPatchBodySchema, ClinicalRecordPatchSchema, NoteDraftPatchSchema, AdvicePatchSchema, mergeClinicalRecordPatch } from "@homeoassist/domain";
import { runConsultationFinalizeSideEffects } from "./modules/encounters/v2EncountersService";
import { startBackgroundJobs } from "./jobs/backgroundJobs";
import { registerWhatsAppRoutes } from "./modules/whatsapp/whatsappRoutes";
import { registerTelemedicineRoutes } from "./modules/telemedicine/telemedicineRoutes";
import { registerOpsRoutes } from "./modules/ops/opsRoutes";
import { registerMemoRoutes } from "./modules/memos/memoRoutes";
import { registerPatientRoutes } from "./modules/patient/patientRoutes";
import { registerCarePlanRoutes } from "./modules/carePlans/carePlanRoutes";
import { provisionVideoSession } from "./modules/telemedicine/meetingService";
import { listPatients } from "./modules/patients/patientListService";
import { buildPatientTimeline } from "./modules/patients/timelineService";
import { refreshPatientMetrics } from "./lib/patientMetrics";
import { doctorRateLimit } from "./lib/rateLimit";
import { resolveClinicScope } from "./lib/clinicScope";
import crypto from "node:crypto";

const patientSearchLimit = doctorRateLimit(
  "patient_search",
  Number(process.env.RATE_PATIENT_SEARCH_PER_MIN ?? "120")
);

const app = express();

assertProductionEnvironment();
app.use(requestContextMiddleware);

// In production set CORS_ORIGIN to your exact frontend domain.
// In development we allow any origin so the app works from any device on the LAN.
const isProd = process.env.NODE_ENV === "production";
const corsOriginEnv = process.env.CORS_ORIGIN;
const corsOriginOption: cors.CorsOptions["origin"] = corsOriginEnv
  ? corsOriginEnv.split(",").map((s) => s.trim())
  : isProd
    ? ["http://localhost:3000"]
    : true; // allow any origin in dev

app.use(
  cors({
    origin: corsOriginOption,
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-Clinic-Id"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
  })
);
app.use(express.json({
  verify: (req, _res, buf) => {
    const url = req.url ?? "";
    if (url.startsWith("/webhooks/daily") || url.startsWith("/webhooks/meta/whatsapp") || url.startsWith("/webhooks/resend")) {
      (req as express.Request & { rawBody?: string }).rawBody = buf.toString("utf8");
    }
  }
}));
if (process.env.TRUST_PROXY === "1" || process.env.TRUST_PROXY === "true") {
  app.set("trust proxy", 1);
}

const marketingLeadBody = z.object({
  name: z.string().min(1).max(200),
  phone: z
    .string()
    .min(8)
    .max(40)
    .refine((s) => {
      const d = s.replace(/\D/g, "");
      return d.length >= 10 && d.length <= 15;
    }, "Enter a valid phone number (at least 10 digits)"),
  email: z.string().email().max(320),
  clinicName: z.string().min(1).max(200),
  city: z.string().min(1).max(120),
  message: z.string().max(2000).optional().nullable(),
  intent: z.enum(["walkthrough", "trial"]).optional()
});

/** Public: marketing site demo / contact form (no auth). */
app.post("/public/marketing-lead", async (req, res) => {
  const limit = checkMarketingLeadLimit(req);
  if (!limit.allowed) {
    res.setHeader("Retry-After", String(limit.retryAfterSec));
    jsonError(res, 429, "Too many requests. Please try again later or email care@glowhomeo.in.", {
      code: "RATE_LIMITED"
    });
    return;
  }
  const parsed = marketingLeadBody.safeParse(req.body);
  if (!parsed.success) {
    jsonError(res, 400, "Invalid request", { code: "VALIDATION_ERROR", details: parsed.error.flatten() });
    return;
  }
  const cn = parsed.data.clinicName.trim().toLowerCase();
  const intent =
    parsed.data.intent ??
    (cn.includes("trial") || cn.includes("90-day") ? ("trial" as const) : ("walkthrough" as const));
  const row = {
    name: parsed.data.name.trim(),
    phone: parsed.data.phone.trim(),
    email: parsed.data.email.trim().toLowerCase(),
    clinic_name: parsed.data.clinicName.trim(),
    city: parsed.data.city.trim(),
    message: parsed.data.message?.trim() || null,
    intent
  };
  const { data, error } = await supabaseAdmin.from("marketing_lead_requests").insert(row).select("id").maybeSingle();
  if (error) {
    logAndSanitizeError("marketing_lead_insert", error);
    jsonError(res, 500, "Could not save your request. Please try again or email care@glowhomeo.in.", { code: "DB_ERROR" });
    return;
  }
  jsonSuccess(res, 201, { id: (data as { id?: string } | null)?.id ?? null });
});

const MS_FOLLOWUP_DUE = 14 * 24 * 60 * 60 * 1000;

function extractNoteDetail(n: unknown): {
  chiefComplaints?: string;
  emotionalState?: string;
  timeline?: string;
  physicalSymptoms?: string;
  modalities?: string;
} | null {
  if (!n || typeof n !== "object") return null;
  const t = n as Record<string, unknown>;
  const o: {
    chiefComplaints?: string;
    emotionalState?: string;
    timeline?: string;
    physicalSymptoms?: string;
    modalities?: string;
  } = {};
  for (const k of ["chiefComplaints", "emotionalState", "timeline", "physicalSymptoms", "modalities"] as const) {
    const v = t[k];
    if (typeof v === "string" && v.trim().length > 0) {
      o[k] = v;
    }
  }
  return o.chiefComplaints || o.emotionalState || o.timeline || o.physicalSymptoms || o.modalities ? o : null;
}

app.post("/auth/login", async (req, res) => {
  const limit = checkLoginRateLimit(req);
  if (!limit.allowed) {
    res.setHeader("Retry-After", String(limit.retryAfterSec));
    jsonError(res, 429, "Too many login attempts. Please wait and try again.", { code: "RATE_LIMITED" });
    return;
  }
  const parsed = z.object({ email: z.string().email(), password: z.string().min(8) }).safeParse(req.body);
  if (!parsed.success) {
    jsonError(res, 400, "Invalid request", { code: "VALIDATION_ERROR", details: parsed.error.flatten() });
    return;
  }
  const { data, error } = await supabaseAnon.auth.signInWithPassword(parsed.data);
  if (error || !data.session || !data.user) {
    logAndSanitizeError("auth_login_failed", error ?? new Error("no session"));
    jsonError(res, 401, "Invalid email or password", { code: "INVALID_CREDENTIALS" });
    return;
  }

  const client = createSupabaseUserClient(data.session.access_token);
  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("clinic_id, role")
    .eq("id", data.user.id)
    .maybeSingle();
  if (profileError) {
    logAndSanitizeError("auth_login_profile", profileError);
    jsonError(res, 400, "Unable to load your profile. Contact support if this continues.", { code: "PROFILE_ERROR" });
    return;
  }
  const pr = profile as { clinic_id: string | null; role: string } | null;
  const role = mapProfileRoleStringToDomain(pr?.role);

  jsonSuccess(res, 200, {
    token: data.session.access_token,
    role,
    profileRole: pr?.role ?? "patient",
    clinicId: pr?.clinic_id ?? null
  });
});

/** Any authenticated user — used by web to resolve role before calling staff-only routes. */
app.get("/auth/me", authRequired, async (req, res) => {
  const claims = (req as express.Request & { user: AuthClaims }).user;
  jsonSuccess(res, 200, { role: claims.role, userId: claims.userId, clinicId: claims.clinicId });
});

/** Profile + clinic label for doctor workspace / control panel UI */
app.get("/doctor/workspace-context", authRequired, requireAppRoles(["DOCTOR", "SUPER_ADMIN"]), async (req, res) => {
  const claims = (req as express.Request & { user: AuthClaims }).user;
  const client = getDb(claims);
  const { data: profile, error: pErr } = await client
    .from("profiles")
    .select("full_name, clinic_id, credentials, registration_number, signature_object_key, prescription_document_prefs")
    .eq("id", claims.userId)
    .maybeSingle();
  if (pErr) {
    jsonErrorDb(res, "workspace_context_profile", pErr);
    return;
  }
  const pr = profile as {
    full_name: string | null;
    clinic_id: string | null;
    credentials?: string | null;
    registration_number?: string | null;
    signature_object_key?: string | null;
    prescription_document_prefs?: unknown;
  } | null;
  const rawName = (pr?.full_name ?? "").trim();
  const parts = rawName.split(/\s+/).filter(Boolean);
  const firstName = parts[0] ?? "Doctor";
  let clinicName: string | null = null;
  let clinicLocation: string | null = null;
  let clinicPhone: string | null = null;
  let clinicEmail: string | null = null;
  let clinicAddress: string | null = null;
  let clinicRegNumber: string | null = null;
  let clinicPlanTier: string = "BASIC";
  let clinicFeatureOverrides: Record<string, boolean> = {};
  if (pr?.clinic_id) {
    const [{ data: clinic }, { data: featureRows }] = await Promise.all([
      client
        .from("clinics")
        .select("name,location,address,phone,email,registration_number,plan_tier")
        .eq("id", pr.clinic_id)
        .maybeSingle(),
      supabaseAdmin
        .from("clinic_feature_overrides")
        .select("feature_key,enabled")
        .eq("clinic_id", pr.clinic_id),
    ]);
    const cl = clinic as { name: string; location?: string | null; address?: string | null; phone?: string | null; email?: string | null; registration_number?: string | null; plan_tier?: string | null } | null;
    clinicName = cl?.name ?? null;
    clinicLocation = cl?.location?.trim() ? cl.location : null;
    clinicAddress = cl?.address?.trim() ? cl.address : null;
    clinicPhone = cl?.phone?.trim() ? cl.phone : null;
    clinicEmail = cl?.email?.trim() ? cl.email : null;
    clinicRegNumber = cl?.registration_number?.trim() ? cl.registration_number : null;
    clinicPlanTier = cl?.plan_tier ?? "BASIC";
    const rows = (featureRows ?? []) as Array<{ feature_key: string; enabled: boolean }>;
    for (const row of rows) { clinicFeatureOverrides[row.feature_key] = row.enabled; }
  }
  let signatureUrl: string | null = null;
  const sigKey = typeof pr?.signature_object_key === "string" ? pr.signature_object_key.trim() : "";
  if (sigKey && sigKey.startsWith(`clinics/${pr?.clinic_id ?? ""}/`)) {
    try {
      signatureUrl = await createDownloadUrl(sigKey);
    } catch {
      signatureUrl = null;
    }
  }
  const rawPrefs = pr?.prescription_document_prefs;
  const docPrefs =
    rawPrefs && typeof rawPrefs === "object" && !Array.isArray(rawPrefs)
      ? (rawPrefs as Record<string, unknown>)
      : {};
  const resolvedFeatures = resolveFeatures(clinicPlanTier, clinicFeatureOverrides);
  jsonSuccess(res, 200, {
    fullName: rawName.length > 0 ? rawName : "Doctor",
    firstName,
    clinicName,
    clinicLocation,
    clinicAddress,
    clinicPhone,
    clinicEmail,
    clinicRegistrationNumber: clinicRegNumber,
    clinicId: pr?.clinic_id ?? null,
    qualification: typeof pr?.credentials === "string" && pr.credentials.trim() ? pr.credentials.trim() : null,
    registrationNumber:
      typeof pr?.registration_number === "string" && pr.registration_number.trim() ? pr.registration_number.trim() : null,
    specialty: typeof (pr as Record<string, unknown> | null)?.specialty === "string" ? ((pr as Record<string, unknown>).specialty as string).trim() || null : null,
    signatureObjectKey: sigKey || null,
    signatureUrl,
    prescriptionDocumentPrefs: {
      showClinicDetails: docPrefs.showClinicDetails !== false,
      showSignature: docPrefs.showSignature !== false,
      showRegistrationNumber: docPrefs.showRegistrationNumber !== false
    },
    role: claims.role,
    features: resolvedFeatures
  });
});

const PrescriptionDocumentPrefsSchema = z
  .object({
    showClinicDetails: z.boolean().optional(),
    showSignature: z.boolean().optional(),
    showRegistrationNumber: z.boolean().optional()
  })
  .strict();

app.patch("/doctor/prescription-branding", authRequired, requireAppRoles(["DOCTOR", "SUPER_ADMIN"]), async (req, res) => {
  const claims = (req as express.Request & { user: AuthClaims }).user;
  const clinicId = resolveClinicScope(req, claims, res);
  if (!clinicId) return;
  const parsed = z
    .object({
      qualification: z.string().max(500).optional().nullable(),
      registrationNumber: z.string().max(200).optional().nullable(),
      signatureObjectKey: z.string().min(1).max(500).nullable().optional(),
      documentPrefs: PrescriptionDocumentPrefsSchema.optional()
    })
    .refine((b) => Object.keys(b).length > 0, { message: "Empty body" })
    .safeParse(req.body);
  if (!parsed.success) {
    jsonError(res, 400, "Invalid request", { code: "VALIDATION_ERROR", details: parsed.error.flatten() });
    return;
  }
  const client = getDb(claims);
  const { data: existing, error: loadErr } = await client
    .from("profiles")
    .select("prescription_document_prefs, signature_object_key")
    .eq("id", claims.userId)
    .maybeSingle();
  if (loadErr) {
    jsonErrorDb(res, "prescription_branding_load", loadErr);
    return;
  }
  if (!existing) {
    jsonError(res, 404, "Profile not found", { code: "NOT_FOUND" });
    return;
  }
  const updates: Record<string, unknown> = {};
  if (parsed.data.qualification !== undefined) {
    updates.credentials = parsed.data.qualification?.trim() || null;
  }
  if (parsed.data.registrationNumber !== undefined) {
    updates.registration_number = parsed.data.registrationNumber?.trim() || null;
  }
  if (parsed.data.signatureObjectKey !== undefined) {
    const k = parsed.data.signatureObjectKey;
    if (k === null) {
      updates.signature_object_key = null;
    } else if (!k.startsWith(`clinics/${clinicId}/`)) {
      jsonError(res, 403, "Signature file must belong to your clinic storage prefix", { code: "TENANT_SCOPE" });
      return;
    } else {
      updates.signature_object_key = k;
    }
  }
  if (parsed.data.documentPrefs) {
    const prev =
      existing.prescription_document_prefs &&
      typeof existing.prescription_document_prefs === "object" &&
      !Array.isArray(existing.prescription_document_prefs)
        ? (existing.prescription_document_prefs as Record<string, unknown>)
        : {};
    updates.prescription_document_prefs = { ...prev, ...parsed.data.documentPrefs };
  }
  const { error: upErr } = await client.from("profiles").update(updates).eq("id", claims.userId);
  if (upErr) {
    jsonErrorDb(res, "prescription_branding_patch", upErr);
    return;
  }
  jsonSuccess(res, 200, { ok: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// Doctor profile & clinic settings (self-serve)
// ─────────────────────────────────────────────────────────────────────────────

/** PATCH /doctor/profile — update doctor's own full_name, credentials, registration_number, specialty */
app.patch("/doctor/profile", authRequired, requireAppRoles(["DOCTOR", "SUPER_ADMIN"]), async (req, res) => {
  const claims = (req as express.Request & { user: AuthClaims }).user;
  const parsed = z
    .object({
      fullName: z.string().min(1).max(200).optional(),
      qualification: z.string().max(500).optional().nullable(),
      registrationNumber: z.string().max(200).optional().nullable(),
      specialty: z.string().max(200).optional().nullable()
    })
    .refine((b) => Object.keys(b).length > 0, { message: "Empty body" })
    .safeParse(req.body);
  if (!parsed.success) {
    jsonError(res, 400, "Invalid request", { code: "VALIDATION_ERROR", details: parsed.error.flatten() });
    return;
  }
  const client = getDb(claims);
  const updates: Record<string, unknown> = {};
  if (parsed.data.fullName !== undefined) updates.full_name = parsed.data.fullName.trim();
  if (parsed.data.qualification !== undefined) updates.credentials = parsed.data.qualification?.trim() || null;
  if (parsed.data.registrationNumber !== undefined)
    updates.registration_number = parsed.data.registrationNumber?.trim() || null;
  if (parsed.data.specialty !== undefined) updates.specialty = parsed.data.specialty?.trim() || null;
  const { error } = await client.from("profiles").update(updates).eq("id", claims.userId);
  if (error) { jsonErrorDb(res, "doctor_profile_patch", error); return; }
  jsonSuccess(res, 200, { ok: true });
});

/** PATCH /doctor/clinic — update clinic name, location, address, phone, email, registration_number */
app.patch("/doctor/clinic", authRequired, requireAppRoles(["DOCTOR", "SUPER_ADMIN"]), async (req, res) => {
  const claims = (req as express.Request & { user: AuthClaims }).user;
  const clinicId = resolveClinicScope(req, claims, res);
  if (!clinicId) return;
  const parsed = z
    .object({
      name: z.string().min(1).max(200).optional(),
      location: z.string().max(500).optional().nullable(),
      address: z.string().max(1000).optional().nullable(),
      phone: z.string().max(40).optional().nullable(),
      email: z.string().email().max(320).optional().nullable(),
      registrationNumber: z.string().max(200).optional().nullable()
    })
    .refine((b) => Object.keys(b).length > 0, { message: "Empty body" })
    .safeParse(req.body);
  if (!parsed.success) {
    jsonError(res, 400, "Invalid request", { code: "VALIDATION_ERROR", details: parsed.error.flatten() });
    return;
  }
  const client = getDb(claims);
  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name.trim();
  if (parsed.data.location !== undefined) updates.location = parsed.data.location?.trim() || null;
  if (parsed.data.address !== undefined) updates.address = parsed.data.address?.trim() || null;
  if (parsed.data.phone !== undefined) updates.phone = parsed.data.phone?.trim() || null;
  if (parsed.data.email !== undefined) updates.email = parsed.data.email?.trim().toLowerCase() || null;
  if (parsed.data.registrationNumber !== undefined)
    updates.registration_number = parsed.data.registrationNumber?.trim() || null;
  const { error } = await client.from("clinics").update(updates).eq("id", clinicId);
  if (error) { jsonErrorDb(res, "doctor_clinic_patch", error); return; }
  jsonSuccess(res, 200, { ok: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// Advice templates (server-backed, tenant-scoped)
// ─────────────────────────────────────────────────────────────────────────────

const AdviceTemplateBodySchema = z.object({
  title: z.string().min(1).max(200),
  category: z.enum(["diet", "lifestyle", "restriction"]),
  content: z.string().min(1).max(4000),
  isShared: z.boolean().optional()
});

app.get("/doctor/advice-templates", authRequired, requireAppRoles(["DOCTOR", "SUPER_ADMIN"]), async (req, res) => {
  const claims = (req as express.Request & { user: AuthClaims }).user;
  const clinicId = resolveClinicScope(req, claims, res);
  if (!clinicId) return;
  const client = getDb(claims);
  const { data, error } = await client
    .from("advice_templates")
    .select("id,title,category,content,is_shared,doctor_id,created_at,updated_at")
    .eq("clinic_id", clinicId)
    .order("created_at", { ascending: false });
  if (error) { jsonErrorDb(res, "advice_templates_list", error); return; }
  const rows = (data ?? []).map((r) => {
    const row = r as { id: string; title: string; category: string; content: string; is_shared: boolean; doctor_id: string; created_at: string; updated_at: string };
    return {
      id: row.id,
      title: row.title,
      category: row.category,
      content: row.content,
      isShared: row.is_shared,
      isOwn: row.doctor_id === claims.userId,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  });
  jsonSuccess(res, 200, rows);
});

app.post("/doctor/advice-templates", authRequired, requireAppRoles(["DOCTOR", "SUPER_ADMIN"]), async (req, res) => {
  const claims = (req as express.Request & { user: AuthClaims }).user;
  const clinicId = resolveClinicScope(req, claims, res);
  if (!clinicId) return;
  const parsed = AdviceTemplateBodySchema.safeParse(req.body);
  if (!parsed.success) {
    jsonError(res, 400, "Invalid request", { code: "VALIDATION_ERROR", details: parsed.error.flatten() });
    return;
  }
  const client = getDb(claims);
  const { data, error } = await client
    .from("advice_templates")
    .insert({
      clinic_id: clinicId,
      doctor_id: claims.userId,
      title: parsed.data.title.trim(),
      category: parsed.data.category,
      content: parsed.data.content.trim(),
      is_shared: parsed.data.isShared ?? false
    })
    .select("id")
    .maybeSingle();
  if (error) { jsonErrorDb(res, "advice_templates_create", error); return; }
  jsonSuccess(res, 201, { id: (data as { id: string } | null)?.id });
});

app.patch("/doctor/advice-templates/:id", authRequired, requireAppRoles(["DOCTOR", "SUPER_ADMIN"]), async (req, res) => {
  const claims = (req as express.Request & { user: AuthClaims }).user;
  const templateId = req.params.id;
  const parsed = AdviceTemplateBodySchema.partial()
    .refine((b) => Object.keys(b).length > 0, { message: "Empty body" })
    .safeParse(req.body);
  if (!parsed.success) {
    jsonError(res, 400, "Invalid request", { code: "VALIDATION_ERROR", details: parsed.error.flatten() });
    return;
  }
  const client = getDb(claims);
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.title !== undefined) updates.title = parsed.data.title.trim();
  if (parsed.data.category !== undefined) updates.category = parsed.data.category;
  if (parsed.data.content !== undefined) updates.content = parsed.data.content.trim();
  if (parsed.data.isShared !== undefined) updates.is_shared = parsed.data.isShared;
  const { error } = await client.from("advice_templates").update(updates).eq("id", templateId).eq("doctor_id", claims.userId);
  if (error) { jsonErrorDb(res, "advice_templates_patch", error); return; }
  jsonSuccess(res, 200, { ok: true });
});

app.delete("/doctor/advice-templates/:id", authRequired, requireAppRoles(["DOCTOR", "SUPER_ADMIN"]), async (req, res) => {
  const claims = (req as express.Request & { user: AuthClaims }).user;
  const templateId = req.params.id;
  const client = getDb(claims);
  const { error } = await client.from("advice_templates").delete().eq("id", templateId).eq("doctor_id", claims.userId);
  if (error) { jsonErrorDb(res, "advice_templates_delete", error); return; }
  jsonSuccess(res, 200, { ok: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// Treatment plans (server-backed, tenant-scoped)
// ─────────────────────────────────────────────────────────────────────────────

const TreatmentPlanBodySchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  dietAdvice: z.string().max(4000).optional().nullable(),
  lifestyleAdvice: z.string().max(4000).optional().nullable(),
  restrictionAdvice: z.string().max(4000).optional().nullable(),
  remedyGuidelines: z.string().max(4000).optional().nullable(),
  linkedTemplateIds: z.array(z.string().uuid()).max(20).optional(),
  isShared: z.boolean().optional()
});

app.get("/doctor/treatment-plans", authRequired, requireAppRoles(["DOCTOR", "SUPER_ADMIN"]), async (req, res) => {
  const claims = (req as express.Request & { user: AuthClaims }).user;
  const clinicId = resolveClinicScope(req, claims, res);
  if (!clinicId) return;
  const client = getDb(claims);
  const { data, error } = await client
    .from("treatment_plans")
    .select("id,title,description,diet_advice,lifestyle_advice,restriction_advice,remedy_guidelines,linked_template_ids,is_shared,doctor_id,created_at,updated_at")
    .eq("clinic_id", clinicId)
    .order("created_at", { ascending: false });
  if (error) { jsonErrorDb(res, "treatment_plans_list", error); return; }
  const rows = (data ?? []).map((r) => {
    const row = r as { id: string; title: string; description: string | null; diet_advice: string | null; lifestyle_advice: string | null; restriction_advice: string | null; remedy_guidelines: string | null; linked_template_ids: string[] | null; is_shared: boolean; doctor_id: string; created_at: string; updated_at: string };
    return {
      id: row.id, title: row.title, description: row.description,
      dietAdvice: row.diet_advice, lifestyleAdvice: row.lifestyle_advice,
      restrictionAdvice: row.restriction_advice, remedyGuidelines: row.remedy_guidelines,
      linkedTemplateIds: row.linked_template_ids ?? [],
      isShared: row.is_shared, isOwn: row.doctor_id === claims.userId,
      createdAt: row.created_at, updatedAt: row.updated_at
    };
  });
  jsonSuccess(res, 200, rows);
});

app.post("/doctor/treatment-plans", authRequired, requireAppRoles(["DOCTOR", "SUPER_ADMIN"]), async (req, res) => {
  const claims = (req as express.Request & { user: AuthClaims }).user;
  const clinicId = resolveClinicScope(req, claims, res);
  if (!clinicId) return;
  const parsed = TreatmentPlanBodySchema.safeParse(req.body);
  if (!parsed.success) {
    jsonError(res, 400, "Invalid request", { code: "VALIDATION_ERROR", details: parsed.error.flatten() });
    return;
  }
  const client = getDb(claims);
  const { data, error } = await client
    .from("treatment_plans")
    .insert({
      clinic_id: clinicId, doctor_id: claims.userId,
      title: parsed.data.title.trim(),
      description: parsed.data.description?.trim() || null,
      diet_advice: parsed.data.dietAdvice?.trim() || null,
      lifestyle_advice: parsed.data.lifestyleAdvice?.trim() || null,
      restriction_advice: parsed.data.restrictionAdvice?.trim() || null,
      remedy_guidelines: parsed.data.remedyGuidelines?.trim() || null,
      linked_template_ids: parsed.data.linkedTemplateIds ?? [],
      is_shared: parsed.data.isShared ?? false
    })
    .select("id").maybeSingle();
  if (error) { jsonErrorDb(res, "treatment_plans_create", error); return; }
  jsonSuccess(res, 201, { id: (data as { id: string } | null)?.id });
});

app.patch("/doctor/treatment-plans/:id", authRequired, requireAppRoles(["DOCTOR", "SUPER_ADMIN"]), async (req, res) => {
  const claims = (req as express.Request & { user: AuthClaims }).user;
  const planId = req.params.id;
  const parsed = TreatmentPlanBodySchema.partial()
    .refine((b) => Object.keys(b).length > 0, { message: "Empty body" })
    .safeParse(req.body);
  if (!parsed.success) {
    jsonError(res, 400, "Invalid request", { code: "VALIDATION_ERROR", details: parsed.error.flatten() });
    return;
  }
  const client = getDb(claims);
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.title !== undefined) updates.title = parsed.data.title.trim();
  if (parsed.data.description !== undefined) updates.description = parsed.data.description?.trim() || null;
  if (parsed.data.dietAdvice !== undefined) updates.diet_advice = parsed.data.dietAdvice?.trim() || null;
  if (parsed.data.lifestyleAdvice !== undefined) updates.lifestyle_advice = parsed.data.lifestyleAdvice?.trim() || null;
  if (parsed.data.restrictionAdvice !== undefined) updates.restriction_advice = parsed.data.restrictionAdvice?.trim() || null;
  if (parsed.data.remedyGuidelines !== undefined) updates.remedy_guidelines = parsed.data.remedyGuidelines?.trim() || null;
  if (parsed.data.linkedTemplateIds !== undefined) updates.linked_template_ids = parsed.data.linkedTemplateIds;
  if (parsed.data.isShared !== undefined) updates.is_shared = parsed.data.isShared;
  const { error } = await client.from("treatment_plans").update(updates).eq("id", planId).eq("doctor_id", claims.userId);
  if (error) { jsonErrorDb(res, "treatment_plans_patch", error); return; }
  jsonSuccess(res, 200, { ok: true });
});

app.delete("/doctor/treatment-plans/:id", authRequired, requireAppRoles(["DOCTOR", "SUPER_ADMIN"]), async (req, res) => {
  const claims = (req as express.Request & { user: AuthClaims }).user;
  const planId = req.params.id;
  const client = getDb(claims);
  const { error } = await client.from("treatment_plans").delete().eq("id", planId).eq("doctor_id", claims.userId);
  if (error) { jsonErrorDb(res, "treatment_plans_delete", error); return; }
  jsonSuccess(res, 200, { ok: true });
});

// ─────────────────────────────────────────────────────────────────────────────

/** Platform (SUPER_ADMIN only); uses service role to list/create/patch clinics. */
app.get("/admin/clinics", authRequired, requireAppRoles(["SUPER_ADMIN"]), async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from("clinics")
    .select("id,name,slug,created_at,location,is_active")
    .order("name", { ascending: true });
  if (error) {
    jsonErrorDb(res, "admin_clinics_list", error);
    return;
  }
  const rows = data ?? [];
  const { data: profs } = await supabaseAdmin.from("profiles").select("clinic_id").eq("role", "doctor");
  const byClinic = new Map<string, number>();
  for (const p of profs ?? []) {
    const cid = (p as { clinic_id: string | null }).clinic_id;
    if (cid) {
      byClinic.set(cid, (byClinic.get(cid) ?? 0) + 1);
    }
  }
  const enriched = rows.map((c) => ({
    ...c,
    doctor_count: byClinic.get((c as { id: string }).id) ?? 0
  }));
  jsonSuccess(res, 200, enriched);
});

app.post("/admin/clinics", authRequired, requireAppRoles(["SUPER_ADMIN"]), async (req, res) => {
  const parsed = z
    .object({
      name: z.string().min(1).max(200),
      slug: z
        .string()
        .min(1)
        .max(80)
        .regex(/^[a-z0-9-]+$/)
        .optional(),
      location: z.string().max(300).optional().nullable(),
      is_active: z.boolean().optional()
    })
    .safeParse(req.body);
  if (!parsed.success) {
    jsonError(res, 400, "Invalid body", { code: "VALIDATION_ERROR", details: parsed.error.flatten() });
    return;
  }
  const { data, error } = await supabaseAdmin
    .from("clinics")
    .insert({
      name: parsed.data.name,
      slug: parsed.data.slug ?? null,
      location: parsed.data.location ?? null,
      is_active: parsed.data.is_active ?? true
    })
    .select("id,name,slug,created_at,location,is_active")
    .single();
  if (error) {
    jsonErrorDb(res, "admin_clinics_create", error);
    return;
  }
  jsonSuccess(res, 201, data);
});

app.post(
  "/admin/doctors",
  authRequired,
  requireAppRoles(["SUPER_ADMIN"]),
  async (req, res) => {
    const parsed = z
      .object({
        name: z.string().min(1).max(200),
        email: z.string().email(),
        clinicId: z.string().uuid(),
        /** If omitted or blank, server generates a one-time strong password. Min 8 when non-empty. */
        password: z.string().max(256).optional()
      })
      .safeParse(req.body);
    if (!parsed.success) {
      jsonError(res, 400, "Invalid request", { code: "VALIDATION_ERROR", details: parsed.error.flatten() });
      return;
    }
    const { name, email, clinicId, password: passwordFromBody } = parsed.data;
    const rawPw = (passwordFromBody ?? "").trim();
    if (rawPw.length > 0 && rawPw.length < 8) {
      jsonError(res, 400, "Password must be at least 8 characters", { code: "VALIDATION_ERROR" });
      return;
    }
    const { data: clRow, error: cErr } = await supabaseAdmin.from("clinics").select("id").eq("id", clinicId).maybeSingle();
    if (cErr) {
      jsonErrorDb(res, "admin_doctors_clinic_check", cErr);
      return;
    }
    if (!clRow) {
      jsonError(res, 400, "Clinic not found", { code: "CLINIC_NOT_FOUND" });
      return;
    }
    const tempPassword = rawPw.length >= 8 ? rawPw : `${crypto.randomBytes(24).toString("base64url")}Aa0!x`;
    const { data: created, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: name }
    });
    if (authErr || !created.user) {
      logAndSanitizeError("admin_create_doctor_auth", authErr);
      const msg = (authErr?.message ?? "").toLowerCase();
      if (msg.includes("registered") || msg.includes("exists") || msg.includes("already")) {
        jsonError(res, 409, "A user with this email already exists", { code: "EMAIL_IN_USE" });
        return;
      }
      jsonError(res, 400, "Could not create account. Check email and try again.", { code: "AUTH_CREATE_FAILED" });
      return;
    }
    const uid = created.user.id;
    const { error: pErr } = await supabaseAdmin.from("profiles").insert({
      id: uid,
      full_name: name,
      role: "doctor",
      clinic_id: clinicId
    });
    if (pErr) {
      logAndSanitizeError("admin_create_doctor_profile", pErr);
      await supabaseAdmin.auth.admin.deleteUser(uid).catch(() => undefined);
      jsonError(res, 400, "Could not create doctor profile. Please try again.", { code: "PROFILE_CREATE_FAILED" });
      return;
    }
    jsonSuccess(res, 201, {
      id: uid,
      email: created.user.email ?? email,
      full_name: name,
      clinicId,
      temporaryPassword: tempPassword
    });
  }
);

const clinicIdParam = z.object({ id: z.string().uuid() });
const patchClinicBody = z
  .object({
    name: z.string().min(1).max(200).optional(),
    slug: z
      .string()
      .min(1)
      .max(80)
      .regex(/^[a-z0-9-]+$/)
      .optional()
      .nullable(),
    location: z.string().max(300).optional().nullable(),
    phone: z.string().max(80).optional().nullable(),
    email: z.string().email().max(200).optional().nullable(),
    is_active: z.boolean().optional()
  })
  .refine((o) => Object.keys(o).length > 0, { message: "At least one field required" });

app.get("/admin/clinics/:id", authRequired, requireAppRoles(["SUPER_ADMIN"]), async (req, res) => {
  const idParsed = clinicIdParam.safeParse(req.params);
  if (!idParsed.success) {
    jsonError(res, 400, "Invalid clinic id", { code: "VALIDATION_ERROR" });
    return;
  }
  const { data: cl, error: e1 } = await supabaseAdmin
    .from("clinics")
    .select("id,name,slug,created_at,location,phone,email,is_active")
    .eq("id", idParsed.data.id)
    .maybeSingle();
  if (e1) {
    jsonErrorDb(res, "admin_clinic_get", e1);
    return;
  }
  if (!cl) {
    jsonError(res, 404, "Clinic not found", { code: "NOT_FOUND" });
    return;
  }
  const { data: drs, error: e2 } = await supabaseAdmin
    .from("profiles")
    .select("id,full_name,role,clinic_id,created_at,updated_at")
    .eq("clinic_id", idParsed.data.id)
    .eq("role", "doctor")
    .order("full_name", { ascending: true });
  if (e2) {
    jsonErrorDb(res, "admin_clinic_doctors", e2);
    return;
  }
  jsonSuccess(res, 200, { clinic: cl, doctors: drs ?? [] });
});

app.patch("/admin/clinics/:id", authRequired, requireAppRoles(["SUPER_ADMIN"]), async (req, res) => {
  const idParsed = clinicIdParam.safeParse(req.params);
  if (!idParsed.success) {
    jsonError(res, 400, "Invalid clinic id", { code: "VALIDATION_ERROR" });
    return;
  }
  const bodyParsed = patchClinicBody.safeParse(req.body);
  if (!bodyParsed.success) {
    jsonError(res, 400, "Invalid body", { code: "VALIDATION_ERROR", details: bodyParsed.error.flatten() });
    return;
  }
  const { data, error } = await supabaseAdmin
    .from("clinics")
    .update(bodyParsed.data)
    .eq("id", idParsed.data.id)
    .select("id,name,slug,created_at,location,phone,email,is_active")
    .single();
  if (error) {
    jsonErrorDb(res, "admin_clinic_patch", error);
    return;
  }
  if (!data) {
    jsonError(res, 404, "Clinic not found", { code: "NOT_FOUND" });
    return;
  }
  jsonSuccess(res, 200, data);
});

// ─── Admin: plan tier + feature flag management ───────────────────────────────

const planTierSchema = z.enum(["BASIC", "PRO", "ENTERPRISE"]);

const featureOverridePatchSchema = z.object({
  planTier: planTierSchema.optional(),
  overrides: z
    .record(z.string().min(1).max(100), z.boolean())
    .optional()
});

/** GET /admin/clinics/:id/features — returns plan + effective + per-key overrides */
app.get("/admin/clinics/:id/features", authRequired, requireAppRoles(["SUPER_ADMIN"]), async (req, res) => {
  const idParsed = clinicIdParam.safeParse(req.params);
  if (!idParsed.success) {
    jsonError(res, 400, "Invalid clinic id", { code: "VALIDATION_ERROR" });
    return;
  }
  const clinicId = idParsed.data.id;

  const [{ data: clinic, error: cErr }, { data: overrideRows, error: oErr }] = await Promise.all([
    supabaseAdmin.from("clinics").select("id,plan_tier").eq("id", clinicId).maybeSingle(),
    supabaseAdmin
      .from("clinic_feature_overrides")
      .select("feature_key,enabled,notes,updated_at")
      .eq("clinic_id", clinicId),
  ]);
  if (cErr) { jsonErrorDb(res, "admin_features_clinic", cErr); return; }
  if (!clinic) { jsonError(res, 404, "Clinic not found", { code: "NOT_FOUND" }); return; }
  if (oErr) { jsonErrorDb(res, "admin_features_overrides", oErr); return; }

  const cl = clinic as { id: string; plan_tier?: string | null };
  const rows = (overrideRows ?? []) as Array<{ feature_key: string; enabled: boolean; notes?: string | null; updated_at?: string }>;
  const overrideMap: Record<string, boolean> = {};
  for (const r of rows) overrideMap[r.feature_key] = r.enabled;

  const features = resolveFeatures(cl.plan_tier, overrideMap);

  jsonSuccess(res, 200, {
    planTier: features.planTier,
    features,
    overrides: rows.map((r) => ({
      featureKey: r.feature_key,
      enabled: r.enabled,
      notes: r.notes ?? null,
      updatedAt: r.updated_at ?? null
    })),
    planDefaults: PLAN_FEATURES
  });
});

/** PATCH /admin/clinics/:id/features — update plan tier and/or per-feature overrides */
app.patch("/admin/clinics/:id/features", authRequired, requireAppRoles(["SUPER_ADMIN"]), async (req, res) => {
  const idParsed = clinicIdParam.safeParse(req.params);
  if (!idParsed.success) {
    jsonError(res, 400, "Invalid clinic id", { code: "VALIDATION_ERROR" });
    return;
  }
  const clinicId = idParsed.data.id;
  const bodyParsed = featureOverridePatchSchema.safeParse(req.body);
  if (!bodyParsed.success) {
    jsonError(res, 400, "Invalid body", { code: "VALIDATION_ERROR", details: bodyParsed.error.flatten() });
    return;
  }
  const { planTier, overrides } = bodyParsed.data;
  const claims = (req as express.Request & { user: AuthClaims }).user;

  if (planTier) {
    const { error: ptErr } = await supabaseAdmin
      .from("clinics")
      .update({ plan_tier: planTier })
      .eq("id", clinicId);
    if (ptErr) { jsonErrorDb(res, "admin_features_plan_tier", ptErr); return; }
  }

  if (overrides && Object.keys(overrides).length > 0) {
    const upsertRows = Object.entries(overrides).map(([feature_key, enabled]) => ({
      clinic_id: clinicId,
      feature_key,
      enabled,
      enabled_by: claims.userId,
      updated_at: new Date().toISOString()
    }));
    const { error: uErr } = await supabaseAdmin
      .from("clinic_feature_overrides")
      .upsert(upsertRows, { onConflict: "clinic_id,feature_key" });
    if (uErr) { jsonErrorDb(res, "admin_features_overrides_upsert", uErr); return; }
  }

  // Return updated effective features
  const updatedFeats = await getClinicFeatures(clinicId);
  jsonSuccess(res, 200, { planTier: updatedFeats.planTier, features: updatedFeats });
});

app.get("/admin/doctors", authRequired, requireAppRoles(["SUPER_ADMIN"]), async (req, res) => {
  const q = req.query.clinicId;
  if (typeof q === "string" && q.length > 0) {
    const parsed = z.string().uuid().safeParse(q);
    if (!parsed.success) {
      jsonError(res, 400, "Invalid clinicId", { code: "VALIDATION_ERROR" });
      return;
    }
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id,full_name,role,clinic_id,created_at,updated_at")
      .eq("clinic_id", parsed.data)
      .eq("role", "doctor");
    if (error) {
      jsonErrorDb(res, "admin_doctors_by_clinic", error);
      return;
    }
    jsonSuccess(res, 200, data ?? []);
    return;
  }
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id,full_name,role,clinic_id,created_at,updated_at")
    .eq("role", "doctor")
    .order("full_name", { ascending: true });
  if (error) {
    jsonErrorDb(res, "admin_doctors_all", error);
    return;
  }
  const list = (data ?? []) as Array<{
    id: string;
    full_name: string;
    role: string;
    clinic_id: string | null;
    created_at: string;
    updated_at: string;
  }>;
  const clinicIds = [...new Set(list.map((p) => p.clinic_id).filter((c): c is string => c != null))];
  const nameById = new Map<string, string>();
  if (clinicIds.length > 0) {
    const { data: cRows, error: cErr } = await supabaseAdmin.from("clinics").select("id, name").in("id", clinicIds);
    if (cErr) {
      jsonErrorDb(res, "admin_doctors_clinic_names", cErr);
      return;
    }
    for (const c of cRows ?? []) {
      const row = c as { id: string; name: string };
      nameById.set(row.id, row.name);
    }
  }
  const shaped = list.map((r) => ({
    id: r.id,
    full_name: r.full_name,
    role: r.role,
    clinic_id: r.clinic_id,
    created_at: r.created_at,
    updated_at: r.updated_at,
    clinic_name: r.clinic_id ? nameById.get(r.clinic_id) ?? null : null
  }));
  jsonSuccess(res, 200, shaped);
});

app.get("/admin/platform-summary", authRequired, requireAppRoles(["SUPER_ADMIN"]), async (_req, res) => {
  const d0 = new Date();
  d0.setUTCHours(0, 0, 0, 0);
  const d1 = new Date();
  d1.setUTCHours(23, 59, 59, 999);
  const from = d0.toISOString();
  const to = d1.toISOString();

  const [clinicsN, doctorsN, patientsN, consToday, recentClinics, recentDoctors] = await Promise.all([
    supabaseAdmin.from("clinics").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "doctor"),
    supabaseAdmin.from("patients").select("id", { count: "exact", head: true }),
    supabaseAdmin
      .from("consultations")
      .select("id", { count: "exact", head: true })
      .gte("started_at", from)
      .lte("started_at", to),
    supabaseAdmin.from("clinics").select("id, name, created_at").order("created_at", { ascending: false }).limit(5),
    supabaseAdmin
      .from("profiles")
      .select("id, full_name, created_at, clinic_id")
      .eq("role", "doctor")
      .order("created_at", { ascending: false })
      .limit(5)
  ]);

  if (clinicsN.error) {
    jsonErrorDb(res, "platform_summary_clinics", clinicsN.error);
    return;
  }
  if (doctorsN.error) {
    jsonErrorDb(res, "platform_summary_doctors", doctorsN.error);
    return;
  }
  if (patientsN.error) {
    jsonErrorDb(res, "platform_summary_patients", patientsN.error);
    return;
  }
  if (consToday.error) {
    jsonErrorDb(res, "platform_summary_consultations", consToday.error);
    return;
  }
  if (recentClinics.error) {
    jsonErrorDb(res, "platform_summary_recent_clinics", recentClinics.error);
    return;
  }
  if (recentDoctors.error) {
    jsonErrorDb(res, "platform_summary_recent_doctors", recentDoctors.error);
    return;
  }

  type Act = { id: string; at: string; kind: "clinic" | "doctor"; title: string; subtitle: string | null };
  const activity: Act[] = [];
  for (const c of recentClinics.data ?? []) {
    const r = c as { id: string; name: string; created_at: string };
    activity.push({
      id: r.id,
      at: r.created_at,
      kind: "clinic",
      title: r.name,
      subtitle: "Clinic created"
    });
  }
  for (const p of recentDoctors.data ?? []) {
    const r = p as { id: string; full_name: string; created_at: string; clinic_id: string | null };
    activity.push({
      id: r.id,
      at: r.created_at,
      kind: "doctor",
      title: r.full_name,
      subtitle: "Doctor profile"
    });
  }
  activity.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  const recentActivity = activity.slice(0, 8);

  const prevStart = new Date(d0);
  prevStart.setUTCDate(prevStart.getUTCDate() - 7);
  const { count: consWeek, error: wErr } = await supabaseAdmin
    .from("consultations")
    .select("id", { count: "exact", head: true })
    .gte("started_at", prevStart.toISOString())
    .lte("started_at", to);
  if (wErr) {
    jsonErrorDb(res, "platform_summary_week", wErr);
    return;
  }

  jsonSuccess(res, 200, {
    stats: {
      totalClinics: clinicsN.count ?? 0,
      totalDoctors: doctorsN.count ?? 0,
      totalPatients: patientsN.count ?? 0,
      consultationsToday: consToday.count ?? 0
    },
    growth: {
      consultationsLast7d: consWeek ?? 0
    },
    recentActivity
  });
});

const marketingLeadListQuery = z.object({
  status: z.enum(["new", "contacted", "qualified", "closed", "lost"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0)
});

const marketingLeadPatchBody = z
  .object({
    lead_status: z.enum(["new", "contacted", "qualified", "closed", "lost"]).optional(),
    admin_notes: z.string().max(8000).nullable().optional()
  })
  .refine((b) => b.lead_status !== undefined || b.admin_notes !== undefined, {
    message: "Provide lead_status and/or admin_notes"
  });

app.get("/admin/marketing-leads", authRequired, requireAppRoles(["SUPER_ADMIN"]), async (req, res) => {
  const q = marketingLeadListQuery.safeParse(req.query);
  if (!q.success) {
    jsonError(res, 400, "Invalid query", { code: "VALIDATION_ERROR", details: q.error.flatten() });
    return;
  }
  const { status, limit, offset } = q.data;
  let query = supabaseAdmin
    .from("marketing_lead_requests")
    .select(
      "id,name,phone,email,clinic_name,city,message,intent,lead_status,admin_notes,created_at,updated_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (status) {
    query = query.eq("lead_status", status);
  }
  const { data, error, count } = await query;
  if (error) {
    jsonErrorDb(res, "admin_marketing_leads_list", error);
    return;
  }
  jsonSuccess(res, 200, { items: data ?? [], total: count ?? (data?.length ?? 0) });
});

app.patch(
  "/admin/marketing-leads/:id",
  authRequired,
  requireAppRoles(["SUPER_ADMIN"]),
  async (req, res) => {
    const idParsed = z.string().uuid().safeParse(req.params.id);
    if (!idParsed.success) {
      jsonError(res, 400, "Invalid id", { code: "VALIDATION_ERROR" });
      return;
    }
    const bodyParsed = marketingLeadPatchBody.safeParse(req.body);
    if (!bodyParsed.success) {
      jsonError(res, 400, "Invalid body", { code: "VALIDATION_ERROR", details: bodyParsed.error.flatten() });
      return;
    }
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (bodyParsed.data.lead_status !== undefined) {
      patch.lead_status = bodyParsed.data.lead_status;
    }
    if (bodyParsed.data.admin_notes !== undefined) {
      const n = bodyParsed.data.admin_notes;
      patch.admin_notes = n === null ? null : n.trim() === "" ? null : n.trim();
    }
    const { data, error } = await supabaseAdmin
      .from("marketing_lead_requests")
      .update(patch)
      .eq("id", idParsed.data)
      .select(
        "id,name,phone,email,clinic_name,city,message,intent,lead_status,admin_notes,created_at,updated_at"
      )
      .maybeSingle();
    if (error) {
      jsonErrorDb(res, "admin_marketing_leads_patch", error);
      return;
    }
    if (!data) {
      jsonError(res, 404, "Lead not found", { code: "NOT_FOUND" });
      return;
    }
    jsonSuccess(res, 200, data);
  }
);

const PatientsListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  search: z.string().max(120).optional(),
  tags: z.string().max(400).optional(),
  status: z.enum(["stable", "critical"]).optional(),
  sort: z.enum(["created_at", "last_visit_at", "name"]).optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
  lightweight: z
    .union([z.literal("true"), z.literal("false"), z.literal("1"), z.literal("0")])
    .optional()
    .transform((v) => v === "true" || v === "1"),
  cursor: z.string().max(200).optional()
});

/** Lightweight search for command palette — max 25 rows, no heavy fields. */
app.get(
  "/doctor/patients/search",
  authRequired,
  requireAppRoles(["DOCTOR", "SUPER_ADMIN"]),
  patientSearchLimit,
  async (req, res) => {
    const claims = (req as express.Request & { user: AuthClaims }).user;
    const clinicId = resolveClinicScope(req, claims, res);
    if (!clinicId) return;
    const search = typeof req.query.q === "string" ? req.query.q : "";
    const client = getDb(claims);
    try {
      const result = await listPatients(client, clinicId, {
        limit: Math.min(25, Number(req.query.limit) || 20),
        offset: 0,
        search,
        lightweight: true,
        sort: "name",
        sortDir: "asc"
      });
      jsonSuccess(res, 200, { items: result.items, total: result.total });
    } catch (e) {
      jsonErrorDb(res, "doctor_patients_search", e);
    }
  }
);

app.get("/doctor/patients", authRequired, requireAppRoles(["DOCTOR", "SUPER_ADMIN"]), async (req, res) => {
  const claims = (req as express.Request & { user: AuthClaims }).user;
  const clinicId = resolveClinicScope(req, claims, res);
  if (!clinicId) return;

  const q = PatientsListQuerySchema.safeParse(req.query);
  if (!q.success) {
    jsonError(res, 400, "Invalid query", { code: "VALIDATION_ERROR", details: q.error.flatten() });
    return;
  }
  const { limit, offset, search, tags, status, sort, sortDir, lightweight, cursor } = q.data;
  const client = getDb(claims);
  try {
    const result = await listPatients(client, clinicId, {
      limit,
      offset,
      search,
      tags,
      status,
      sort,
      sortDir,
      lightweight: lightweight ?? false,
      cursor
    });
    jsonSuccess(res, 200, result);
  } catch (e) {
    jsonErrorDb(res, "doctor_patients_list", e);
  }
});

const TimelineQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(80).default(40),
  offset: z.coerce.number().int().min(0).default(0),
  includeNotes: z
    .union([z.literal("true"), z.literal("false"), z.literal("1"), z.literal("0")])
    .optional()
    .transform((v) => v === "true" || v === "1")
});

app.get("/doctor/patients/:id/timeline", authRequired, requireAppRoles(["DOCTOR", "SUPER_ADMIN"]), async (req, res) => {
  const claims = (req as express.Request & { user: AuthClaims }).user;
  const clinicId = resolveClinicScope(req, claims, res);
  if (!clinicId) return;
  const idParse = z.string().uuid().safeParse(req.params.id);
  if (!idParse.success) {
    jsonError(res, 400, "Invalid patient id", { code: "VALIDATION_ERROR", details: idParse.error.flatten() });
    return;
  }
  const tq = TimelineQuerySchema.safeParse(req.query);
  if (!tq.success) {
    jsonError(res, 400, "Invalid query", { code: "VALIDATION_ERROR", details: tq.error.flatten() });
    return;
  }
  const patientId = idParse.data;
  const client = getDb(claims);

  const { data: patient, error: pErr } = await client
    .from("patients")
    .select("id")
    .eq("id", patientId)
    .eq("clinic_id", clinicId)
    .maybeSingle();
  if (pErr) {
    jsonErrorDb(res, "patient_timeline_patient", pErr);
    return;
  }
  if (!patient) {
    jsonError(res, 404, "Patient not found", { code: "NOT_FOUND" });
    return;
  }

  try {
    const timeline = await buildPatientTimeline(client, clinicId, patientId, {
      limit: tq.data.limit,
      offset: tq.data.offset,
      includeNotes: tq.data.includeNotes ?? false
    });
    jsonSuccess(res, 200, timeline);
  } catch (e) {
    jsonErrorDb(res, "patient_timeline", e);
  }
});

/** Lazy-load full consultation note for timeline expansion. */
app.get(
  "/doctor/consultations/:id/note-detail",
  authRequired,
  requireAppRoles(["DOCTOR", "SUPER_ADMIN"]),
  async (req, res) => {
    const claims = (req as express.Request & { user: AuthClaims }).user;
    const clinicId = resolveClinicScope(req, claims, res);
    if (!clinicId) return;
    const idParse = z.string().uuid().safeParse(req.params.id);
    if (!idParse.success) {
      jsonError(res, 400, "Invalid id", { code: "VALIDATION_ERROR" });
      return;
    }
    const client = getDb(claims);
    const { data, error } = await client
      .from("consultations")
      .select("id,note_draft,note_final")
      .eq("id", idParse.data)
      .eq("clinic_id", clinicId)
      .maybeSingle();
    if (error) {
      jsonErrorDb(res, "consultation_note_detail", error);
      return;
    }
    if (!data) {
      jsonError(res, 404, "Not found", { code: "NOT_FOUND" });
      return;
    }
    const row = data as { note_final?: unknown; note_draft?: unknown };
    const detail = extractNoteDetail(row.note_final) ?? extractNoteDetail(row.note_draft);
    jsonSuccess(res, 200, { consultationId: idParse.data, detail });
  }
);

app.get("/doctor/patients/:id/documents", authRequired, requireAppRoles(["DOCTOR", "SUPER_ADMIN"]), async (req, res) => {
  const claims = (req as express.Request & { user: AuthClaims }).user;
  const clinicId = resolveClinicScope(req, claims, res);
  if (!clinicId) return;
  const idParse = z.string().uuid().safeParse(req.params.id);
  if (!idParse.success) {
    jsonError(res, 400, "Invalid patient id", { code: "VALIDATION_ERROR", details: idParse.error.flatten() });
    return;
  }
  const patientId = idParse.data;
  const client = getDb(claims);

  // Find every consultation for this patient so we can pick up older `consultation_id`-only files too.
  const { data: pat } = await client
    .from("patients")
    .select("id")
    .eq("id", patientId)
    .eq("clinic_id", clinicId)
    .maybeSingle();
  if (!pat) {
    jsonError(res, 404, "Patient not found", { code: "NOT_FOUND" });
    return;
  }
  const { data: cons } = await client
    .from("consultations")
    .select("id")
    .eq("patient_id", patientId)
    .eq("clinic_id", clinicId);
  const consIds = (cons ?? []).map((c) => (c as { id: string }).id);
  const orParts: string[] = [`patient_id.eq.${patientId}`];
  if (consIds.length > 0) orParts.push(`consultation_id.in.(${consIds.join(",")})`);
  const { data: rows, error } = await client
    .from("file_objects")
    .select("id,object_key,category,consultation_id,patient_id,created_at,uploaded_by")
    .eq("clinic_id", clinicId)
    .eq("category", "document")
    .or(orParts.join(","))
    .order("created_at", { ascending: false });
  if (error) {
    jsonErrorDb(res, "patient_documents_list", error);
    return;
  }
  const items = (rows ?? []).map((r) => {
    const row = r as {
      id: string;
      object_key: string;
      consultation_id: string | null;
      patient_id: string | null;
      created_at: string;
      uploaded_by: string;
    };
    const filename = row.object_key.split("/").pop() ?? "document";
    return {
      id: row.id,
      objectKey: row.object_key,
      filename,
      consultationId: row.consultation_id,
      patientId: row.patient_id,
      uploadedAt: row.created_at,
      uploadedBy: row.uploaded_by
    };
  });
  jsonSuccess(res, 200, { items });
});

registerHomeoSyncDoctorRoutes(app);
registerMemoRoutes(app);
registerWhatsAppRoutes(app);
registerTelemedicineRoutes(app);
registerPatientRoutes(app);
registerCarePlanRoutes(app);
registerOpsRoutes(app);

const PATIENT_SELECT_COLUMNS_WITH_DOB =
  "id,name,phone,language_preference,age,date_of_birth,gender,address,patient_notes,initial_chief_complaint,created_at,allergies,emergency_contact_name,emergency_contact_phone,blood_group,ongoing_conditions,tags,patient_code";
const PATIENT_SELECT_COLUMNS_LEGACY =
  "id,name,phone,language_preference,age,gender,address,patient_notes,initial_chief_complaint,created_at,allergies,emergency_contact_name,emergency_contact_phone,blood_group,ongoing_conditions,tags,patient_code";

function isMissingDateOfBirthColumn(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const maybe = error as { code?: string; message?: string };
  if (maybe.code === "42703") return true;
  return typeof maybe.message === "string" && maybe.message.includes("date_of_birth");
}

app.get("/doctor/patients/:id", authRequired, requireAppRoles(["DOCTOR", "SUPER_ADMIN"]), async (req, res) => {
  const claims = (req as express.Request & { user: AuthClaims }).user;
  const clinicId = resolveClinicScope(req, claims, res);
  if (!clinicId) return;
  const idParse = z.string().uuid().safeParse(req.params.id);
  if (!idParse.success) {
    jsonError(res, 400, "Invalid patient id", { code: "VALIDATION_ERROR", details: idParse.error.flatten() });
    return;
  }
  const patientId = idParse.data;
  const client = getDb(claims);

  let hasDateOfBirthColumn = true;
  let row: unknown = null;
  let pErr: unknown = null;
  {
    const q = await client
      .from("patients")
      .select(PATIENT_SELECT_COLUMNS_WITH_DOB)
      .eq("id", patientId)
      .eq("clinic_id", clinicId)
      .maybeSingle();
    row = q.data;
    pErr = q.error;
  }
  if (pErr && isMissingDateOfBirthColumn(pErr)) {
    hasDateOfBirthColumn = false;
    const legacy = await client
      .from("patients")
      .select(PATIENT_SELECT_COLUMNS_LEGACY)
      .eq("id", patientId)
      .eq("clinic_id", clinicId)
      .maybeSingle();
    row = legacy.data;
    pErr = legacy.error;
  }
  if (pErr) {
    jsonErrorDb(res, "patient_get", pErr);
    return;
  }
  if (!row) {
    jsonError(res, 404, "Patient not found", { code: "NOT_FOUND" });
    return;
  }

  const { data: cDates } = await client
    .from("consultations")
    .select("started_at,ended_at")
    .eq("patient_id", patientId)
    .eq("clinic_id", clinicId);
  const { data: rDates } = await client
    .from("prescriptions")
    .select("created_at")
    .eq("patient_id", patientId)
    .eq("clinic_id", clinicId);

  const times: number[] = [];
  for (const c of cDates ?? []) {
    if ((c as { started_at: string | null }).started_at) {
      times.push(new Date((c as { started_at: string }).started_at).getTime());
    }
    if ((c as { ended_at: string | null }).ended_at) {
      times.push(new Date((c as { ended_at: string }).ended_at as string).getTime());
    }
  }
  for (const r of rDates ?? []) {
    if ((r as { created_at: string }).created_at) {
      times.push(new Date((r as { created_at: string }).created_at).getTime());
    }
  }
  const lastVisitAt = times.length > 0 ? new Date(Math.max(...times)).toISOString() : null;

  let pendingPriorOutcome: { consultationId: string; endedAt: string; summary: string } | null = null;
  let lastCaseOutcome: { outcome: string; documentedAt: string; assessment?: string } | null = null;
  const { data: endedForOutcome } = await client
    .from("consultations")
    .select("id,ended_at,note_final")
    .eq("patient_id", patientId)
    .eq("clinic_id", clinicId)
    .not("ended_at", "is", null)
    .not("note_final", "is", null)
    .order("ended_at", { ascending: false })
    .limit(10);
  if (endedForOutcome && endedForOutcome.length > 0) {
    const cIds = endedForOutcome.map((c) => (c as { id: string }).id);
    const { data: ocRows } = await client
      .from("case_outcomes")
      .select("consultation_id")
      .eq("clinic_id", clinicId)
      .in("consultation_id", cIds);
    const withOutcome = new Set((ocRows ?? []).map((o) => (o as { consultation_id: string }).consultation_id));
    for (const c of endedForOutcome) {
      const cr = c as { id: string; ended_at: string; note_final: unknown };
      if (withOutcome.has(cr.id)) continue;
      const nf = cr.note_final as Record<string, unknown> | null;
      const cc = nf?.chiefComplaints ?? nf?.chief_complaints;
      const summary =
        typeof cc === "string" && cc.trim()
          ? cc.length > 160
            ? `${cc.slice(0, 160)}…`
            : cc
          : "Document outcome";
      pendingPriorOutcome = { consultationId: cr.id, endedAt: cr.ended_at, summary };
      break;
    }
  }
  const { data: lastOcRow } = await client
    .from("case_outcomes")
    .select("outcome,documented_at,assessment")
    .eq("patient_id", patientId)
    .eq("clinic_id", clinicId)
    .order("documented_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastOcRow) {
    const lo = lastOcRow as { outcome: string; documented_at: string; assessment: string | null };
    lastCaseOutcome = {
      outcome: lo.outcome,
      documentedAt: lo.documented_at,
      assessment: lo.assessment ?? undefined
    };
  }

  const rw = row as {
    id: string;
    name: string;
    phone: string | null;
    language_preference: string | null;
    age: number | null;
    date_of_birth?: string | null;
    gender?: string | null;
    address?: string | null;
    patient_notes?: string | null;
    initial_chief_complaint: string | null;
    created_at: string;
    allergies?: string | null;
    emergency_contact_name?: string | null;
    emergency_contact_phone?: string | null;
    blood_group?: string | null;
    ongoing_conditions?: string | null;
    tags?: string[] | null;
  };
  jsonSuccess(res, 200, {
    id: rw.id,
    name: rw.name,
    phone: rw.phone ?? undefined,
    languagePreference: rw.language_preference,
    age: rw.age ?? undefined,
    dateOfBirth: hasDateOfBirthColumn ? (rw.date_of_birth ?? undefined) : undefined,
    gender: rw.gender ?? undefined,
    address: rw.address ?? undefined,
    patientNotes: rw.patient_notes ?? undefined,
    initialChiefComplaint: rw.initial_chief_complaint ?? undefined,
    allergies: rw.allergies ?? undefined,
    emergencyContactName: rw.emergency_contact_name ?? undefined,
    emergencyContactPhone: rw.emergency_contact_phone ?? undefined,
    bloodGroup: rw.blood_group ?? undefined,
    ongoingConditions: rw.ongoing_conditions ?? undefined,
    tags: Array.isArray(rw.tags) ? (rw.tags as string[]) : undefined,
    createdAt: rw.created_at,
    lastVisitAt,
    pendingPriorOutcome,
    lastCaseOutcome
  });
});

app.patch("/doctor/patients/:id", authRequired, requireAppRoles(["DOCTOR", "SUPER_ADMIN"]), async (req, res) => {
  const claims = (req as express.Request & { user: AuthClaims }).user;
  const clinicId = resolveClinicScope(req, claims, res);
  if (!clinicId) return;
  const idParse = z.string().uuid().safeParse(req.params.id);
  if (!idParse.success) {
    jsonError(res, 400, "Invalid patient id", { code: "VALIDATION_ERROR", details: idParse.error.flatten() });
    return;
  }
  const parsed = PatientPatchBodySchema.safeParse(req.body);
  if (!parsed.success) {
    jsonError(res, 400, "Invalid request body", { code: "VALIDATION_ERROR", details: parsed.error.flatten() });
    return;
  }
  const client = getDb(claims);
  const updates: Record<string, unknown> = {};
  const b = parsed.data;
  if (b.name != null) updates.name = b.name;
  if (b.phone !== undefined) updates.phone = b.phone ?? null;
  if (b.languagePreference !== undefined) updates.language_preference = b.languagePreference ?? null;
  if (b.age !== undefined) updates.age = b.age ?? null;
  if ((b as { dateOfBirth?: string | null }).dateOfBirth !== undefined) {
    updates.date_of_birth = (b as { dateOfBirth?: string | null }).dateOfBirth ?? null;
  }
  if (b.gender !== undefined) updates.gender = b.gender?.trim() || null;
  if (b.address !== undefined) updates.address = b.address?.trim() || null;
  if (b.patientNotes !== undefined) updates.patient_notes = b.patientNotes?.trim() || null;
  if (b.initialChiefComplaint !== undefined) updates.initial_chief_complaint = b.initialChiefComplaint?.trim() || null;
  if (b.allergies !== undefined) updates.allergies = b.allergies?.trim() || null;
  if (b.emergencyContactName !== undefined) updates.emergency_contact_name = b.emergencyContactName?.trim() || null;
  if (b.emergencyContactPhone !== undefined) updates.emergency_contact_phone = b.emergencyContactPhone?.trim() || null;
  if (b.bloodGroup !== undefined) updates.blood_group = b.bloodGroup?.trim() || null;
  if (b.ongoingConditions !== undefined) updates.ongoing_conditions = b.ongoingConditions?.trim() || null;
  if (b.tags !== undefined)
    updates.tags = Array.isArray(b.tags) ? b.tags.map((t) => t.trim()).filter((t) => t.length > 0) : null;
  if (Object.keys(updates).length === 0) {
    jsonError(res, 400, "No updates", { code: "VALIDATION_ERROR" });
    return;
  }
  let hasDateOfBirthColumn = true;
  let data: unknown = null;
  let error: unknown = null;
  {
    const q = await client
      .from("patients")
      .update(updates)
      .eq("id", idParse.data)
      .eq("clinic_id", clinicId)
      .select(PATIENT_SELECT_COLUMNS_WITH_DOB)
      .maybeSingle();
    data = q.data;
    error = q.error;
  }
  if (error && isMissingDateOfBirthColumn(error)) {
    hasDateOfBirthColumn = false;
    delete updates.date_of_birth;
    const legacy = await client
      .from("patients")
      .update(updates)
      .eq("id", idParse.data)
      .eq("clinic_id", clinicId)
      .select(PATIENT_SELECT_COLUMNS_LEGACY)
      .maybeSingle();
    data = legacy.data;
    error = legacy.error;
  }
  if (error) {
    jsonErrorDb(res, "patient_patch", error);
    return;
  }
  if (!data) {
    jsonError(res, 404, "Patient not found", { code: "NOT_FOUND" });
    return;
  }
  const d = data as {
    id: string;
    name: string;
    phone: string | null;
    language_preference: string | null;
    age: number | null;
    date_of_birth?: string | null;
    gender: string | null;
    address: string | null;
    patient_notes: string | null;
    initial_chief_complaint: string | null;
    created_at: string;
    allergies?: string | null;
    emergency_contact_name?: string | null;
    emergency_contact_phone?: string | null;
    blood_group?: string | null;
    ongoing_conditions?: string | null;
    tags?: string[] | null;
  };
  const { data: cDates } = await client
    .from("consultations")
    .select("started_at,ended_at")
    .eq("patient_id", d.id)
    .eq("clinic_id", clinicId);
  const { data: rDates } = await client
    .from("prescriptions")
    .select("created_at")
    .eq("patient_id", d.id)
    .eq("clinic_id", clinicId);
  const times: number[] = [];
  for (const c of cDates ?? []) {
    if ((c as { started_at: string | null }).started_at) {
      times.push(new Date((c as { started_at: string }).started_at).getTime());
    }
    if ((c as { ended_at: string | null }).ended_at) {
      times.push(new Date((c as { ended_at: string }).ended_at as string).getTime());
    }
  }
  for (const r of rDates ?? []) {
    if ((r as { created_at: string }).created_at) {
      times.push(new Date((r as { created_at: string }).created_at).getTime());
    }
  }
  const lastVisitAt = times.length > 0 ? new Date(Math.max(...times)).toISOString() : null;
  jsonSuccess(res, 200, {
    id: d.id,
    name: d.name,
    phone: d.phone ?? undefined,
    languagePreference: d.language_preference,
    age: d.age ?? undefined,
    dateOfBirth: hasDateOfBirthColumn ? (d.date_of_birth ?? undefined) : undefined,
    gender: d.gender ?? undefined,
    address: d.address ?? undefined,
    patientNotes: d.patient_notes ?? undefined,
    initialChiefComplaint: d.initial_chief_complaint ?? undefined,
    allergies: d.allergies ?? undefined,
    emergencyContactName: d.emergency_contact_name ?? undefined,
    emergencyContactPhone: d.emergency_contact_phone ?? undefined,
    bloodGroup: d.blood_group ?? undefined,
    ongoingConditions: d.ongoing_conditions ?? undefined,
    tags: Array.isArray(d.tags) ? (d.tags as string[]) : undefined,
    patientCode: (d as { patient_code?: string | null }).patient_code ?? undefined,
    createdAt: d.created_at,
    lastVisitAt
  });
});

app.post("/doctor/patients", authRequired, requireAppRoles(["DOCTOR", "SUPER_ADMIN"]), async (req, res) => {
  const claims = (req as express.Request & { user: AuthClaims }).user;
  const clinicId = resolveClinicScope(req, claims, res);
  if (!clinicId) return;
  const parsed = PatientCreateBodySchema.safeParse(req.body);
  if (!parsed.success) {
    jsonError(res, 400, "Invalid request body", { code: "VALIDATION_ERROR", details: parsed.error.flatten() });
    return;
  }
  const client = getDb(claims);
  const patientCode = await allocatePatientCode(client, clinicId);
  const { data, error } = await client
    .from("patients")
    .insert({
      id: uuid(),
      clinic_id: clinicId,
      patient_code: patientCode,
      name: parsed.data.name,
      phone: parsed.data.phone ?? null,
      language_preference: parsed.data.languagePreference ?? null,
      age: parsed.data.age ?? null,
      gender: parsed.data.gender?.trim() || null,
      address: parsed.data.address?.trim() || null,
      patient_notes: parsed.data.patientNotes?.trim() || null,
      initial_chief_complaint: parsed.data.initialChiefComplaint?.trim() || null,
      allergies: parsed.data.allergies?.trim() || null,
      emergency_contact_name: parsed.data.emergencyContactName?.trim() || null,
      emergency_contact_phone: parsed.data.emergencyContactPhone?.trim() || null,
      blood_group: parsed.data.bloodGroup?.trim() || null,
      ongoing_conditions: parsed.data.ongoingConditions?.trim() || null,
      tags: Array.isArray(parsed.data.tags)
        ? parsed.data.tags.map((t) => t.trim()).filter((t) => t.length > 0)
        : null
    })
    .select(
      "id,name,phone,language_preference,age,gender,address,patient_notes,initial_chief_complaint,created_at,allergies,emergency_contact_name,emergency_contact_phone,blood_group,ongoing_conditions,tags,patient_code"
    )
    .single();
  if (error) {
    jsonErrorDb(res, "patient_create", error);
    return;
  }
  const row = data as {
    id: string;
    name: string;
    phone: string | null;
    language_preference: string | null;
    age: number | null;
    gender: string | null;
    address: string | null;
    patient_notes: string | null;
    initial_chief_complaint: string | null;
    created_at: string;
    allergies?: string | null;
    emergency_contact_name?: string | null;
    emergency_contact_phone?: string | null;
    blood_group?: string | null;
    ongoing_conditions?: string | null;
    tags?: string[] | null;
    patient_code?: string | null;
  };
  jsonSuccess(res, 201, {
    id: row.id,
    patientCode: row.patient_code ?? undefined,
    name: row.name,
    phone: row.phone,
    languagePreference: row.language_preference,
    age: row.age,
    gender: row.gender ?? undefined,
    address: row.address ?? undefined,
    patientNotes: row.patient_notes ?? undefined,
    initialChiefComplaint: row.initial_chief_complaint,
    allergies: row.allergies ?? undefined,
    emergencyContactName: row.emergency_contact_name ?? undefined,
    emergencyContactPhone: row.emergency_contact_phone ?? undefined,
    bloodGroup: row.blood_group ?? undefined,
    ongoingConditions: row.ongoing_conditions ?? undefined,
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : undefined,
    createdAt: row.created_at
  });
});

app.post("/doctor/consultations", authRequired, requireAppRoles(["DOCTOR", "SUPER_ADMIN"]), async (req, res) => {
  const claims = (req as express.Request & { user: AuthClaims }).user;
  const clinicId = resolveClinicScope(req, claims, res);
  if (!clinicId) return;
  const parsed = z
    .object({
      patientId: z.string().uuid(),
      type: z.enum(["INITIAL", "FOLLOW_UP"]),
      recordingEnabled: z.boolean().default(false),
      complexity: z.enum(["SIMPLE", "STANDARD", "COMPLEX", "URGENT"]).default("STANDARD"),
      appointmentId: z.string().uuid().optional(),
      consultationMode: z.enum(["IN_CLINIC", "ONLINE"]).default("IN_CLINIC")
    })
    .safeParse(req.body);
  if (!parsed.success) {
    jsonError(res, 400, "Invalid request", { code: "VALIDATION_ERROR", details: parsed.error.flatten() });
    return;
  }
  const client = getDb(claims);
  const visitCode = await allocateVisitCode(client, clinicId);
  const { data, error } = await client
    .from("consultations")
    .insert({
      id: uuid(),
      clinic_id: clinicId,
      patient_id: parsed.data.patientId,
      visit_code: visitCode,
      type: parsed.data.type,
      recording_enabled: parsed.data.recordingEnabled,
      started_at: new Date().toISOString(),
      attending_user_id: claims.userId,
      complexity: parsed.data.complexity,
      appointment_id: parsed.data.appointmentId ?? null,
      consultation_mode: parsed.data.consultationMode
    })
    .select("id,clinic_id,patient_id,type,recording_enabled,started_at,complexity,appointment_id,consultation_mode,visit_code")
    .single();
  if (error) {
    jsonErrorDb(res, "consultation_create", error);
    return;
  }

  const created = data as {
    id: string;
    patient_id: string;
    consultation_mode: string;
    recording_enabled: boolean;
  };

  let meeting: Record<string, unknown> | null = null;
  if (parsed.data.consultationMode === "ONLINE") {
    try {
      const { data: profile } = await client.from("profiles").select("full_name").eq("id", claims.userId).maybeSingle();
      meeting = await provisionVideoSession({
        client,
        admin: supabaseAdmin,
        clinicId,
        consultationId: created.id,
        patientId: created.patient_id,
        doctorDisplayName: (profile as { full_name?: string } | null)?.full_name ?? "Doctor",
        recordingEnabled: parsed.data.recordingEnabled
      });
    } catch (e) {
      logger.warn("online_consult_provision_failed", {
        message: e instanceof Error ? e.message : String(e)
      });
    }
  }

  jsonSuccess(res, 201, { ...created, meeting });
});

app.get("/doctor/consultations/:id", authRequired, requireAppRoles(["DOCTOR", "SUPER_ADMIN"]), async (req, res) => {
  const claims = (req as express.Request & { user: AuthClaims }).user;
  const clinicId = resolveClinicScope(req, claims, res);
  if (!clinicId) return;
  const client = getDb(claims);
  const { data: row, error } = await client
    .from("consultations")
    .select(
      "id,patient_id,type,recording_enabled,started_at,ended_at,transcript_text,transcript_confidence,note_draft,note_final,complexity,appointment_id,consultation_mode,lifecycle_status,clinical_record,clinical_record_version,advice,follow_up_recommended_at,follow_up_note,symptoms_to_monitor,editing_locked,finalized_at,visit_code"
    )
    .eq("id", req.params.id)
    .eq("clinic_id", clinicId)
    .maybeSingle();
  if (error) {
    jsonErrorDb(res, "consultation_get", error);
    return;
  }
  if (!row) {
    jsonError(res, 404, "Consultation not found", { code: "NOT_FOUND" });
    return;
  }
  const { data: patient, error: pError } = await client
    .from("patients")
    .select("id,name,age,gender,address,phone,patient_notes,initial_chief_complaint,language_preference,allergies,blood_group,ongoing_conditions,patient_code")
    .eq("id", row.patient_id)
    .eq("clinic_id", clinicId)
    .maybeSingle();
  if (pError) {
    jsonErrorDb(res, "consultation_get_patient", pError);
    return;
  }
  const { data: priorVisit } = await client
    .from("consultations")
    .select("ended_at")
    .eq("patient_id", row.patient_id)
    .eq("clinic_id", clinicId)
    .not("ended_at", "is", null)
    .neq("id", row.id)
    .order("ended_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: rxRow } = await client
    .from("prescriptions")
    .select("id,items,created_at")
    .eq("consultation_id", row.id)
    .eq("clinic_id", clinicId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const rx = rxRow as { id: string; items: unknown; created_at: string } | null;
  const ext = row as {
    lifecycle_status?: string;
    clinical_record?: unknown;
    clinical_record_version?: number;
    advice?: unknown;
    follow_up_recommended_at?: string | null;
    follow_up_note?: string | null;
    symptoms_to_monitor?: string[] | null;
    editing_locked?: boolean;
    finalized_at?: string | null;
    visit_code?: string | null;
  };
  const pat = patient as {
    name?: string;
    age?: number | null;
    gender?: string | null;
    address?: string | null;
    phone?: string | null;
    patient_notes?: string | null;
    initial_chief_complaint?: string | null;
    allergies?: string | null;
    blood_group?: string | null;
    ongoing_conditions?: string | null;
    patient_code?: string | null;
  } | null;

  let pendingPriorOutcome: { consultationId: string; endedAt: string; summary: string } | null = null;
  let lastCaseOutcome: { outcome: string; documentedAt: string; assessment?: string } | null = null;
  const { data: endedForOutcome } = await client
    .from("consultations")
    .select("id,ended_at,note_final")
    .eq("patient_id", row.patient_id)
    .eq("clinic_id", clinicId)
    .not("ended_at", "is", null)
    .not("note_final", "is", null)
    .neq("id", row.id)
    .order("ended_at", { ascending: false })
    .limit(10);
  if (endedForOutcome && endedForOutcome.length > 0) {
    const cIds = endedForOutcome.map((c) => (c as { id: string }).id);
    const { data: ocRows } = await client
      .from("case_outcomes")
      .select("consultation_id")
      .eq("clinic_id", clinicId)
      .in("consultation_id", cIds);
    const withOutcome = new Set((ocRows ?? []).map((o) => (o as { consultation_id: string }).consultation_id));
    for (const c of endedForOutcome) {
      const cr = c as { id: string; ended_at: string; note_final: unknown };
      if (withOutcome.has(cr.id)) continue;
      const nf = cr.note_final as Record<string, unknown> | null;
      const cc = nf?.chiefComplaints ?? nf?.chief_complaints;
      const summary =
        typeof cc === "string" && cc.trim()
          ? cc.length > 160
            ? `${cc.slice(0, 160)}…`
            : cc
          : "Document outcome";
      pendingPriorOutcome = { consultationId: cr.id, endedAt: cr.ended_at, summary };
      break;
    }
  }
  const { data: lastOcRow } = await client
    .from("case_outcomes")
    .select("outcome,documented_at,assessment")
    .eq("patient_id", row.patient_id)
    .eq("clinic_id", clinicId)
    .order("documented_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastOcRow) {
    const lo = lastOcRow as { outcome: string; documented_at: string; assessment: string | null };
    lastCaseOutcome = {
      outcome: lo.outcome,
      documentedAt: lo.documented_at,
      assessment: lo.assessment ?? undefined
    };
  }

  jsonSuccess(res, 200, {
    id: row.id,
    visitCode: ext.visit_code ?? null,
    patientId: row.patient_id,
    patientCode: pat?.patient_code ?? null,
    patientName: pat?.name ?? "Patient",
    patientAge: pat?.age ?? null,
    patientGender: pat?.gender ?? null,
    patientAddress: pat?.address ?? null,
    patientPhone: pat?.phone ?? null,
    patientNotes: pat?.patient_notes ?? null,
    patientInitialComplaint: pat?.initial_chief_complaint ?? null,
    patientAllergies: pat?.allergies ?? null,
    patientBloodGroup: pat?.blood_group ?? null,
    patientOngoingConditions: pat?.ongoing_conditions ?? null,
    lastVisitAt:
      (priorVisit as { ended_at?: string } | null)?.ended_at != null
        ? new Date((priorVisit as { ended_at: string }).ended_at).toISOString()
        : null,
    type: row.type,
    recordingEnabled: row.recording_enabled,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    transcriptText: row.transcript_text,
    transcriptConfidence: row.transcript_confidence,
    noteDraft: row.note_draft,
    noteFinal: row.note_final,
    complexity: (row as { complexity?: string }).complexity ?? "STANDARD",
    appointmentId: (row as { appointment_id?: string | null }).appointment_id ?? null,
    consultationMode: (row as { consultation_mode?: string }).consultation_mode ?? "IN_CLINIC",
    lifecycleStatus: ext.lifecycle_status ?? "ACTIVE",
    clinicalRecord: ext.clinical_record ?? {},
    clinicalRecordVersion: ext.clinical_record_version ?? 0,
    advice: ext.advice ?? { diet: "", lifestyle: "" },
    followUpRecommendedAt: ext.follow_up_recommended_at ?? null,
    followUpNote: ext.follow_up_note ?? null,
    symptomsToMonitor: ext.symptoms_to_monitor ?? [],
    editingLocked: Boolean(ext.editing_locked),
    finalizedAt: ext.finalized_at ?? null,
    pendingPriorOutcome,
    lastCaseOutcome,
    prescription: rx
      ? {
          id: rx.id,
          items: rx.items,
          createdAt: rx.created_at
        }
      : null
  });
});

const ConsultationLifecycleSchema = z.enum(["DRAFT", "ACTIVE", "REVIEWING", "FINALIZED"]);

app.patch("/doctor/consultations/:id", authRequired, requireAppRoles(["DOCTOR", "SUPER_ADMIN"]), async (req, res) => {
  const claims = (req as express.Request & { user: AuthClaims }).user;
  const clinicId = resolveClinicScope(req, claims, res);
  if (!clinicId) return;
  const idParse = z.string().uuid().safeParse(req.params.id);
  if (!idParse.success) {
    jsonError(res, 400, "Invalid consultation id", { code: "VALIDATION_ERROR" });
    return;
  }
  const parsed = z
    .object({
      lifecycleStatus: ConsultationLifecycleSchema.optional(),
      consultationMode: z.enum(["IN_CLINIC", "ONLINE"]).optional(),
      noteDraft: NoteDraftPatchSchema.optional(),
      clinicalRecord: ClinicalRecordPatchSchema.optional(),
      advice: AdvicePatchSchema.optional(),
      followUpRecommendedAt: z.string().optional().nullable(),
      followUpNote: z.string().max(4000).optional().nullable(),
      symptomsToMonitor: z.array(z.string().max(200)).max(20).optional()
    })
    .refine((b) => Object.keys(b).length > 0, { message: "Empty patch" })
    .safeParse(req.body);
  if (!parsed.success) {
    jsonError(res, 400, "Invalid request", { code: "VALIDATION_ERROR", details: parsed.error.flatten() });
    return;
  }
  const client = getDb(claims);
  const { data: existing, error: loadErr } = await client
    .from("consultations")
    .select(
      "id,note_draft,clinical_record,clinical_record_version,editing_locked,lifecycle_status,finalized_at"
    )
    .eq("id", idParse.data)
    .eq("clinic_id", clinicId)
    .maybeSingle();
  if (loadErr) {
    jsonErrorDb(res, "consultation_patch_load", loadErr);
    return;
  }
  if (!existing) {
    jsonError(res, 404, "Consultation not found", { code: "NOT_FOUND" });
    return;
  }
  const ex = existing as {
    note_draft: unknown;
    clinical_record: unknown;
    clinical_record_version: number;
    editing_locked: boolean;
    lifecycle_status: string;
    finalized_at: string | null;
  };
  if (Boolean(ex.editing_locked) && ex.lifecycle_status === "FINALIZED") {
    jsonError(res, 409, "This consultation is locked for editing.", { code: "CONSULTATION_LOCKED" });
    return;
  }
  const updates: Record<string, unknown> = {};
  if (parsed.data.lifecycleStatus != null) {
    if (ex.lifecycle_status === "FINALIZED" && parsed.data.lifecycleStatus !== "FINALIZED") {
      jsonError(res, 409, "Cannot reopen a finalized consultation.", { code: "INVALID_TRANSITION" });
      return;
    }
    updates.lifecycle_status = parsed.data.lifecycleStatus;
  }
  if (parsed.data.consultationMode != null) {
    updates.consultation_mode = parsed.data.consultationMode;
  }
  if (parsed.data.noteDraft) {
    const prev = (ex.note_draft && typeof ex.note_draft === "object" ? ex.note_draft : {}) as Record<string, unknown>;
    updates.note_draft = { ...prev, ...parsed.data.noteDraft };
  }
  if (parsed.data.clinicalRecord) {
    updates.clinical_record = mergeClinicalRecordPatch(ex.clinical_record, parsed.data.clinicalRecord);
    updates.clinical_record_version = (ex.clinical_record_version ?? 0) + 1;
    updates.draft_autosaved_at = new Date().toISOString();
  }
  if (parsed.data.advice) {
    updates.advice = parsed.data.advice;
  }
  if (parsed.data.followUpRecommendedAt !== undefined) {
    updates.follow_up_recommended_at = parsed.data.followUpRecommendedAt;
  }
  if (parsed.data.followUpNote !== undefined) {
    updates.follow_up_note = parsed.data.followUpNote;
  }
  if (parsed.data.symptomsToMonitor !== undefined) {
    updates.symptoms_to_monitor = parsed.data.symptomsToMonitor;
  }
  const { data: updated, error: upErr } = await client
    .from("consultations")
    .update(updates)
    .eq("id", idParse.data)
    .eq("clinic_id", clinicId)
    .select("lifecycle_status,clinical_record_version,note_draft,clinical_record,advice,follow_up_recommended_at,follow_up_note,symptoms_to_monitor")
    .maybeSingle();
  if (upErr) {
    jsonErrorDb(res, "consultation_patch", upErr);
    return;
  }
  jsonSuccess(res, 200, {
    lifecycleStatus: (updated as { lifecycle_status: string }).lifecycle_status,
    clinicalRecordVersion: (updated as { clinical_record_version: number }).clinical_record_version,
    noteDraft: (updated as { note_draft: unknown }).note_draft,
    clinicalRecord: (updated as { clinical_record: unknown }).clinical_record,
    advice: (updated as { advice: unknown }).advice,
    followUpRecommendedAt: (updated as { follow_up_recommended_at: string | null }).follow_up_recommended_at,
    followUpNote: (updated as { follow_up_note: string | null }).follow_up_note,
    symptomsToMonitor: (updated as { symptoms_to_monitor: string[] | null }).symptoms_to_monitor ?? []
  });
});

app.post("/doctor/consultations/:id/end", authRequired, requireAppRoles(["DOCTOR", "SUPER_ADMIN"]), async (req, res) => {
  const claims = (req as express.Request & { user: AuthClaims }).user;
  const clinicId = resolveClinicScope(req, claims, res);
  if (!clinicId) return;
  const client = getDb(claims);
  const { data, error } = await client
    .from("consultations")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", req.params.id)
    .eq("clinic_id", clinicId)
    .select("id")
    .single();
  if (error) {
    jsonErrorDb(res, "consultation_end", error);
    return;
  }
  jsonSuccess(res, 200, { id: data.id });
});

app.post("/doctor/consultations/:id/finalize-note", authRequired, requireAppRoles(["DOCTOR", "SUPER_ADMIN"]), async (req, res) => {
  const claims = (req as express.Request & { user: AuthClaims }).user;
  const clinicId = resolveClinicScope(req, claims, res);
  if (!clinicId) return;
  const parsed = z
    .object({
      chiefComplaints: z.string().max(200000).default(""),
      emotionalState: z.string().max(200000).default(""),
      physicalSymptoms: z.string().max(200000).default(""),
      modalities: z.string().max(200000).default(""),
      timeline: z.string().max(200000).default("")
    })
    .safeParse(req.body);
  if (!parsed.success) {
    jsonError(res, 400, "Invalid request", { code: "VALIDATION_ERROR", details: parsed.error.flatten() });
    return;
  }
  const noteFinal = {
    ...parsed.data,
    finalizedBy: claims.userId,
    finalizedAt: new Date().toISOString()
  };
  const client = getDb(claims);
  const { error } = await client
    .from("consultations")
    .update({ note_final: noteFinal })
    .eq("id", req.params.id)
    .eq("clinic_id", clinicId);
  if (error) {
    jsonErrorDb(res, "consultation_finalize_note", error);
    return;
  }
  jsonSuccess(res, 200, noteFinal);
});

/** Mark consultation ended. Optional body finalizes lifecycle, lock, and follow-up hints. Idempotent if already ended. */
app.post("/doctor/consultations/:id/complete", authRequired, requireAppRoles(["DOCTOR", "SUPER_ADMIN"]), async (req, res) => {
  const claims = (req as express.Request & { user: AuthClaims }).user;
  const clinicId = resolveClinicScope(req, claims, res);
  if (!clinicId) return;
  const idParse = z.string().uuid().safeParse(req.params.id);
  if (!idParse.success) {
    jsonError(res, 400, "Invalid consultation id", { code: "VALIDATION_ERROR" });
    return;
  }
  const bodyParse = z
    .object({
      finalize: z.boolean().optional(),
      lockEditing: z.boolean().optional(),
      followUpRecommendedAt: z.string().optional().nullable(),
      followUpNote: z.string().max(4000).optional().nullable(),
      symptomsToMonitor: z.array(z.string().max(200)).max(20).optional(),
      distribute: z
        .object({
          sendEmail: z.boolean().optional(),
          sendWhatsApp: z.boolean().optional(),
          notifyEmail: z.string().email().optional().nullable()
        })
        .optional(),
      createFollowUp: z
        .object({
          dueAt: z.string().refine((s) => !Number.isNaN(Date.parse(s)), "Invalid date"),
          reason: z.string().min(1).max(2000),
          symptomsToMonitor: z.array(z.string().max(200)).max(20).optional()
        })
        .optional()
    })
    .safeParse(req.body ?? {});
  if (!bodyParse.success) {
    jsonError(res, 400, "Invalid request", { code: "VALIDATION_ERROR", details: bodyParse.error.flatten() });
    return;
  }
  const client = getDb(claims);
  const { data: row, error: loadErr } = await client
    .from("consultations")
    .select("id,ended_at,patient_id,lifecycle_status,finalized_at")
    .eq("id", idParse.data)
    .eq("clinic_id", clinicId)
    .maybeSingle();
  if (loadErr) {
    jsonErrorDb(res, "consultation_complete_load", loadErr);
    return;
  }
  if (!row) {
    jsonError(res, 404, "Consultation not found", { code: "NOT_FOUND" });
    return;
  }
  const rw = row as {
    id: string;
    ended_at: string | null;
    patient_id: string;
    lifecycle_status?: string;
    finalized_at?: string | null;
  };
  const fin = bodyParse.data;
  const nowIso = new Date().toISOString();

  if (rw.ended_at) {
    if (fin.finalize && rw.lifecycle_status !== "FINALIZED") {
      const updatesDone: Record<string, unknown> = {
        lifecycle_status: "FINALIZED",
        finalized_at: nowIso,
        editing_locked: fin.lockEditing ?? false
      };
      if (fin.followUpRecommendedAt !== undefined) {
        updatesDone.follow_up_recommended_at = fin.followUpRecommendedAt;
      }
      if (fin.followUpNote !== undefined) {
        updatesDone.follow_up_note = fin.followUpNote;
      }
      if (fin.symptomsToMonitor !== undefined) {
        updatesDone.symptoms_to_monitor = fin.symptomsToMonitor;
      }
      const { error: upDone } = await client
        .from("consultations")
        .update(updatesDone)
        .eq("id", idParse.data)
        .eq("clinic_id", clinicId);
      if (upDone) {
        jsonErrorDb(res, "consultation_complete_finalize_after_end", upDone);
        return;
      }
      if (fin.createFollowUp) {
        const title =
          fin.createFollowUp.reason.length > 120
            ? `${fin.createFollowUp.reason.slice(0, 117)}…`
            : fin.createFollowUp.reason;
        const { error: fuErr } = await client.from("follow_ups").insert({
          id: uuid(),
          clinic_id: clinicId,
          patient_id: rw.patient_id,
          consultation_id: idParse.data,
          title,
          reason: fin.createFollowUp.reason,
          due_at: fin.createFollowUp.dueAt,
          doctor_id: claims.userId,
          status: "PENDING",
          symptoms_to_monitor:
            fin.createFollowUp.symptomsToMonitor ?? fin.symptomsToMonitor ?? null
        });
        if (fuErr) {
          jsonErrorDb(res, "consultation_complete_followup_after_end", fuErr);
          return;
        }
      }
    }
    let distribution = null;
    if (fin.finalize) {
      distribution = await runConsultationFinalizeSideEffects({
        admin: supabaseAdmin,
        client,
        clinicId,
        consultationId: idParse.data,
        patientId: rw.patient_id,
        doctorId: claims.userId,
        actorRole: claims.role,
        followUpRecommendedAt: fin.followUpRecommendedAt ?? null,
        followUpNote: fin.followUpNote ?? null,
        distribute: fin.distribute
      });
    }
    jsonSuccess(res, 200, { ok: true, alreadyEnded: true, distribution });
    return;
  }

  const updates: Record<string, unknown> = { ended_at: nowIso };
  if (fin.finalize) {
    updates.lifecycle_status = "FINALIZED";
    updates.finalized_at = nowIso;
    updates.editing_locked = fin.lockEditing ?? false;
    if (fin.followUpRecommendedAt !== undefined) {
      updates.follow_up_recommended_at = fin.followUpRecommendedAt;
    }
    if (fin.followUpNote !== undefined) {
      updates.follow_up_note = fin.followUpNote;
    }
    if (fin.symptomsToMonitor !== undefined) {
      updates.symptoms_to_monitor = fin.symptomsToMonitor;
    }
  }
  const { error: upErr } = await client.from("consultations").update(updates).eq("id", idParse.data).eq("clinic_id", clinicId);
  if (upErr) {
    jsonErrorDb(res, "consultation_complete_update", upErr);
    return;
  }
  void refreshPatientMetrics(client, rw.patient_id);
  if (fin.finalize && fin.createFollowUp) {
    const title =
      fin.createFollowUp.reason.length > 120
        ? `${fin.createFollowUp.reason.slice(0, 117)}…`
        : fin.createFollowUp.reason;
    const { error: fuErr } = await client.from("follow_ups").insert({
      id: uuid(),
      clinic_id: clinicId,
      patient_id: rw.patient_id,
      consultation_id: idParse.data,
      title,
      reason: fin.createFollowUp.reason,
      due_at: fin.createFollowUp.dueAt,
      doctor_id: claims.userId,
      status: "PENDING",
      symptoms_to_monitor:
        fin.createFollowUp.symptomsToMonitor ?? fin.symptomsToMonitor ?? null
    });
    if (fuErr) {
      jsonErrorDb(res, "consultation_complete_followup", fuErr);
      return;
    }
  }
  let distribution = null;
  if (fin.finalize) {
    distribution = await runConsultationFinalizeSideEffects({
      admin: supabaseAdmin,
      client,
      clinicId,
      consultationId: idParse.data,
      patientId: rw.patient_id,
      doctorId: claims.userId,
      actorRole: claims.role,
      followUpRecommendedAt: fin.followUpRecommendedAt ?? null,
      followUpNote: fin.followUpNote ?? null,
      distribute: fin.distribute
    });
  }
  jsonSuccess(res, 200, { ok: true, alreadyEnded: false, distribution });
});

/** Signed URL for stored prescription PDF/HTML (Patient App + doctor re-download). */
app.get(
  "/doctor/consultations/:id/prescription-download",
  authRequired,
  requireAppRoles(["DOCTOR", "SUPER_ADMIN"]),
  async (req, res) => {
    const claims = (req as express.Request & { user: AuthClaims }).user;
    const clinicId = resolveClinicScope(req, claims, res);
    if (!clinicId) return;
    const idParse = z.string().uuid().safeParse(req.params.id);
    if (!idParse.success) {
      jsonError(res, 400, "Invalid consultation id", { code: "VALIDATION_ERROR" });
      return;
    }
    const client = getDb(claims);
    const { data: row, error: loadErr } = await client
      .from("consultations")
      .select("id,pdf_object_id,pdf_ready")
      .eq("id", idParse.data)
      .eq("clinic_id", clinicId)
      .maybeSingle();
    if (loadErr) {
      jsonErrorDb(res, "prescription_download_load", loadErr);
      return;
    }
    if (!row) {
      jsonError(res, 404, "Consultation not found", { code: "NOT_FOUND" });
      return;
    }
    const pdfObjectId = (row as { pdf_object_id?: string | null }).pdf_object_id;
    if (!pdfObjectId) {
      jsonError(res, 404, "Prescription not yet generated", { code: "NOT_FOUND" });
      return;
    }
    const { data: media, error: mediaErr } = await client
      .from("media_objects")
      .select("storage_object_key,mime_type,size_bytes")
      .eq("id", pdfObjectId)
      .eq("clinic_id", clinicId)
      .maybeSingle();
    if (mediaErr) {
      jsonErrorDb(res, "prescription_download_media", mediaErr);
      return;
    }
    const objectKey = (media as { storage_object_key?: string } | null)?.storage_object_key;
    if (!objectKey || objectKey.startsWith("inline:")) {
      jsonError(res, 503, "Prescription file is not available in storage", { code: "STORAGE_UNAVAILABLE" });
      return;
    }
    if (!objectKey.startsWith(`clinics/${clinicId}/`)) {
      jsonError(res, 403, "Object key is outside clinic tenant scope", { code: "TENANT_SCOPE" });
      return;
    }
    try {
      const downloadUrl = await createDownloadUrl(objectKey);
      jsonSuccess(res, 200, {
        downloadUrl,
        expiresInSeconds: 900,
        mimeType: (media as { mime_type?: string }).mime_type ?? "application/pdf"
      });
    } catch (e) {
      logAndSanitizeError("prescription_download", e);
      jsonError(res, 503, "Download is not available. Please try again later.", { code: "STORAGE_UNAVAILABLE" });
    }
  }
);

app.post("/doctor/prescriptions", authRequired, requireAppRoles(["DOCTOR", "SUPER_ADMIN"]), async (req, res) => {
  const claims = (req as express.Request & { user: AuthClaims }).user;
  const clinicId = resolveClinicScope(req, claims, res);
  if (!clinicId) return;
  const legacyLine = z.object({
    doctorVisibleRemedy: z.string().min(1),
    patientVisibleCode: z.string().min(1),
    dosageInstruction: z.string().min(1)
  });
  const structuredLine = z.object({
    remedyName: z.string().min(1).max(500),
    potency: z.string().min(1).max(200),
    dosage: z.string().min(1).max(500),
    frequency: z.string().min(1).max(300),
    duration: z.string().min(1).max(300),
    instructions: z.string().min(1).max(2000)
  });
  const parsed = z.object({
    patientId: z.string().uuid(),
    consultationId: z.string().uuid(),
    items: z
      .array(z.union([structuredLine, legacyLine]))
      .min(1)
      .transform((rows) =>
        rows.map((r) =>
          "remedyName" in r
            ? r
            : {
                remedyName: r.doctorVisibleRemedy,
                potency: r.patientVisibleCode,
                dosage: r.dosageInstruction.split(" · ")[0] ?? r.dosageInstruction,
                frequency: "—",
                duration: "—",
                instructions: r.dosageInstruction
              }
        )
      )
  }).safeParse(req.body);
  if (!parsed.success) {
    jsonError(res, 400, "Invalid request", { code: "VALIDATION_ERROR", details: parsed.error.flatten() });
    return;
  }
  const client = getDb(claims);
  const { data, error } = await client
    .from("prescriptions")
    .insert({
      id: uuid(),
      clinic_id: clinicId,
      patient_id: parsed.data.patientId,
      consultation_id: parsed.data.consultationId,
      items: parsed.data.items
    })
    .select("id")
    .single();
  if (error) {
    jsonErrorDb(res, "prescription_create", error);
    return;
  }
  jsonSuccess(res, 201, { id: data.id });
});

app.patch("/doctor/prescriptions/:id", authRequired, requireAppRoles(["DOCTOR", "SUPER_ADMIN"]), async (req, res) => {
  const claims = (req as express.Request & { user: AuthClaims }).user;
  const clinicId = resolveClinicScope(req, claims, res);
  if (!clinicId) return;
  const idParse = z.string().uuid().safeParse(req.params.id);
  if (!idParse.success) {
    jsonError(res, 400, "Invalid prescription id", { code: "VALIDATION_ERROR" });
    return;
  }
  const legacyLine = z.object({
    doctorVisibleRemedy: z.string().min(1),
    patientVisibleCode: z.string().min(1),
    dosageInstruction: z.string().min(1)
  });
  const structuredLine = z.object({
    remedyName: z.string().min(1).max(500),
    potency: z.string().min(1).max(200),
    dosage: z.string().min(1).max(500),
    frequency: z.string().min(1).max(300),
    duration: z.string().min(1).max(300),
    instructions: z.string().min(1).max(2000)
  });
  const parsed = z
    .object({
      items: z
        .array(z.union([structuredLine, legacyLine]))
        .min(1)
        .transform((rows) =>
          rows.map((r) =>
            "remedyName" in r
              ? r
              : {
                  remedyName: r.doctorVisibleRemedy,
                  potency: r.patientVisibleCode,
                  dosage: r.dosageInstruction.split(" · ")[0] ?? r.dosageInstruction,
                  frequency: "—",
                  duration: "—",
                  instructions: r.dosageInstruction
                }
          )
        )
    })
    .safeParse(req.body);
  if (!parsed.success) {
    jsonError(res, 400, "Invalid request", { code: "VALIDATION_ERROR", details: parsed.error.flatten() });
    return;
  }
  const client = getDb(claims);
  const { data: row, error: loadErr } = await client
    .from("prescriptions")
    .select("id,consultation_id")
    .eq("id", idParse.data)
    .eq("clinic_id", clinicId)
    .maybeSingle();
  if (loadErr) {
    jsonErrorDb(res, "prescription_patch_load", loadErr);
    return;
  }
  if (!row) {
    jsonError(res, 404, "Prescription not found", { code: "NOT_FOUND" });
    return;
  }
  const { data: cons } = await client
    .from("consultations")
    .select("editing_locked,lifecycle_status")
    .eq("id", (row as { consultation_id: string }).consultation_id)
    .eq("clinic_id", clinicId)
    .maybeSingle();
  const c = cons as { editing_locked?: boolean; lifecycle_status?: string } | null;
  if (c?.lifecycle_status === "FINALIZED" && Boolean(c?.editing_locked)) {
    jsonError(res, 409, "Prescription is locked.", { code: "PRESCRIPTION_LOCKED" });
    return;
  }
  const { error: upErr } = await client
    .from("prescriptions")
    .update({ items: parsed.data.items })
    .eq("id", idParse.data)
    .eq("clinic_id", clinicId);
  if (upErr) {
    jsonErrorDb(res, "prescription_patch", upErr);
    return;
  }
  jsonSuccess(res, 200, { id: idParse.data });
});

app.post("/storage/presign-upload", authRequired, requireAppRoles(["DOCTOR", "SUPER_ADMIN"]), async (req, res) => {
  const claims = (req as express.Request & { user: AuthClaims }).user;
  const clinicId = resolveClinicScope(req, claims, res);
  if (!clinicId) return;
  const parsed = z.object({
    category: z.enum(["audio", "document"]),
    filename: z.string().min(1),
    contentType: z.string().min(1)
  }).safeParse(req.body);
  if (!parsed.success) {
    jsonError(res, 400, "Invalid request", { code: "VALIDATION_ERROR", details: parsed.error.flatten() });
    return;
  }
  const objectKey = buildObjectKey(clinicId, parsed.data.category, parsed.data.filename);
  try {
    const uploadUrl = await createUploadUrl(objectKey, parsed.data.contentType);
    jsonSuccess(res, 200, { uploadUrl, objectKey, expiresInSeconds: 300 });
  } catch (e) {
    logAndSanitizeError("presign_upload", e);
    jsonError(res, 503, "Upload is not available. Please try again later.", { code: "STORAGE_UNAVAILABLE" });
  }
});

app.post("/storage/complete-upload", authRequired, requireAppRoles(["DOCTOR", "SUPER_ADMIN"]), async (req, res) => {
  const claims = (req as express.Request & { user: AuthClaims }).user;
  const clinicId = resolveClinicScope(req, claims, res);
  if (!clinicId) return;
  const parsed = z.object({
    objectKey: z.string().min(1),
    category: z.enum(["audio", "document"]),
    consultationId: z.string().uuid().optional(),
    patientId: z.string().uuid().optional()
  }).safeParse(req.body);
  if (!parsed.success) {
    jsonError(res, 400, "Invalid request", { code: "VALIDATION_ERROR", details: parsed.error.flatten() });
    return;
  }
  if (!parsed.data.objectKey.startsWith(`clinics/${clinicId}/`)) {
    jsonError(res, 403, "Object key is outside clinic tenant scope", { code: "TENANT_SCOPE" });
    return;
  }
  const client = getDb(claims);
  if (parsed.data.patientId) {
    const { data: pat } = await client
      .from("patients")
      .select("id")
      .eq("id", parsed.data.patientId)
      .eq("clinic_id", clinicId)
      .maybeSingle();
    if (!pat) {
      jsonError(res, 404, "Patient not found", { code: "NOT_FOUND" });
      return;
    }
  }
  const payload = {
    id: uuid(),
    clinic_id: clinicId,
    category: parsed.data.category,
    object_key: parsed.data.objectKey,
    consultation_id: parsed.data.consultationId ?? null,
    patient_id: parsed.data.patientId ?? null,
    uploaded_by: claims.userId
  };
  const { data, error } = await client.from("file_objects").insert(payload).select("id,object_key").single();
  if (error) {
    jsonErrorDb(res, "storage_complete_upload", error);
    return;
  }
  if (parsed.data.category === "audio" && parsed.data.consultationId) {
    await client
      .from("consultations")
      .update({ audio_object_key: parsed.data.objectKey })
      .eq("id", parsed.data.consultationId)
      .eq("clinic_id", clinicId);
  }
  jsonSuccess(res, 201, data);
});

app.get("/storage/presign-download", authRequired, requireAppRoles(["DOCTOR", "SUPER_ADMIN"]), async (req, res) => {
  const claims = (req as express.Request & { user: AuthClaims }).user;
  const clinicId = resolveClinicScope(req, claims, res);
  if (!clinicId) return;
  const objectKey = String(req.query.objectKey ?? "");
  if (!objectKey.startsWith(`clinics/${clinicId}/`)) {
    jsonError(res, 403, "Object key is outside clinic tenant scope", { code: "TENANT_SCOPE" });
    return;
  }
  try {
    const downloadUrl = await createDownloadUrl(objectKey);
    jsonSuccess(res, 200, { downloadUrl, expiresInSeconds: 900 });
  } catch (e) {
    logAndSanitizeError("presign_download", e);
    jsonError(res, 503, "Download is not available. Please try again later.", { code: "STORAGE_UNAVAILABLE" });
  }
});

app.get("/health", (_req, res) => {
  jsonSuccess(res, 200, { ok: true, service: "homeosync-api", storage: "supabase+s3" });
});

const port = Number(process.env.PORT ?? 4000);
const server = http.createServer(app);
/** Skip binding a port when Vitest loads this module (Supertest uses `app` only). */
if (process.env.VITEST !== "true") {
  void (async () => {
    try {
      await assertRequiredTablesExist(supabaseAdmin);
    } catch (e) {
      logger.error("db_schema_bootstrap_failed", { message: e instanceof Error ? e.message : String(e) });
      process.exit(1);
    }
    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        logger.error("port_in_use", {
          port,
          message: err.message,
          hint: `Port ${port} is already in use. Stop the other API process or set PORT to a free port (e.g. 4001). On Windows: netstat -ano | findstr :${port}`
        });
        process.exit(1);
        return;
      }
      logger.error("server_listen_failed", { message: err.message });
      process.exit(1);
    });
    server.listen(port, () => {
      logger.info("HomeoSync API listening", { port });
      startBackgroundJobs(supabaseAdmin);
    });
  })();
}

export { app };

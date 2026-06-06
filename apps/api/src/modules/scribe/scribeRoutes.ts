import express from "express";
import { z } from "zod";
import type { AuthClaims } from "../../auth";
import { authRequired, requireAppRoles } from "../../auth";
import { getDb } from "../../db";
import { supabaseAdmin } from "../../supabase";
import { resolveClinicScope } from "../../lib/clinicScope";
import { jsonError, jsonSuccess } from "../../lib/apiEnvelope";
import { jsonErrorDb } from "../../lib/safeError";
import { isGeminiConfigured } from "./geminiProvider";
import {
  createAndRunScribeJob,
  getScribeJobs,
  acceptScribeOutput,
  discardScribeOutput,
  aiRepertorize
} from "./scribeService";
import { SCRIBE_SECTIONS, type ScribeSection } from "./scribeTypes";

// ---------------------------------------------------------------------------
// Accept body schema
// ---------------------------------------------------------------------------

const AcceptBodySchema = z.object({
  jobId: z.string().uuid(),
  sections: z
    .array(z.enum(SCRIBE_SECTIONS))
    .min(1, "Select at least one section to accept.")
    .max(SCRIBE_SECTIONS.length)
});

const DiscardBodySchema = z.object({
  jobId: z.string().uuid()
});

// ---------------------------------------------------------------------------
// Route registration
// ---------------------------------------------------------------------------

export function registerScribeRoutes(app: express.Express): void {

  /**
   * POST /doctor/consultations/:id/ai-analyze
   *
   * Triggers an AI analysis of the consultation's current notes.
   * Returns the scribe job with draft_record populated on success.
   */
  app.post(
    "/doctor/consultations/:id/ai-analyze",
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
      const consultationId = idParse.data;
      const client = getDb(claims);

      // Check AI is configured
      if (!isGeminiConfigured()) {
        jsonError(res, 503, "AI Scribe is not available. Contact your administrator.", { code: "AI_NOT_CONFIGURED" });
        return;
      }

      // Load current consultation data
      const { data: consRow, error: consErr } = await client
        .from("consultations")
        .select("id,patient_id,note_draft,clinical_record,editing_locked,lifecycle_status,created_at")
        .eq("id", consultationId)
        .eq("clinic_id", clinicId)
        .maybeSingle();
      if (consErr) {
        jsonErrorDb(res, "ai_analyze_load_consultation", consErr);
        return;
      }
      if (!consRow) {
        jsonError(res, 404, "Consultation not found", { code: "NOT_FOUND" });
        return;
      }
      const cons = consRow as {
        id: string;
        patient_id: string;
        note_draft: Record<string, unknown> | null;
        clinical_record: Record<string, unknown> | null;
        editing_locked: boolean;
        lifecycle_status: string;
        created_at: string;
      };

      if (cons.editing_locked && cons.lifecycle_status === "FINALIZED") {
        jsonError(res, 409, "Cannot analyze a finalized consultation.", { code: "CONSULTATION_LOCKED" });
        return;
      }

      // Load patient context
      const { data: patRow } = await client
        .from("patients")
        .select("age,gender,initial_chief_complaint")
        .eq("id", cons.patient_id)
        .eq("clinic_id", clinicId)
        .maybeSingle();
      const pat = patRow as { age: number | null; gender: string | null; initial_chief_complaint: string | null } | null;

      // Fetch previous finalized consultation for baseline comparison (Phase 4)
      const { data: prevConsRow } = await client
        .from("consultations")
        .select("note_draft,clinical_record")
        .eq("patient_id", cons.patient_id)
        .eq("clinic_id", clinicId)
        .eq("lifecycle_status", "FINALIZED")
        .lt("created_at", cons.created_at)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let previousConsultationSummary: string | null = null;
      if (prevConsRow) {
        const pNd = (prevConsRow.note_draft && typeof prevConsRow.note_draft === "object" ? prevConsRow.note_draft : {}) as Record<string, string>;
        const pCr = (prevConsRow.clinical_record && typeof prevConsRow.clinical_record === "object" ? prevConsRow.clinical_record : {}) as Record<string, unknown>;
        const pCn = (pCr.clinicalNotes && typeof pCr.clinicalNotes === "object" ? pCr.clinicalNotes : {}) as Record<string, string>;
        
        const summaryParts = [
          pNd.chiefComplaints ? `Chief Complaints: ${pNd.chiefComplaints}` : "",
          pNd.physicalSymptoms ? `Physical Symptoms: ${pNd.physicalSymptoms}` : "",
          pCn.observations ? `Observations: ${pCn.observations}` : ""
        ].filter(Boolean);
        
        if (summaryParts.length > 0) {
          previousConsultationSummary = summaryParts.join("\n");
        }
      }

      // Assemble clinical data from consultation
      const nd = (cons.note_draft && typeof cons.note_draft === "object" ? cons.note_draft : {}) as Record<string, string>;
      const cr = (cons.clinical_record && typeof cons.clinical_record === "object" ? cons.clinical_record : {}) as Record<string, unknown>;
      const cn = (cr.clinicalNotes && typeof cr.clinicalNotes === "object" ? cr.clinicalNotes : {}) as Record<string, string>;
      const hist = (cr.history && typeof cr.history === "object" ? cr.history : {}) as Record<string, string>;
      const vit = (cr.vitals && typeof cr.vitals === "object" ? cr.vitals : {}) as Record<string, string>;

      try {
        const result = await createAndRunScribeJob(
          client,
          supabaseAdmin,
          clinicId,
          consultationId,
          claims.userId,
          {
            noteDraft: {
              chiefComplaints: nd.chiefComplaints ?? "",
              emotionalState: nd.emotionalState ?? "",
              physicalSymptoms: nd.physicalSymptoms ?? "",
              modalities: nd.modalities ?? "",
              timeline: nd.timeline ?? ""
            },
            clinicalNotes: {
              observations: cn.observations ?? "",
              diagnosisThinking: cn.diagnosisThinking ?? ""
            },
            history: {
              pastDiseases: hist.pastDiseases ?? "",
              medications: hist.medications ?? "",
              familyHistory: hist.familyHistory ?? "",
              drugAllergies: hist.drugAllergies ?? ""
            },
            vitals: {
              bp: vit.bp ?? "",
              pulse: vit.pulse ?? "",
              temperature: vit.temperature ?? "",
              spO2: vit.spO2 ?? ""
            },
            patientAge: pat?.age ?? null,
            patientGender: pat?.gender ?? null,
            chiefComplaint: pat?.initial_chief_complaint ?? null,
            previousConsultationSummary
          }
        );
        jsonSuccess(res, 201, result);
      } catch (e) {
        const err = e as { message?: string; statusCode?: number; code?: string };
        const status = err.statusCode ?? 500;
        jsonError(res, status, err.message ?? "AI analysis failed", {
          code: err.code ?? "AI_ERROR"
        });
      }
    }
  );

  /**
   * GET /doctor/consultations/:id/ai-jobs
   *
   * Returns recent scribe jobs for a consultation.
   */
  app.get(
    "/doctor/consultations/:id/ai-jobs",
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

      try {
        const jobs = await getScribeJobs(getDb(claims), clinicId, idParse.data);
        jsonSuccess(res, 200, { jobs });
      } catch (e) {
        jsonErrorDb(res, "ai_jobs_list", e);
      }
    }
  );

  /**
   * POST /doctor/consultations/:id/ai-accept
   *
   * Accept AI suggestions: appends selected sections into note_draft / clinical_record.
   */
  app.post(
    "/doctor/consultations/:id/ai-accept",
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
      const bodyParse = AcceptBodySchema.safeParse(req.body);
      if (!bodyParse.success) {
        jsonError(res, 400, "Invalid body", { code: "VALIDATION_ERROR", details: bodyParse.error.flatten() });
        return;
      }

      try {
        await acceptScribeOutput(
          getDb(claims),
          supabaseAdmin,
          clinicId,
          idParse.data,
          claims.userId,
          bodyParse.data.jobId,
          bodyParse.data.sections as ScribeSection[]
        );
        jsonSuccess(res, 200, { accepted: true });
      } catch (e) {
        const err = e as { message?: string; statusCode?: number };
        const status = err.statusCode ?? 500;
        jsonError(res, status, err.message ?? "Failed to accept AI output", { code: "AI_ACCEPT_ERROR" });
      }
    }
  );

  /**
   * POST /doctor/consultations/:id/ai-discard
   *
   * Discard AI output — marks the job as DISCARDED without modifying consultation.
   */
  app.post(
    "/doctor/consultations/:id/ai-discard",
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
      const bodyParse = DiscardBodySchema.safeParse(req.body);
      if (!bodyParse.success) {
        jsonError(res, 400, "Invalid body", { code: "VALIDATION_ERROR", details: bodyParse.error.flatten() });
        return;
      }

      try {
        await discardScribeOutput(
          getDb(claims),
          supabaseAdmin,
          clinicId,
          idParse.data,
          claims.userId,
          bodyParse.data.jobId
        );
        jsonSuccess(res, 200, { discarded: true });
      } catch (e) {
        const err = e as { message?: string; statusCode?: number };
        const status = err.statusCode ?? 500;
        jsonError(res, status, err.message ?? "Failed to discard AI output", { code: "AI_DISCARD_ERROR" });
      }
    }
  );

  /**
   * POST /doctor/consultations/:id/ai-repertorize
   *
   * Run Repertorization Engine using Gemini based on selected rubrics.
   */
  app.post(
    "/doctor/consultations/:id/ai-repertorize",
    authRequired,
    requireAppRoles(["DOCTOR", "SUPER_ADMIN"]),
    express.json(),
    async (req, res) => {
      const claims = (req as express.Request & { user: AuthClaims }).user;
      const clinicId = resolveClinicScope(req, claims, res);
      if (!clinicId) return;

      const idParse = z.string().uuid().safeParse(req.params.id);
      if (!idParse.success) {
        jsonError(res, 400, "Invalid consultation id", { code: "VALIDATION_ERROR" });
        return;
      }

      const rubricsSchema = z.object({
        rubrics: z.array(z.object({
          chapter: z.string(),
          rubric: z.string(),
          intensity: z.number().min(1).max(4)
        })).min(1, "Provide at least one rubric")
      });

      const bodyParse = rubricsSchema.safeParse(req.body);
      if (!bodyParse.success) {
        jsonError(res, 400, "Invalid rubrics payload", { code: "VALIDATION_ERROR", details: bodyParse.error.flatten() });
        return;
      }

      try {
        const result = await aiRepertorize(
          supabaseAdmin,
          clinicId,
          claims.userId,
          idParse.data,
          bodyParse.data.rubrics
        );
        jsonSuccess(res, 200, result);
      } catch (e) {
        const err = e as { message?: string; statusCode?: number; code?: string };
        const status = err.statusCode ?? 500;
        jsonError(res, status, err.message ?? "Failed to repertorize", { code: err.code ?? "REPERTORIZE_ERROR" });
      }
    }
  );
}

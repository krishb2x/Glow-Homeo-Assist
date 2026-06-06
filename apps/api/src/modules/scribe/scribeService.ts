import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "../../config/env";
import { logger } from "../../lib/logger";
import {
  ScribeAnalysisOutputSchema,
  RepertorizationOutputSchema,
  type ScribeAnalysisOutput,
  type RepertorizationOutput,
  type ScribeJobRow,
  type ScribeJobResponse,
  type ScribeSection
} from "./scribeTypes";
import { buildScribePrompt, hasEnoughContentForAnalysis, type ScribePromptInput } from "./scribePrompt";
import { REPERTORY_PROMPT } from "./repertoryPrompt";
import { analyzeWithGemini, isGeminiConfigured } from "./geminiProvider";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jobToResponse(row: ScribeJobRow): ScribeJobResponse {
  return {
    id: row.id,
    status: row.status,
    provider: row.provider,
    draftRecord: row.draft_record,
    errorMessage: row.error_message,
    startedAt: row.started_at,
    endedAt: row.ended_at
  };
}

// ---------------------------------------------------------------------------
// Daily rate limiting
// ---------------------------------------------------------------------------

async function countTodayJobs(client: SupabaseClient, clinicId: string): Promise<number> {
  const d0 = new Date();
  d0.setUTCHours(0, 0, 0, 0);
  const { count, error } = await client
    .from("scribe_jobs")
    .select("id", { count: "exact", head: true })
    .eq("clinic_id", clinicId)
    .gte("started_at", d0.toISOString());
  if (error) {
    logger.warn("scribe_rate_limit_check_failed", { error: error.message });
    return 0;
  }
  return count ?? 0;
}

// ---------------------------------------------------------------------------
// Core service functions
// ---------------------------------------------------------------------------

/**
 * Create and run an AI scribe analysis job.
 *
 * 1. Validates there's enough content to analyze
 * 2. Checks daily rate limit
 * 3. Creates a PENDING scribe_jobs row
 * 4. Runs Gemini analysis
 * 5. Parses & validates output
 * 6. Updates job to DRAFTED (or FAILED on error)
 */
export async function createAndRunScribeJob(
  client: SupabaseClient,
  admin: SupabaseClient,
  clinicId: string,
  consultationId: string,
  doctorId: string,
  consultation: {
    noteDraft: ScribePromptInput["noteDraft"];
    clinicalNotes: ScribePromptInput["clinicalNotes"];
    history: ScribePromptInput["history"];
    vitals: ScribePromptInput["vitals"];
    patientAge: number | null;
    patientGender: string | null;
    chiefComplaint: string | null;
    previousConsultationSummary: string | null;
  }
): Promise<ScribeJobResponse> {
  // Guard: Gemini configured?
  if (!isGeminiConfigured()) {
    throw Object.assign(new Error("AI Scribe is not configured on this server."), { statusCode: 503 });
  }

  // Guard: enough content?
  const promptInput: ScribePromptInput = {
    patientAge: consultation.patientAge,
    patientGender: consultation.patientGender,
    chiefComplaint: consultation.chiefComplaint,
    noteDraft: consultation.noteDraft,
    clinicalNotes: consultation.clinicalNotes,
    history: consultation.history,
    vitals: consultation.vitals,
    previousConsultationSummary: consultation.previousConsultationSummary,
    aiScribeInstructions: null // populated below
  };
  
  // Phase 7: Fetch doctor's custom instructions
  const { data: profile } = await client
    .from("profiles")
    .select("id") // removed ai_scribe_instructions
    .eq("id", doctorId)
    .maybeSingle();
    
  if (profile && typeof (profile as any).ai_scribe_instructions === "string") {
    // promptInput.aiScribeInstructions = (profile as any).ai_scribe_instructions.trim();
  }

  if (!hasEnoughContentForAnalysis(promptInput)) {
    throw Object.assign(
      new Error("Not enough clinical content for analysis. Add more detail to your notes before using AI Analyze."),
      { statusCode: 422 }
    );
  }

  // Guard: daily rate limit
  const todayCount = await countTodayJobs(client, clinicId);
  if (todayCount >= env.SCRIBE_DAILY_LIMIT_PER_CLINIC) {
    throw Object.assign(
      new Error(`Daily AI analysis limit reached (${env.SCRIBE_DAILY_LIMIT_PER_CLINIC}). Try again tomorrow.`),
      { statusCode: 429 }
    );
  }

  // Build prompt
  const prompt = buildScribePrompt(promptInput);

  // Create PENDING job
  const { data: jobRow, error: insertErr } = await client
    .from("scribe_jobs")
    .insert({
      clinic_id: clinicId,
      consultation_id: consultationId,
      doctor_id: doctorId,
      status: "PENDING",
      provider: "gemini",
      prompt_template: "v1_homeo_clinical"
    })
    .select("id,clinic_id,consultation_id,doctor_id,status,provider,prompt_template,draft_record,error_code,error_message,started_at,ended_at")
    .single();
  if (insertErr || !jobRow) {
    logger.error("scribe_job_insert_failed", { error: insertErr?.message });
    throw new Error("Failed to create AI analysis job.");
  }
  const job = jobRow as ScribeJobRow;

  // Update to STREAMING
  await client
    .from("scribe_jobs")
    .update({ status: "STREAMING" })
    .eq("id", job.id);

  try {
    // Run Gemini analysis
    const { text, tokensUsed } = await analyzeWithGemini(prompt);

    // Parse and validate output
    let parsed: ScribeAnalysisOutput;
    try {
      const raw = JSON.parse(text);
      const result = ScribeAnalysisOutputSchema.safeParse(raw);
      if (!result.success) {
        logger.warn("scribe_output_validation_failed", {
          jobId: job.id,
          errors: result.error.flatten()
        });
        // Try to salvage what we can
        parsed = ScribeAnalysisOutputSchema.parse({});
        const keys = Object.keys(raw) as Array<keyof ScribeAnalysisOutput>;
        for (const key of keys) {
          if (key in parsed && typeof raw[key] === typeof parsed[key]) {
            (parsed as Record<string, unknown>)[key] = raw[key];
          }
        }
      } else {
        parsed = result.data;
      }
    } catch {
      throw Object.assign(new Error("AI returned invalid JSON."), { code: "PARSE_ERROR" });
    }

    // Update job to DRAFTED with the parsed output
    const { data: updatedRow, error: updateErr } = await client
      .from("scribe_jobs")
      .update({
        status: "DRAFTED",
        draft_record: parsed,
        ended_at: new Date().toISOString()
      })
      .eq("id", job.id)
      .select("id,clinic_id,consultation_id,doctor_id,status,provider,prompt_template,draft_record,error_code,error_message,started_at,ended_at")
      .single();

    if (updateErr) {
      logger.error("scribe_job_update_drafted_failed", { jobId: job.id, error: updateErr.message });
    }

    // Audit log
    try {
      await admin
        .schema("audit")
        .from("events")
        .insert({
          event_type: "scribe.analyzed",
          actor_id: doctorId,
          clinic_id: clinicId,
          entity_type: "consultation",
          entity_id: consultationId,
          payload: {
            scribe_job_id: job.id,
            provider: "gemini",
            model: env.GEMINI_MODEL,
            tokens_input: tokensUsed.input,
            tokens_output: tokensUsed.output
          }
        });
    } catch (e: unknown) {
      logger.warn("scribe_audit_failed", { error: e instanceof Error ? e.message : String(e) });
    }

    return jobToResponse((updatedRow as ScribeJobRow) ?? { ...job, status: "DRAFTED", draft_record: parsed, ended_at: new Date().toISOString() });
  } catch (error) {
    // Update job to FAILED
    const errObj = error as { message?: string; code?: string };
    await client
      .from("scribe_jobs")
      .update({
        status: "FAILED",
        error_code: errObj.code ?? "UNKNOWN",
        error_message: errObj.message ?? "Unknown error",
        ended_at: new Date().toISOString()
      })
      .eq("id", job.id);

    throw error;
  }
}

/**
 * Get latest scribe jobs for a consultation.
 */
export async function getScribeJobs(
  client: SupabaseClient,
  clinicId: string,
  consultationId: string,
  limit = 5
): Promise<ScribeJobResponse[]> {
  const { data, error } = await client
    .from("scribe_jobs")
    .select("id,clinic_id,consultation_id,doctor_id,status,provider,prompt_template,draft_record,error_code,error_message,started_at,ended_at")
    .eq("consultation_id", consultationId)
    .eq("clinic_id", clinicId)
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) {
    logger.error("scribe_jobs_list_failed", { error: error.message });
    return [];
  }
  return ((data ?? []) as ScribeJobRow[]).map(jobToResponse);
}

/**
 * Accept AI output: append selected sections into the consultation's note_draft / clinical_record.
 *
 * Uses APPEND mode — AI text is appended below the doctor's existing text with a separator.
 */
export async function acceptScribeOutput(
  client: SupabaseClient,
  admin: SupabaseClient,
  clinicId: string,
  consultationId: string,
  doctorId: string,
  jobId: string,
  sections: ScribeSection[]
): Promise<void> {
  // Load the scribe job
  const { data: jobRow, error: jobErr } = await client
    .from("scribe_jobs")
    .select("id,status,draft_record,clinic_id")
    .eq("id", jobId)
    .eq("clinic_id", clinicId)
    .eq("consultation_id", consultationId)
    .maybeSingle();
  if (jobErr || !jobRow) {
    throw Object.assign(new Error("Scribe job not found."), { statusCode: 404 });
  }
  const job = jobRow as { id: string; status: string; draft_record: ScribeAnalysisOutput | null; clinic_id: string };
  if (job.status !== "DRAFTED") {
    throw Object.assign(new Error(`Cannot accept a job in status '${job.status}'.`), { statusCode: 409 });
  }
  if (!job.draft_record) {
    throw Object.assign(new Error("No draft record to accept."), { statusCode: 422 });
  }

  // Load existing consultation data
  const { data: consRow, error: consErr } = await client
    .from("consultations")
    .select("note_draft,clinical_record,clinical_record_version")
    .eq("id", consultationId)
    .eq("clinic_id", clinicId)
    .maybeSingle();
  if (consErr || !consRow) {
    throw Object.assign(new Error("Consultation not found."), { statusCode: 404 });
  }
  const cons = consRow as {
    note_draft: Record<string, unknown> | null;
    clinical_record: Record<string, unknown> | null;
    clinical_record_version: number;
  };

  const AI_SEPARATOR = "\n\n--- AI Analysis ---\n";
  const noteDraft = (cons.note_draft && typeof cons.note_draft === "object" ? cons.note_draft : {}) as Record<string, string>;
  const clinicalRecord = (cons.clinical_record && typeof cons.clinical_record === "object" ? cons.clinical_record : {}) as Record<string, unknown>;
  const clinicalNotes = (
    clinicalRecord.clinicalNotes && typeof clinicalRecord.clinicalNotes === "object"
      ? clinicalRecord.clinicalNotes
      : {}
  ) as Record<string, string>;

  // Note draft fields (append mode)
  const noteDraftFields = ["chiefComplaints", "emotionalState", "physicalSymptoms", "modalities", "timeline"] as const;
  const noteDraftUpdates: Record<string, string> = {};
  for (const field of noteDraftFields) {
    if (sections.includes(field) && job.draft_record[field]) {
      const existing = (noteDraft[field] ?? "").trim();
      const aiText = job.draft_record[field].trim();
      noteDraftUpdates[field] = existing ? `${existing}${AI_SEPARATOR}${aiText}` : aiText;
    }
  }

  // Clinical notes fields (append mode)
  const clinicalNotesFields = ["observations", "diagnosisThinking"] as const;
  const clinicalNotesUpdates: Record<string, string> = {};
  for (const field of clinicalNotesFields) {
    if (sections.includes(field) && job.draft_record[field]) {
      const existing = (clinicalNotes[field] ?? "").trim();
      const aiText = job.draft_record[field].trim();
      clinicalNotesUpdates[field] = existing ? `${existing}${AI_SEPARATOR}${aiText}` : aiText;
    }
  }

  // Phase 4: Follow-up Assessment
  // Since followUpAssessment is not a direct field in clinicalNotes, we append it to diagnosisThinking
  if (sections.includes("followUpAssessment") && job.draft_record.followUpAssessment) {
    const existing = clinicalNotesUpdates.diagnosisThinking ?? (clinicalNotes.diagnosisThinking ?? "").trim();
    const aiText = job.draft_record.followUpAssessment.trim();
    clinicalNotesUpdates.diagnosisThinking = existing ? `${existing}\n\n--- AI Follow-Up Assessment ---\n${aiText}` : aiText;
  }

  // Build the update payload
  const updates: Record<string, unknown> = {};
  if (Object.keys(noteDraftUpdates).length > 0) {
    updates.note_draft = { ...noteDraft, ...noteDraftUpdates };
  }
  if (Object.keys(clinicalNotesUpdates).length > 0) {
    const mergedClinicalNotes = { ...clinicalNotes, ...clinicalNotesUpdates };
    updates.clinical_record = { ...clinicalRecord, clinicalNotes: mergedClinicalNotes };
    updates.clinical_record_version = (cons.clinical_record_version ?? 0) + 1;
  }

  // Apply updates to consultation
  if (Object.keys(updates).length > 0) {
    const { error: updateErr } = await client
      .from("consultations")
      .update(updates)
      .eq("id", consultationId)
      .eq("clinic_id", clinicId);
    if (updateErr) {
      logger.error("scribe_accept_consultation_update_failed", { error: updateErr.message });
      throw new Error("Failed to apply AI analysis to consultation.");
    }
  }

  // Update job status to INSERTED
  await client
    .from("scribe_jobs")
    .update({ status: "INSERTED", ended_at: new Date().toISOString() })
    .eq("id", jobId);

  // Audit log
  try {
    await admin
      .schema("audit")
      .from("events")
      .insert({
        event_type: "scribe.accepted",
        actor_id: doctorId,
        clinic_id: clinicId,
        entity_type: "consultation",
        entity_id: consultationId,
        payload: { scribe_job_id: jobId, accepted_sections: sections }
      });
  } catch (e: unknown) {
    logger.warn("scribe_audit_accept_failed", { error: e instanceof Error ? e.message : String(e) });
  }
}

/**
 * Discard AI output — marks the job as DISCARDED.
 */
export async function discardScribeOutput(
  client: SupabaseClient,
  admin: SupabaseClient,
  clinicId: string,
  consultationId: string,
  doctorId: string,
  jobId: string
): Promise<void> {
  const { error } = await client
    .from("scribe_jobs")
    .update({ status: "DISCARDED", ended_at: new Date().toISOString() })
    .eq("id", jobId)
    .eq("clinic_id", clinicId)
    .eq("consultation_id", consultationId);
  if (error) {
    logger.error("scribe_discard_failed", { error: error.message });
    throw new Error("Failed to discard AI analysis.");
  }

  // Audit log
  try {
    await admin
      .schema("audit")
      .from("events")
      .insert({
        event_type: "scribe.discarded",
        actor_id: doctorId,
        clinic_id: clinicId,
        entity_type: "consultation",
        entity_id: consultationId,
        payload: { scribe_job_id: jobId }
      });
  } catch (e: unknown) {
    logger.warn("scribe_audit_discard_failed", { error: e instanceof Error ? e.message : String(e) });
  }
}

/**
 * Phase 6: Repertorization Engine
 * Evaluates the given rubrics using Gemini and returns a ranked list of remedies.
 */
export async function aiRepertorize(
  admin: SupabaseClient,
  clinicId: string,
  doctorId: string,
  consultationId: string | null,
  rubrics: Array<{ chapter: string; rubric: string; intensity: number }>
): Promise<RepertorizationOutput> {
  if (!isGeminiConfigured()) {
    throw Object.assign(new Error("AI Scribe is not configured on this server."), { statusCode: 503 });
  }

  if (!rubrics || rubrics.length === 0) {
    throw Object.assign(new Error("No rubrics provided for repertorization."), { statusCode: 400 });
  }

  const payload = JSON.stringify({ rubrics }, null, 2);
  
  // Phase 7: Fetch doctor's custom instructions
  const { data: profile } = await admin
    .from("profiles")
    .select("id") // removed ai_scribe_instructions
    .select("id")
    .eq("id", doctorId)
    .maybeSingle();

  let customInstructionsBlock = "";

  const prompt = `${REPERTORY_PROMPT}${customInstructionsBlock}\n\n${payload}`;

  const { text, tokensUsed } = await analyzeWithGemini(prompt, { maxOutputTokens: 2000, temperature: 0.2 });

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw Object.assign(new Error("Failed to parse Gemini repertorization output as JSON."), { statusCode: 500 });
  }

  const result = RepertorizationOutputSchema.safeParse(parsed);
  if (!result.success) {
    logger.error("repertorize_schema_mismatch", { error: result.error.format() });
    throw Object.assign(new Error("Gemini repertorization output did not match expected schema."), { statusCode: 500 });
  }

  // Audit log
  try {
    await admin
      .schema("audit")
      .from("events")
      .insert({
        event_type: "repertorize.run",
        actor_id: doctorId,
        clinic_id: clinicId,
        entity_type: "consultation",
        entity_id: consultationId || "none",
        payload: {
          rubrics_count: rubrics.length,
          tokens_input: tokensUsed.input,
          tokens_output: tokensUsed.output
        }
      });
  } catch (e: unknown) {
    logger.warn("repertorize_audit_failed", { error: e instanceof Error ? e.message : String(e) });
  }

  return result.data;
}

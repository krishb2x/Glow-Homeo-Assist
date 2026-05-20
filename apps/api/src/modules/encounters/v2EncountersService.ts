import type { SupabaseClient } from "@supabase/supabase-js";
import { v4 as uuid } from "uuid";
import { deleteObjectByKey, isS3Configured } from "../../s3";
import { logger } from "../../lib/logger";
import { writeAuditV2Event } from "../../lib/auditV2";

function isMissingTableError(err: { message?: string; code?: string } | null): boolean {
  if (!err) return false;
  const msg = err.message ?? "";
  return err.code === "42P01" || msg.includes("does not exist") || msg.includes("Could not find");
}

// ---------------------------------------------------------------------------
// audio_sessions
// ---------------------------------------------------------------------------

export async function startAudioSession(
  client: SupabaseClient,
  args: {
    clinicId: string;
    consultationId: string;
    doctorId: string;
    storeRecording: boolean;
    consentCaptured?: boolean;
  }
): Promise<string | null> {
  const id = uuid();
  const { error } = await client.from("audio_sessions").insert({
    id,
    clinic_id: args.clinicId,
    consultation_id: args.consultationId,
    doctor_id: args.doctorId,
    store_recording: args.storeRecording,
    consent_captured: args.consentCaptured ?? false,
    consent_text: args.consentCaptured ? "Verbal consent captured at session start" : null
  });
  if (error) {
    if (isMissingTableError(error)) {
      logger.warn("audio_sessions_table_missing", { hint: "Run supabase db push for v2 migration" });
      return null;
    }
    logger.warn("audio_session_start_failed", { message: error.message });
    return null;
  }
  return id;
}

export async function endAudioSession(
  client: SupabaseClient,
  audioSessionId: string,
  args: {
    durationSeconds?: number;
    recordingObjectKey?: string | null;
  }
): Promise<void> {
  const { error } = await client
    .from("audio_sessions")
    .update({
      ended_at: new Date().toISOString(),
      duration_seconds: args.durationSeconds ?? null,
      recording_object_key: args.recordingObjectKey ?? null
    })
    .eq("id", audioSessionId);
  if (error && !isMissingTableError(error)) {
    logger.warn("audio_session_end_failed", { message: error.message });
  }
}

// ---------------------------------------------------------------------------
// scribe_jobs
// ---------------------------------------------------------------------------

export async function createScribeJob(
  client: SupabaseClient,
  args: {
    clinicId: string;
    consultationId: string;
    doctorId: string;
    audioSessionId?: string | null;
    status?: "PENDING" | "STREAMING" | "DRAFTED" | "FAILED";
    provider?: string;
  }
): Promise<string | null> {
  const id = uuid();
  const { error } = await client.from("scribe_jobs").insert({
    id,
    clinic_id: args.clinicId,
    consultation_id: args.consultationId,
    doctor_id: args.doctorId,
    audio_session_id: args.audioSessionId ?? null,
    status: args.status ?? "STREAMING",
    provider: args.provider ?? (process.env.GEMINI_API_KEY ? "gemini" : "mock")
  });
  if (error) {
    if (isMissingTableError(error)) return null;
    logger.warn("scribe_job_create_failed", { message: error.message });
    return null;
  }
  return id;
}

export async function updateScribeJob(
  client: SupabaseClient,
  scribeJobId: string,
  patch: {
    status?: string;
    transcriptText?: string;
    draftRecord?: Record<string, unknown> | null;
    errorCode?: string;
    errorMessage?: string;
    ended?: boolean;
  }
): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (patch.status) updates.status = patch.status;
  if (patch.transcriptText !== undefined) updates.transcript_text = patch.transcriptText;
  if (patch.draftRecord !== undefined) updates.draft_record = patch.draftRecord;
  if (patch.errorCode) updates.error_code = patch.errorCode;
  if (patch.errorMessage) updates.error_message = patch.errorMessage;
  if (patch.ended) updates.ended_at = new Date().toISOString();

  const { error } = await client.from("scribe_jobs").update(updates).eq("id", scribeJobId);
  if (error && !isMissingTableError(error)) {
    logger.warn("scribe_job_update_failed", { message: error.message });
  }
}

// Finalize / distribution pipeline lives in modules/distribution/
export {
  runConsultationFinalizeSideEffects,
  runPrescriptionDistributionPipeline,
  processDueNotificationJobs
} from "../distribution/prescriptionDistribution";

// ---------------------------------------------------------------------------
// Audio purge (cron)
// ---------------------------------------------------------------------------

export async function purgeExpiredAudioSessions(admin: SupabaseClient): Promise<number> {
  const { data, error } = await admin
    .from("audio_sessions")
    .select("id,recording_object_key,retention_days,started_at")
    .is("deleted_at", null)
    .not("recording_object_key", "is", null);

  if (error) {
    if (isMissingTableError(error)) return 0;
    logger.warn("audio_purge_query_failed", { message: error.message });
    return 0;
  }

  const now = Date.now();
  let purged = 0;

  for (const row of data ?? []) {
    const r = row as {
      id: string;
      recording_object_key: string;
      retention_days: number;
      started_at: string;
    };
    const ageMs = now - new Date(r.started_at).getTime();
    const maxAgeMs = (r.retention_days ?? 7) * 24 * 60 * 60 * 1000;
    if (ageMs < maxAgeMs) continue;

    if (isS3Configured() && r.recording_object_key && !r.recording_object_key.startsWith("inline:")) {
      try {
        await deleteObjectByKey(r.recording_object_key);
      } catch {
        // continue — still mark deleted in DB
      }
    }

    const { error: upErr } = await admin
      .from("audio_sessions")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", r.id);

    if (!upErr) {
      purged += 1;
      void writeAuditV2Event(admin, {
        clinicId: null,
        actorId: null,
        entityType: "audio_session",
        entityId: r.id,
        action: "audio_purged",
        payload: { objectKey: r.recording_object_key }
      });
    }
  }

  if (purged > 0) {
    logger.info("audio_sessions_purged", { count: purged });
  }
  return purged;
}

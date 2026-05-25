import type { SupabaseClient } from "@supabase/supabase-js";
import { v4 as uuid } from "uuid";
import { logger } from "../../lib/logger";
import {
  buildObjectKey,
  createDownloadUrl,
  isS3Configured,
  putObjectBuffer
} from "../../s3";

export function verifyRecordingWebhookSecret(header: string | undefined): boolean {
  const expected = process.env.JITSI_RECORDING_WEBHOOK_SECRET?.trim();
  if (!expected) return false;
  return header === expected || header === `Bearer ${expected}`;
}

export async function ingestConsultationRecording(args: {
  admin: SupabaseClient;
  consultationId: string;
  videoSessionId?: string;
  /** Remote URL (Jibri finalize / JaaS) — fetched server-side */
  sourceUrl?: string;
  /** Already in S3 — copied to permanent key */
  sourceObjectKey?: string;
  contentType?: string;
  durationSeconds?: number;
}): Promise<{ objectKey: string; videoSessionId: string }> {
  const { data: consult } = await args.admin
    .from("consultations")
    .select("id,clinic_id,patient_id,recording_enabled,attending_user_id")
    .eq("id", args.consultationId)
    .maybeSingle();

  if (!consult) throw new Error("Consultation not found");
  const c = consult as {
    clinic_id: string;
    patient_id: string;
    recording_enabled: boolean;
    attending_user_id: string | null;
  };

  let sessionId = args.videoSessionId;
  if (!sessionId) {
    const { data: vs } = await args.admin
      .from("video_sessions")
      .select("id")
      .eq("consultation_id", args.consultationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    sessionId = (vs as { id: string } | null)?.id;
  }
  if (!sessionId) throw new Error("No video session for consultation");

  if (!isS3Configured()) {
    throw new Error("S3 not configured — cannot store consultation recording");
  }

  const ext = args.contentType?.includes("mp4") ? "mp4" : "webm";
  const objectKey = buildObjectKey(c.clinic_id, "document", `consultation-${args.consultationId}.${ext}`);

  if (args.sourceUrl?.trim()) {
    const res = await fetch(args.sourceUrl.trim(), { signal: AbortSignal.timeout(120_000) });
    if (!res.ok) throw new Error(`Recording download failed: ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await putObjectBuffer(objectKey, buf, args.contentType ?? "video/webm");
  } else if (args.sourceObjectKey?.trim()) {
    const { copyObjectInBucket } = await import("../../s3");
    await copyObjectInBucket(args.sourceObjectKey.trim(), objectKey);
  } else {
    throw new Error("sourceUrl or sourceObjectKey required");
  }

  const now = new Date().toISOString();
  await args.admin
    .from("video_sessions")
    .update({
      status: "ENDED",
      ended_at: now,
      recording_object_key: objectKey
    })
    .eq("id", sessionId);

  if (c.attending_user_id) {
    const fileId = uuid();
    await args.admin.from("file_objects").insert({
      id: fileId,
      clinic_id: c.clinic_id,
      patient_id: c.patient_id,
      consultation_id: args.consultationId,
      object_key: objectKey,
      category: "document",
      mime_type: args.contentType ?? "video/webm",
      uploaded_by: c.attending_user_id
    });
  }

  logger.info("consultation_recording_stored", {
    consultationId: args.consultationId,
    objectKey,
    durationSeconds: args.durationSeconds
  });

  return { objectKey, videoSessionId: sessionId };
}

export async function getConsultationRecordingUrl(
  client: SupabaseClient,
  consultationId: string,
  clinicId: string
): Promise<{ url: string; objectKey: string } | null> {
  const { data } = await client
    .from("video_sessions")
    .select("recording_object_key")
    .eq("consultation_id", consultationId)
    .eq("clinic_id", clinicId)
    .not("recording_object_key", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const key = (data as { recording_object_key?: string } | null)?.recording_object_key;
  if (!key || !isS3Configured()) return null;

  const url = await createDownloadUrl(key, 3600);
  return { url, objectKey: key };
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { v4 as uuid } from "uuid";
import { signedObjectUrl } from "./patientMedia";
import type { PatientContext } from "./types";

export async function listPatientMessages(
  admin: SupabaseClient,
  ctx: PatientContext,
  opts: { since?: string; limit?: number }
): Promise<unknown[]> {
  const limit = Math.min(50, Math.max(1, opts.limit ?? 50));
  let q = admin
    .from("patient_inbox_messages")
    .select("id,body,direction,read_at,created_at")
    .eq("patient_id", ctx.patientId)
    .eq("clinic_id", ctx.clinicId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (opts.since) {
    const t = Date.parse(opts.since);
    if (!Number.isNaN(t)) {
      q = q.gte("created_at", new Date(t).toISOString());
    }
  }

  const { data, error } = await q;
  if (error) throw error;

  return (data ?? []).map((row) => {
    const r = row as {
      id: string;
      body: string;
      direction: string;
      read_at: string | null;
      created_at: string;
    };
    return {
      id: r.id,
      direction: r.direction,
      body: r.body,
      createdAt: r.created_at,
      readAt: r.read_at,
      attachments: [] as unknown[]
    };
  });
}

export async function sendPatientMessage(
  admin: SupabaseClient,
  ctx: PatientContext,
  body: { body: string; attachmentMediaObjectIds?: string[] }
): Promise<{ id: string; createdAt: string }> {
  const trimmed = body.body.trim();
  if (!trimmed) {
    const err = new Error("Message body is required");
    (err as Error & { code: string }).code = "VALIDATION_ERROR";
    throw err;
  }

  if (body.attachmentMediaObjectIds?.length) {
    const { data: media } = await admin
      .from("media_objects")
      .select("id")
      .in("id", body.attachmentMediaObjectIds)
      .eq("patient_id", ctx.patientId)
      .eq("clinic_id", ctx.clinicId);
    if ((media ?? []).length !== body.attachmentMediaObjectIds.length) {
      const err = new Error("Invalid attachment");
      (err as Error & { code: string }).code = "VALIDATION_ERROR";
      throw err;
    }
  }

  const { data, error } = await admin
    .from("patient_inbox_messages")
    .insert({
      id: uuid(),
      clinic_id: ctx.clinicId,
      patient_id: ctx.patientId,
      body: trimmed,
      direction: "PATIENT",
      created_by_user_id: ctx.authUserId
    })
    .select("id,created_at")
    .single();

  if (error) throw error;
  const row = data as { id: string; created_at: string };
  return { id: row.id, createdAt: row.created_at };
}

export async function resolveMessageAttachments(
  admin: SupabaseClient,
  ctx: PatientContext,
  mediaIds: string[]
): Promise<Array<{ id: string; url?: string; mimeType: string }>> {
  if (mediaIds.length === 0) return [];
  const { data } = await admin
    .from("media_objects")
    .select("id,storage_object_key,mime_type")
    .in("id", mediaIds)
    .eq("patient_id", ctx.patientId);

  const out: Array<{ id: string; url?: string; mimeType: string }> = [];
  for (const row of data ?? []) {
    const r = row as { id: string; storage_object_key: string; mime_type: string };
    out.push({
      id: r.id,
      mimeType: r.mime_type,
      url: await signedObjectUrl(r.storage_object_key)
    });
  }
  return out;
}

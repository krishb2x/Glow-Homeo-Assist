import type { SupabaseClient } from "@supabase/supabase-js";
import { v4 as uuid } from "uuid";
import { buildObjectKey, createUploadUrl } from "../../s3";
import { mediaBucket, signedObjectUrl } from "./patientMedia";
import type { PatientContext } from "./types";

const PATIENT_MEDIA_KINDS = ["prescription_pdf", "case_summary_pdf", "patient_photo", "document"] as const;

export async function listPatientDocuments(
  admin: SupabaseClient,
  ctx: PatientContext
): Promise<unknown[]> {
  const { data, error } = await admin
    .from("media_objects")
    .select("id,kind,storage_object_key,mime_type,size_bytes,metadata,created_at")
    .eq("patient_id", ctx.patientId)
    .eq("clinic_id", ctx.clinicId)
    .is("deleted_at", null)
    .in("kind", [...PATIENT_MEDIA_KINDS])
    .order("created_at", { ascending: false })
    .limit(60);

  if (error) throw error;

  const items: unknown[] = [];
  for (const row of data ?? []) {
    const r = row as {
      id: string;
      kind: string;
      storage_object_key: string;
      mime_type: string;
      size_bytes: number | null;
      metadata: Record<string, unknown>;
      created_at: string;
    };
    const title =
      (typeof r.metadata?.title === "string" && r.metadata.title) ||
      `${r.kind.replace(/_/g, " ")} — ${r.created_at.slice(0, 10)}`;
    items.push({
      id: r.id,
      kind: r.kind,
      title,
      createdAt: r.created_at,
      mimeType: r.mime_type,
      sizeBytes: r.size_bytes ?? undefined,
      url: await signedObjectUrl(r.storage_object_key)
    });
  }
  return items;
}

export async function presignPatientDocumentUpload(
  ctx: PatientContext,
  body: { filename: string; contentType: string; kind?: "patient_photo" | "document" }
): Promise<{ uploadUrl: string; objectKey: string; expiresInSeconds: number }> {
  const objectKey = buildObjectKey(ctx.clinicId, "document", body.filename);
  const uploadUrl = await createUploadUrl(objectKey, body.contentType);
  return { uploadUrl, objectKey, expiresInSeconds: 300 };
}

export async function completePatientDocumentUpload(
  admin: SupabaseClient,
  ctx: PatientContext,
  body: {
    objectKey: string;
    kind: "patient_photo" | "document";
    mimeType: string;
    sizeBytes?: number;
    title?: string;
  }
): Promise<{ id: string }> {
  if (!body.objectKey.startsWith(`clinics/${ctx.clinicId}/`)) {
    const err = new Error("Object key outside clinic scope");
    (err as Error & { code: string }).code = "TENANT_SCOPE";
    throw err;
  }

  const id = uuid();
  const { error } = await admin.from("media_objects").insert({
    id,
    clinic_id: ctx.clinicId,
    patient_id: ctx.patientId,
    uploaded_by: ctx.authUserId,
    kind: body.kind,
    storage_bucket: mediaBucket(),
    storage_object_key: body.objectKey,
    mime_type: body.mimeType,
    size_bytes: body.sizeBytes ?? null,
    metadata: body.title ? { title: body.title } : {}
  });

  if (error) throw error;
  return { id };
}

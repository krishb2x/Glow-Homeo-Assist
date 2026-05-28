import type { SupabaseClient } from "@supabase/supabase-js";
import { signedObjectUrl } from "./patientMedia";
import type { PatientContext } from "./types";
import { clampLimit } from "./patientPagination";

export async function listPatientContent(
  admin: SupabaseClient,
  ctx: PatientContext,
  filters: { kind?: string; category?: string; limit?: number }
): Promise<unknown[]> {
  const limit = clampLimit(filters.limit, 50, 20);

  const { data: assignments } = await admin
    .from("patient_content_assignments")
    .select(
      "assigned_at,viewed_at,completed_at,clinic_content_items(id,kind,title,summary,category,thumbnail_url,duration_seconds,tags,media_object_id,is_published)"
    )
    .eq("patient_id", ctx.patientId)
    .order("assigned_at", { ascending: false })
    .limit(limit);

  const assignedIds = new Set<string>();
  const items: unknown[] = [];

  for (const row of assignments ?? []) {
    const nested = (row as { clinic_content_items?: Record<string, unknown> | Record<string, unknown>[] })
      .clinic_content_items;
    const content = Array.isArray(nested) ? nested[0] : nested;
    if (!content || content.is_published === false) continue;
    if (filters.kind && content.kind !== filters.kind) continue;
    if (filters.category && content.category !== filters.category) continue;
    assignedIds.add(content.id as string);
    items.push(
      await mapContentItem(admin, content, {
        assignedAt: (row as { assigned_at: string }).assigned_at,
        viewedAt: (row as { viewed_at: string | null }).viewed_at,
        completedAt: (row as { completed_at: string | null }).completed_at
      })
    );
  }

  if (items.length < limit) {
    let q = admin
      .from("clinic_content_items")
      .select("id,kind,title,summary,category,thumbnail_url,duration_seconds,tags,media_object_id")
      .eq("clinic_id", ctx.clinicId)
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(limit - items.length);

    if (filters.kind) q = q.eq("kind", filters.kind);
    if (filters.category) q = q.eq("category", filters.category);

    const { data: published } = await q;
    for (const content of published ?? []) {
      const c = content as Record<string, unknown>;
      if (assignedIds.has(c.id as string)) continue;
      items.push(await mapContentItem(admin, c, {}));
    }
  }

  return items;
}

async function mapContentItem(
  admin: SupabaseClient,
  content: Record<string, unknown>,
  meta: { assignedAt?: string; viewedAt?: string | null; completedAt?: string | null }
): Promise<Record<string, unknown>> {
  let mediaUrl: string | undefined;
  const mediaId = content.media_object_id as string | null;
  if (mediaId) {
    const { data: media } = await admin
      .from("media_objects")
      .select("storage_object_key")
      .eq("id", mediaId)
      .maybeSingle();
    mediaUrl = await signedObjectUrl(
      (media as { storage_object_key?: string } | null)?.storage_object_key
    );
  }

  return {
    id: content.id,
    kind: content.kind,
    title: content.title,
    summary: content.summary ?? undefined,
    category: content.category ?? undefined,
    thumbnailUrl: content.thumbnail_url ?? undefined,
    mediaUrl,
    durationSec: content.duration_seconds ?? undefined,
    tags: content.tags ?? [],
    assignedAt: meta.assignedAt,
    viewedAt: meta.viewedAt ?? undefined,
    completedAt: meta.completedAt ?? undefined
  };
}

export async function markContentViewed(
  admin: SupabaseClient,
  ctx: PatientContext,
  contentId: string
): Promise<void> {
  await upsertAssignment(admin, ctx, contentId, { viewed_at: new Date().toISOString() });
}

export async function markContentCompleted(
  admin: SupabaseClient,
  ctx: PatientContext,
  contentId: string
): Promise<void> {
  const now = new Date().toISOString();
  await upsertAssignment(admin, ctx, contentId, { viewed_at: now, completed_at: now });
}

async function upsertAssignment(
  admin: SupabaseClient,
  ctx: PatientContext,
  contentId: string,
  patch: { viewed_at?: string; completed_at?: string }
): Promise<void> {
  const { data: content } = await admin
    .from("clinic_content_items")
    .select("id")
    .eq("id", contentId)
    .eq("clinic_id", ctx.clinicId)
    .maybeSingle();

  if (!content) {
    const err = new Error("Content not found");
    (err as Error & { code: string }).code = "NOT_FOUND";
    throw err;
  }

  const { error } = await admin.from("patient_content_assignments").upsert(
    {
      clinic_id: ctx.clinicId,
      patient_id: ctx.patientId,
      content_id: contentId,
      ...patch
    },
    { onConflict: "patient_id,content_id" }
  );

  if (error) throw error;
}

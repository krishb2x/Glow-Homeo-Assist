import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthClaims } from "../../auth";
import type { CarePlanBlockInput, CarePlanBlockType } from "@homeoassist/domain";
import { CarePlanTemplateBodySchema } from "@homeoassist/domain";
import {
  blocksToAdviceCards,
  mapBlockRow,
  mapMediaRow,
  mapTemplateSummary,
  mergeBlockPayloads,
  slugifyTitle,
  type CarePlanBlockRow,
  type CarePlanMediaRow,
  type CarePlanTemplateRow
} from "./carePlanMappers";
import { fetchYouTubeOEmbed } from "./youtubeMetadata";

type Db = SupabaseClient;

export async function listCarePlanTemplates(
  db: Db,
  clinicId: string,
  doctorId: string,
  query: {
    q?: string;
    category?: string;
    diseaseTag?: string;
    status?: string;
    templateType?: "official" | "custom" | "all";
    favoritesOnly?: boolean;
    limit?: number;
  }
) {
  let req = db
    .from("care_plan_templates")
    .select("id, clinic_id, doctor_id, title, slug, summary, primary_category, disease_tags, symptom_tags, patient_types, age_groups, severity, visibility, status, version, locale, is_shared, source_template_id, usage_count, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(query.limit ?? 100);

  if (query.templateType === "official") {
    req = req.eq("clinic_id", "00000000-0000-0000-0000-000000000000");
  } else if (query.templateType === "custom") {
    req = req.eq("clinic_id", clinicId);
  } else {
    req = req.or(`clinic_id.eq.${clinicId},clinic_id.eq.00000000-0000-0000-0000-000000000000`);
  }

  if (query.status && query.status !== "all") {
    req = req.eq("status", query.status);
  } else {
    req = req.neq("status", "archived");
  }
  if (query.category) req = req.eq("primary_category", query.category);
  if (query.diseaseTag) req = req.contains("disease_tags", [query.diseaseTag]);

  const { data, error } = await req;
  if (error) throw error;

  const rows = (data ?? []) as CarePlanTemplateRow[];
  const ids = rows.map((r) => r.id);

  const [{ data: favRows }, { data: blockCounts }] = await Promise.all([
    db.from("care_plan_favorites").select("template_id").eq("doctor_id", doctorId),
    ids.length
      ? db.from("care_plan_blocks").select("template_id").in("template_id", ids)
      : Promise.resolve({ data: [] as { template_id: string }[] })
  ]);

  const favSet = new Set((favRows ?? []).map((f) => (f as { template_id: string }).template_id));
  const countMap = new Map<string, number>();
  for (const b of blockCounts ?? []) {
    const tid = (b as { template_id: string }).template_id;
    countMap.set(tid, (countMap.get(tid) ?? 0) + 1);
  }

  let filtered = rows;
  if (query.favoritesOnly) filtered = filtered.filter((r) => favSet.has(r.id));
  if (query.q?.trim()) {
    const q = query.q.trim().toLowerCase();
    filtered = filtered.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        (r.summary ?? "").toLowerCase().includes(q) ||
        r.slug.includes(q) ||
        (r.disease_tags ?? []).some((t) => t.toLowerCase().includes(q))
    );
  }

  return filtered.map((r) =>
    mapTemplateSummary(r, doctorId, {
      isFavorite: favSet.has(r.id),
      blockCount: countMap.get(r.id) ?? 0
    })
  );
}

export async function getCarePlanTemplateDetail(
  db: Db,
  templateId: string,
  doctorId: string
) {
  const { data: tpl, error } = await db
    .from("care_plan_templates")
    .select("id, clinic_id, doctor_id, title, slug, summary, primary_category, disease_tags, symptom_tags, patient_types, age_groups, severity, visibility, status, version, locale, is_shared, source_template_id, usage_count, created_at, updated_at")
    .eq("id", templateId)
    .maybeSingle();
  if (error) throw error;
  if (!tpl) return null;

  const row = tpl as CarePlanTemplateRow;

  const [{ data: blocks }, { data: links }, { data: fav }, { data: courseRows }] = await Promise.all([
    db
      .from("care_plan_blocks")
      .select("id, template_id, block_type, title, sort_order, payload, created_at, updated_at")
      .eq("template_id", templateId)
      .order("sort_order", { ascending: true }),
    db
      .from("care_plan_template_media")
      .select("media_id, block_id, sort_order, caption")
      .eq("template_id", templateId)
      .order("sort_order", { ascending: true }),
    db
      .from("care_plan_favorites")
      .select("template_id")
      .eq("doctor_id", doctorId)
      .eq("template_id", templateId)
      .maybeSingle(),
    db
      .from("care_plan_template_courses")
      .select("course_id")
      .eq("template_id", templateId)
      .order("sort_order", { ascending: true })
  ]);

  const mediaIds = [...new Set((links ?? []).map((l) => (l as { media_id: string }).media_id))];
  let mediaRows: CarePlanMediaRow[] = [];
  if (mediaIds.length) {
    const { data: media } = await db.from("care_plan_media").select("id, clinic_id, doctor_id, media_type, source_url, title, description, thumbnail_url, duration_seconds, channel_name, metadata, is_shared, created_at, updated_at").in("id", mediaIds);
    mediaRows = (media ?? []) as CarePlanMediaRow[];
  }
  const mediaById = new Map(mediaRows.map((m) => [m.id, mapMediaRow(m, doctorId)]));

  return {
    ...mapTemplateSummary(row, doctorId, {
      isFavorite: Boolean(fav),
      blockCount: (blocks ?? []).length
    }),
    blocks: ((blocks ?? []) as CarePlanBlockRow[]).map(mapBlockRow),
    mediaLinks: (links ?? []).map((l) => {
      const link = l as {
        media_id: string;
        block_id: string | null;
        sort_order: number;
        caption: string | null;
      };
      return {
        mediaId: link.media_id,
        blockId: link.block_id,
        sortOrder: link.sort_order,
        caption: link.caption,
        media: mediaById.get(link.media_id) ?? null
      };
    }),
    courseIds: (courseRows ?? []).map((c: any) => c.course_id)
  };
}

async function upsertBlocks(
  db: Db,
  templateId: string,
  blocks: CarePlanBlockInput[]
): Promise<void> {
  await db.from("care_plan_blocks").delete().eq("template_id", templateId);
  if (!blocks.length) return;
  const rows = blocks.map((b, i) => ({
    template_id: templateId,
    block_type: b.blockType,
    title: (b.title ?? "").trim(),
    sort_order: b.sortOrder ?? i,
    payload: b.payload ?? {},
    ...(b.id ? { id: b.id } : {})
  }));
  const { error } = await db.from("care_plan_blocks").insert(rows);
  if (error) throw error;
}

async function syncMediaLinks(
  db: Db,
  templateId: string,
  mediaLinks: Array<{
    mediaId: string;
    blockId?: string | null;
    sortOrder?: number;
    caption?: string;
  }>
): Promise<void> {
  await db.from("care_plan_template_media").delete().eq("template_id", templateId);
  if (!mediaLinks.length) return;
  const rows = mediaLinks.map((l, i) => ({
    template_id: templateId,
    media_id: l.mediaId,
    block_id: l.blockId ?? null,
    sort_order: l.sortOrder ?? i,
    caption: l.caption ?? null
  }));
  const { error } = await db.from("care_plan_template_media").insert(rows);
  if (error) throw error;
}

async function syncCourseLinks(
  db: Db,
  templateId: string,
  courseIds: string[]
): Promise<void> {
  await db.from("care_plan_template_courses").delete().eq("template_id", templateId);
  if (!courseIds.length) return;
  const rows = courseIds.map((cid, i) => ({
    template_id: templateId,
    course_id: cid,
    sort_order: i
  }));
  const { error } = await db.from("care_plan_template_courses").insert(rows);
  if (error) throw error;
}

export async function createCarePlanTemplate(
  db: Db,
  clinicId: string,
  claims: AuthClaims,
  body: unknown
) {
  const parsed = CarePlanTemplateBodySchema.parse(body);
  const baseSlug = parsed.slug ?? slugifyTitle(parsed.title);
  
  let slug = baseSlug;
  let attempts = 0;
  while (attempts < 10) {
    const { data: exists, error: checkErr } = await db
      .from("care_plan_templates")
      .select("id")
      .eq("clinic_id", clinicId)
      .eq("slug", slug)
      .maybeSingle();
      
    if (checkErr) throw checkErr;
    if (!exists) break;
    
    attempts++;
    const suffix = Math.random().toString(36).substring(2, 6);
    slug = `${baseSlug}-${suffix}`;
  }

  const insert = {
    clinic_id: clinicId,
    doctor_id: claims.userId,
    title: parsed.title.trim(),
    slug,
    summary: parsed.summary ?? null,
    primary_category: parsed.primaryCategory ?? "wellness_plan",
    disease_tags: parsed.diseaseTags ?? [],
    symptom_tags: parsed.symptomTags ?? [],
    patient_types: parsed.patientTypes ?? [],
    age_groups: parsed.ageGroups ?? [],
    severity: parsed.severity ?? "any",
    visibility: parsed.visibility ?? "private",
    status: parsed.status ?? "draft",
    locale: parsed.locale ?? "en",
    is_shared: parsed.isShared ?? false
    // template_type: parsed.templateType ?? "custom" - removed pending migration
  };

  const { data, error } = await db
    .from("care_plan_templates")
    .insert(insert)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  const id = (data as { id: string }).id;

  if (parsed.blocks?.length) await upsertBlocks(db, id, parsed.blocks);
  if (parsed.mediaLinks?.length) await syncMediaLinks(db, id, parsed.mediaLinks);
  if (parsed.courseIds?.length) await syncCourseLinks(db, id, parsed.courseIds);

  return { id };
}

export async function updateCarePlanTemplate(
  db: Db,
  templateId: string,
  claims: AuthClaims,
  body: unknown
) {
  const parsed = CarePlanTemplateBodySchema.partial()
    .refine((b) => Object.keys(b).length > 0, { message: "Empty body" })
    .parse(body);

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.title !== undefined) updates.title = parsed.title.trim();
  if (parsed.slug !== undefined) updates.slug = parsed.slug;
  if (parsed.summary !== undefined) updates.summary = parsed.summary;
  if (parsed.primaryCategory !== undefined) updates.primary_category = parsed.primaryCategory;
  if (parsed.diseaseTags !== undefined) updates.disease_tags = parsed.diseaseTags;
  if (parsed.symptomTags !== undefined) updates.symptom_tags = parsed.symptomTags;
  if (parsed.patientTypes !== undefined) updates.patient_types = parsed.patientTypes;
  if (parsed.ageGroups !== undefined) updates.age_groups = parsed.ageGroups;
  if (parsed.severity !== undefined) updates.severity = parsed.severity;
  if (parsed.visibility !== undefined) updates.visibility = parsed.visibility;
  if (parsed.status !== undefined) updates.status = parsed.status;
  if (parsed.locale !== undefined) updates.locale = parsed.locale;
  if (parsed.isShared !== undefined) updates.is_shared = parsed.isShared;

  const { error } = await db
    .from("care_plan_templates")
    .update(updates)
    .eq("id", templateId)
    .eq("doctor_id", claims.userId);
  if (error) throw error;

  if (parsed.blocks) await upsertBlocks(db, templateId, parsed.blocks);
  if (parsed.mediaLinks) await syncMediaLinks(db, templateId, parsed.mediaLinks);
  if (parsed.courseIds) await syncCourseLinks(db, templateId, parsed.courseIds);

  return { ok: true };
}

export async function cloneCarePlanTemplate(
  db: Db,
  clinicId: string,
  claims: AuthClaims,
  sourceId: string,
  titleOverride?: string
) {
  const detail = await getCarePlanTemplateDetail(db, sourceId, claims.userId);
  if (!detail) return null;

  const newTitle = titleOverride?.trim() || `${detail.title} (copy)`;
  const { id } = await createCarePlanTemplate(db, clinicId, claims, {
    title: newTitle,
    summary: detail.summary,
    primaryCategory: detail.primaryCategory,
    diseaseTags: detail.diseaseTags,
    symptomTags: detail.symptomTags,
    patientTypes: detail.patientTypes,
    ageGroups: detail.ageGroups,
    severity: detail.severity,
    visibility: "private",
    status: "draft",
    locale: detail.locale,
    isShared: false,
    blocks: detail.blocks.map((b) => ({
      blockType: b.blockType,
      title: b.title,
      sortOrder: b.sortOrder,
      payload: b.payload
    })),
    mediaLinks: detail.mediaLinks.map((l) => ({
      mediaId: l.mediaId,
      blockId: undefined,
      sortOrder: l.sortOrder,
      caption: l.caption ?? undefined
    })),
    courseIds: detail.courseIds
  });

  await db
    .from("care_plan_templates")
    .update({ source_template_id: sourceId })
    .eq("id", id);

  return { id };
}

export async function deleteCarePlanTemplate(
  db: Db,
  templateId: string,
  doctorId: string
) {
  const { error } = await db
    .from("care_plan_templates")
    .delete()
    .eq("id", templateId)
    .eq("doctor_id", doctorId);
  if (error) throw error;
  return { ok: true };
}

export async function recordCarePlanUsage(
  db: Db,
  templateId: string,
  doctorId: string
) {
  await db.from("care_plan_recent_usage").upsert({
    doctor_id: doctorId,
    template_id: templateId,
    used_at: new Date().toISOString()
  });
  const { data } = await db
    .from("care_plan_templates")
    .select("usage_count")
    .eq("id", templateId)
    .maybeSingle();
  const n = ((data as { usage_count?: number } | null)?.usage_count ?? 0) + 1;
  await db.from("care_plan_templates").update({ usage_count: n }).eq("id", templateId);
}

export async function toggleCarePlanFavorite(
  db: Db,
  templateId: string,
  doctorId: string,
  favorite: boolean
) {
  if (favorite) {
    await db.from("care_plan_favorites").upsert({
      doctor_id: doctorId,
      template_id: templateId
    });
  } else {
    await db
      .from("care_plan_favorites")
      .delete()
      .eq("doctor_id", doctorId)
      .eq("template_id", templateId);
  }
  return { ok: true, favorite };
}

export async function listRecentCarePlans(db: Db, doctorId: string, limit = 10) {
  const { data } = await db
    .from("care_plan_recent_usage")
    .select("template_id, used_at")
    .eq("doctor_id", doctorId)
    .order("used_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function mergeCarePlansForConsultation(
  db: Db,
  doctorId: string,
  templateIds: string[],
  blockTypes?: CarePlanBlockType[]
) {
  const allCards: ReturnType<typeof blocksToAdviceCards> = [];
  const mergedBlocks: Array<{
    blockType: CarePlanBlockType;
    title: string;
    payload: Record<string, unknown>;
  }> = [];

  const byType = new Map<CarePlanBlockType, { titles: string[]; payloads: Record<string, unknown>[] }>();

  for (const tid of templateIds) {
    const detail = await getCarePlanTemplateDetail(db, tid, doctorId);
    if (!detail) continue;
    let blocks = detail.blocks;
    if (blockTypes?.length) {
      const set = new Set(blockTypes);
      blocks = blocks.filter((b) => set.has(b.blockType));
    }
    allCards.push(...blocksToAdviceCards(blocks, tid));

    for (const b of blocks) {
      const entry = byType.get(b.blockType) ?? { titles: [], payloads: [] };
      if (b.title.trim()) entry.titles.push(b.title.trim());
      entry.payloads.push(b.payload as Record<string, unknown>);
      byType.set(b.blockType, entry);
    }
  }

  for (const [blockType, { titles, payloads }] of byType) {
    mergedBlocks.push({
      blockType,
      title: titles[0] ?? blockType.replace(/_/g, " "),
      payload: mergeBlockPayloads(payloads)
    });
  }

  return { adviceCards: allCards, mergedBlocks };
}

export async function createCarePlanMedia(
  db: Db,
  clinicId: string,
  claims: AuthClaims,
  body: {
    mediaType: string;
    sourceUrl: string;
    title?: string;
    description?: string;
    isShared?: boolean;
  }
) {
  let title = body.title?.trim() ?? "";
  let thumbnailUrl: string | null = null;
  let channelName: string | null = null;
  let description = body.description ?? null;
  const metadata: Record<string, unknown> = {};

  if (body.mediaType === "youtube") {
    const meta = await fetchYouTubeOEmbed(body.sourceUrl);
    if (meta) {
      if (!title) title = meta.title;
      thumbnailUrl = meta.thumbnailUrl;
      channelName = meta.channelName;
      if (!description) description = meta.descriptionPreview || null;
      metadata.oembed = meta;
    }
  }

  const { data, error } = await db
    .from("care_plan_media")
    .insert({
      clinic_id: clinicId,
      doctor_id: claims.userId,
      media_type: body.mediaType,
      source_url: body.sourceUrl.trim(),
      title: title || "Untitled media",
      description,
      thumbnail_url: thumbnailUrl,
      channel_name: channelName,
      metadata,
      is_shared: body.isShared ?? false
    })
    .select("id, clinic_id, doctor_id, media_type, source_url, title, description, thumbnail_url, duration_seconds, channel_name, metadata, is_shared, created_at, updated_at")
    .maybeSingle();
  if (error) throw error;
  return mapMediaRow(data as CarePlanMediaRow, claims.userId);
}

export async function listCarePlanMedia(db: Db, clinicId: string, doctorId: string) {
  const { data, error } = await db
    .from("care_plan_media")
    .select("id, clinic_id, doctor_id, media_type, source_url, title, description, thumbnail_url, duration_seconds, channel_name, metadata, is_shared, created_at, updated_at")
    .eq("clinic_id", clinicId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return ((data ?? []) as CarePlanMediaRow[]).map((r) => mapMediaRow(r, doctorId));
}

export async function resolveYouTubeMetadata(sourceUrl: string) {
  const meta = await fetchYouTubeOEmbed(sourceUrl);
  if (!meta) return null;
  return meta;
}

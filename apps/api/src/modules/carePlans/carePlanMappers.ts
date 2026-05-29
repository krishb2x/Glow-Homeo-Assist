import type { CarePlanBlockType } from "@homeoassist/domain";

export type CarePlanBlockRow = {
  id: string;
  template_id: string;
  block_type: string;
  title: string;
  sort_order: number;
  payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type CarePlanTemplateRow = {
  id: string;
  clinic_id: string;
  doctor_id: string;
  title: string;
  slug: string;
  summary: string | null;
  primary_category: string;
  disease_tags: string[];
  symptom_tags: string[];
  patient_types: string[];
  age_groups: string[];
  severity: string;
  visibility: string;
  status: string;
  version: number;
  locale: string;
  is_shared: boolean;
  template_type: string;
  published_at: string | null;
  source_template_id: string | null;
  usage_count: number;
  created_at: string;
  updated_at: string;
};

export type CarePlanMediaRow = {
  id: string;
  clinic_id: string;
  doctor_id: string;
  media_type: string;
  source_url: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  channel_name: string | null;
  metadata: Record<string, unknown>;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
};

export function slugifyTitle(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return base || `plan-${Date.now()}`;
}

export function mapBlockRow(row: CarePlanBlockRow) {
  return {
    id: row.id,
    blockType: row.block_type as CarePlanBlockType,
    title: row.title,
    sortOrder: row.sort_order,
    payload: row.payload ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapTemplateSummary(
  row: CarePlanTemplateRow,
  doctorId: string,
  opts?: { isFavorite?: boolean; blockCount?: number }
) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    primaryCategory: row.primary_category,
    diseaseTags: row.disease_tags ?? [],
    symptomTags: row.symptom_tags ?? [],
    patientTypes: row.patient_types ?? [],
    ageGroups: row.age_groups ?? [],
    severity: row.severity,
    visibility: row.visibility,
    status: row.status,
    version: row.version,
    locale: row.locale,
    isShared: row.is_shared,
    isOwn: row.doctor_id === doctorId,
    isOfficial: (row.template_type ?? 'custom') === 'official',
    templateType: (row.template_type ?? 'custom') as 'official' | 'custom',
    publishedAt: row.published_at ?? null,
    isFavorite: opts?.isFavorite ?? false,
    blockCount: opts?.blockCount ?? 0,
    usageCount: row.usage_count,
    sourceTemplateId: row.source_template_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapMediaRow(row: CarePlanMediaRow, doctorId: string) {
  return {
    id: row.id,
    mediaType: row.media_type,
    sourceUrl: row.source_url,
    title: row.title,
    description: row.description,
    thumbnailUrl: row.thumbnail_url,
    durationSeconds: row.duration_seconds,
    channelName: row.channel_name,
    metadata: row.metadata ?? {},
    isShared: row.is_shared,
    isOwn: row.doctor_id === doctorId,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/** Map care plan blocks → legacy consultation advice cards. */
const BLOCK_TO_ADVICE_CATEGORY: Partial<
  Record<CarePlanBlockType, "diet" | "lifestyle" | "restriction">
> = {
  diet: "diet",
  allowed_foods: "diet",
  restricted_foods: "restriction",
  routines: "lifestyle",
  lifestyle: "lifestyle",
  exercise: "lifestyle",
  meditation: "lifestyle",
  sleep: "lifestyle",
  hydration: "lifestyle",
  precautions: "restriction",
  medication_guidance: "restriction",
  followup_guidance: "lifestyle",
  symptom_tracking: "lifestyle",
  wellness_tasks: "lifestyle",
  educational_content: "lifestyle",
  awareness_notes: "lifestyle",
  faqs: "lifestyle",
  custom_blocks: "lifestyle"
};

export type AdviceCardExport = {
  id: string;
  category: "diet" | "lifestyle" | "restriction";
  title: string;
  detail: string;
  sourceBlockId?: string;
  sourceTemplateId?: string;
};

function payloadToDetail(payload: Record<string, unknown>): string {
  const lines: string[] = [];
  if (typeof payload.intro === "string" && payload.intro.trim()) {
    lines.push(payload.intro.trim());
  }
  if (typeof payload.body === "string" && payload.body.trim()) {
    lines.push(payload.body.trim());
  }
  const items = payload.items as Array<{ text?: string; note?: string }> | undefined;
  if (Array.isArray(items)) {
    for (const it of items) {
      if (it?.text) lines.push(`• ${it.text}${it.note ? ` — ${it.note}` : ""}`);
    }
  }
  const faqs = payload.faqs as Array<{ question?: string; answer?: string }> | undefined;
  if (Array.isArray(faqs)) {
    for (const f of faqs) {
      if (f?.question) lines.push(`Q: ${f.question}\nA: ${f.answer ?? ""}`);
    }
  }
  const tasks = payload.tasks as Array<{ title?: string; description?: string }> | undefined;
  if (Array.isArray(tasks)) {
    for (const t of tasks) {
      if (t?.title) lines.push(`☐ ${t.title}${t.description ? `: ${t.description}` : ""}`);
    }
  }
  return lines.join("\n\n").slice(0, 4000);
}

export function blocksToAdviceCards(
  blocks: Array<{ id: string; blockType: CarePlanBlockType; title: string; payload: Record<string, unknown> }>,
  templateId: string
): AdviceCardExport[] {
  return blocks
    .map((b) => {
      const category = BLOCK_TO_ADVICE_CATEGORY[b.blockType];
      if (!category) return null;
      const detail = payloadToDetail(b.payload);
      if (!b.title.trim() && !detail.trim()) return null;
      return {
        id: `cpb-${b.id}`,
        category,
        title: b.title.trim() || b.blockType.replace(/_/g, " "),
        detail,
        sourceBlockId: b.id,
        sourceTemplateId: templateId
      };
    })
    .filter((x) => x !== null) as AdviceCardExport[];
}

export function mergeBlockPayloads(
  payloads: Record<string, unknown>[]
): Record<string, unknown> {
  const merged: Record<string, unknown> = {};
  const items: Array<{ id: string; text: string; note?: string }> = [];
  const faqs: Array<{ id: string; question: string; answer: string }> = [];
  const tasks: Array<{ id: string; title: string; description?: string }> = [];
  const intros: string[] = [];
  const bodies: string[] = [];

  for (const p of payloads) {
    if (typeof p.intro === "string" && p.intro.trim()) intros.push(p.intro.trim());
    if (typeof p.body === "string" && p.body.trim()) bodies.push(p.body.trim());
    if (Array.isArray(p.items)) {
      for (const it of p.items as Array<{ id?: string; text?: string; note?: string }>) {
        if (it?.text) items.push({ id: it.id ?? crypto.randomUUID(), text: it.text, note: it.note });
      }
    }
    if (Array.isArray(p.faqs)) {
      for (const f of p.faqs as Array<{ id?: string; question?: string; answer?: string }>) {
        if (f?.question) {
          faqs.push({
            id: f.id ?? crypto.randomUUID(),
            question: f.question,
            answer: f.answer ?? ""
          });
        }
      }
    }
    if (Array.isArray(p.tasks)) {
      for (const t of p.tasks as Array<{ id?: string; title?: string; description?: string }>) {
        if (t?.title) {
          tasks.push({
            id: t.id ?? crypto.randomUUID(),
            title: t.title,
            description: t.description
          });
        }
      }
    }
  }

  if (intros.length) merged.intro = intros.join("\n\n");
  if (bodies.length) merged.body = bodies.join("\n\n");
  if (items.length) merged.items = items;
  if (faqs.length) merged.faqs = faqs;
  if (tasks.length) merged.tasks = tasks;
  return merged;
}

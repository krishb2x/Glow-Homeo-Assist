/** Shared care plan types (mirrors API responses). */

export type CarePlanBlockType =
  | "diet"
  | "allowed_foods"
  | "restricted_foods"
  | "routines"
  | "lifestyle"
  | "exercise"
  | "meditation"
  | "sleep"
  | "hydration"
  | "precautions"
  | "faqs"
  | "educational_content"
  | "awareness_notes"
  | "followup_guidance"
  | "symptom_tracking"
  | "wellness_tasks"
  | "medication_guidance"
  | "custom_blocks";

export type CarePlanPrimaryCategory =
  | "wellness_plan"
  | "diet_protocol"
  | "recovery_journey"
  | "lifestyle_plan"
  | "disease_protocol"
  | "followup_guidance"
  | "education_module"
  | "custom";

export type CarePlanListItem = { id: string; text: string; note?: string; priority?: "low" | "normal" | "high" };
export type CarePlanFaqItem = { id: string; question: string; answer: string };
export type CarePlanTaskItem = { id: string; title: string; description?: string; frequency?: string; timeOfDay?: string };

export type CarePlanBlockPayload = {
  intro?: string;
  body?: string;
  items?: CarePlanListItem[];
  faqs?: CarePlanFaqItem[];
  tasks?: CarePlanTaskItem[];
  mediaIds?: string[];
};

export type CarePlanBlock = {
  id: string;
  blockType: CarePlanBlockType;
  title: string;
  sortOrder: number;
  payload: CarePlanBlockPayload;
  createdAt?: string;
  updatedAt?: string;
};

export type CarePlanTemplateSummary = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  primaryCategory: CarePlanPrimaryCategory;
  diseaseTags: string[];
  symptomTags: string[];
  patientTypes: string[];
  ageGroups: string[];
  severity: string;
  visibility: string;
  status: string;
  version: number;
  locale: string;
  isShared: boolean;
  isOwn: boolean;
  isFavorite: boolean;
  blockCount: number;
  usageCount: number;
  sourceTemplateId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CarePlanTemplateDetail = CarePlanTemplateSummary & {
  blocks: CarePlanBlock[];
  mediaLinks: Array<{
    mediaId: string;
    blockId: string | null;
    sortOrder: number;
    caption: string | null;
    media: CarePlanMedia | null;
  }>;
};

export type CarePlanMedia = {
  id: string;
  mediaType: string;
  sourceUrl: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  channelName: string | null;
  metadata: Record<string, unknown>;
  isShared: boolean;
  isOwn: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CarePlanAdviceCard = {
  id: string;
  category: "diet" | "lifestyle" | "restriction";
  title: string;
  detail: string;
  sourceBlockId?: string;
  sourceTemplateId?: string;
};

export const CARE_PLAN_BLOCK_LABELS: Record<CarePlanBlockType, string> = {
  diet: "Diet guidance",
  allowed_foods: "Allowed foods",
  restricted_foods: "Foods to avoid",
  routines: "Daily routines",
  lifestyle: "Lifestyle",
  exercise: "Exercise",
  meditation: "Meditation & mindfulness",
  sleep: "Sleep hygiene",
  hydration: "Hydration",
  precautions: "Precautions",
  faqs: "FAQs",
  educational_content: "Educational content",
  awareness_notes: "Awareness notes",
  followup_guidance: "Follow-up guidance",
  symptom_tracking: "Symptom tracking",
  wellness_tasks: "Wellness tasks",
  medication_guidance: "Medication guidance",
  custom_blocks: "Custom section"
};

export const CARE_PLAN_CATEGORY_LABELS: Record<CarePlanPrimaryCategory, string> = {
  wellness_plan: "Wellness plan",
  diet_protocol: "Diet protocol",
  recovery_journey: "Recovery journey",
  lifestyle_plan: "Lifestyle plan",
  disease_protocol: "Disease protocol",
  followup_guidance: "Follow-up guidance",
  education_module: "Education module",
  custom: "Custom"
};

export const CARE_PLAN_BLOCK_GROUPS: { label: string; types: CarePlanBlockType[] }[] = [
  { label: "Nutrition", types: ["diet", "allowed_foods", "restricted_foods", "hydration"] },
  { label: "Daily living", types: ["routines", "lifestyle", "exercise", "sleep", "meditation"] },
  { label: "Clinical", types: ["precautions", "medication_guidance", "symptom_tracking", "followup_guidance"] },
  { label: "Education", types: ["educational_content", "awareness_notes", "faqs", "wellness_tasks", "custom_blocks"] }
];

export function newListItem(text = ""): CarePlanListItem {
  return { id: crypto.randomUUID(), text, priority: "normal" };
}

export function newBlock(blockType: CarePlanBlockType, sortOrder: number): Omit<CarePlanBlock, "createdAt" | "updatedAt"> {
  return {
    id: crypto.randomUUID(),
    blockType,
    title: CARE_PLAN_BLOCK_LABELS[blockType],
    sortOrder,
    payload: { items: [], faqs: [], tasks: [] }
  };
}

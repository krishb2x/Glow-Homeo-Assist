import { z } from "zod";

/** Modular block types for structured patient care plans. */
export const CarePlanBlockTypeSchema = z.enum([
  "diet",
  "allowed_foods",
  "restricted_foods",
  "routines",
  "lifestyle",
  "exercise",
  "meditation",
  "sleep",
  "hydration",
  "precautions",
  "faqs",
  "educational_content",
  "awareness_notes",
  "followup_guidance",
  "symptom_tracking",
  "wellness_tasks",
  "medication_guidance",
  "custom_blocks"
]);
export type CarePlanBlockType = z.infer<typeof CarePlanBlockTypeSchema>;

export const CarePlanPrimaryCategorySchema = z.enum([
  "wellness_plan",
  "diet_protocol",
  "recovery_journey",
  "lifestyle_plan",
  "disease_protocol",
  "followup_guidance",
  "education_module",
  "custom"
]);

export const CarePlanSeveritySchema = z.enum(["any", "mild", "moderate", "severe"]);
export const CarePlanVisibilitySchema = z.enum(["private", "clinic", "archived"]);
export const CarePlanStatusSchema = z.enum(["draft", "published", "archived"]);

export const CarePlanMediaTypeSchema = z.enum([
  "youtube",
  "link",
  "pdf",
  "image",
  "infographic",
  "food_chart",
  "illustration"
]);

/** List item / bullet inside a block. */
export const CarePlanListItemSchema = z.object({
  id: z.string().min(1).max(80),
  text: z.string().min(1).max(2000),
  note: z.string().max(2000).optional(),
  priority: z.enum(["low", "normal", "high"]).optional()
});

/** FAQ pair inside faqs block. */
export const CarePlanFaqItemSchema = z.object({
  id: z.string().min(1).max(80),
  question: z.string().min(1).max(500),
  answer: z.string().max(4000)
});

/** Wellness task with optional schedule hint. */
export const CarePlanTaskItemSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().min(1).max(300),
  description: z.string().max(2000).optional(),
  frequency: z.string().max(120).optional(),
  timeOfDay: z.string().max(80).optional()
});

/** Structured payload per block — stored as JSONB. */
export const CarePlanBlockPayloadSchema = z.object({
  intro: z.string().max(4000).optional(),
  items: z.array(CarePlanListItemSchema).max(100).optional(),
  faqs: z.array(CarePlanFaqItemSchema).max(50).optional(),
  tasks: z.array(CarePlanTaskItemSchema).max(50).optional(),
  body: z.string().max(8000).optional(),
  mediaIds: z.array(z.string().uuid()).max(20).optional()
});
export type CarePlanBlockPayload = z.infer<typeof CarePlanBlockPayloadSchema>;

export const CarePlanBlockInputSchema = z.object({
  id: z.string().uuid().optional(),
  blockType: CarePlanBlockTypeSchema,
  title: z.string().max(200).default(""),
  sortOrder: z.number().int().min(0).max(999).optional(),
  payload: CarePlanBlockPayloadSchema.default({})
});
export type CarePlanBlockInput = z.infer<typeof CarePlanBlockInputSchema>;

export const CarePlanMediaInputSchema = z.object({
  id: z.string().uuid().optional(),
  mediaType: CarePlanMediaTypeSchema,
  sourceUrl: z.string().url().max(2000),
  title: z.string().max(500).default(""),
  description: z.string().max(4000).optional(),
  thumbnailUrl: z.string().url().max(2000).optional(),
  durationSeconds: z.number().int().min(0).optional(),
  channelName: z.string().max(200).optional(),
  metadata: z.record(z.unknown()).optional(),
  isShared: z.boolean().optional()
});

export const CarePlanTemplateBodySchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  summary: z.string().max(2000).optional().nullable(),
  primaryCategory: CarePlanPrimaryCategorySchema.optional(),
  diseaseTags: z.array(z.string().max(80)).max(30).optional(),
  symptomTags: z.array(z.string().max(80)).max(30).optional(),
  patientTypes: z.array(z.string().max(80)).max(20).optional(),
  ageGroups: z.array(z.string().max(40)).max(10).optional(),
  severity: CarePlanSeveritySchema.optional(),
  visibility: CarePlanVisibilitySchema.optional(),
  status: CarePlanStatusSchema.optional(),
  locale: z.string().min(2).max(12).optional(),
  isShared: z.boolean().optional(),
  blocks: z.array(CarePlanBlockInputSchema).max(40).optional(),
  mediaLinks: z
    .array(
      z.object({
        mediaId: z.string().uuid(),
        blockId: z.string().uuid().optional().nullable(),
        sortOrder: z.number().int().min(0).optional(),
        caption: z.string().max(500).optional()
      })
    )
    .max(30)
    .optional()
});

export const CarePlanMergeBodySchema = z.object({
  templateIds: z.array(z.string().uuid()).min(1).max(10),
  blockTypes: z.array(CarePlanBlockTypeSchema).max(20).optional()
});

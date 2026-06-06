import { z } from "zod";

export const TpBlockConfigSchema = z.record(z.unknown()); // Very flexible for V1
export type TpBlockConfig = z.infer<typeof TpBlockConfigSchema>;

export const TpBlockSchema = z.object({
  id: z.string().uuid().optional(),
  category: z.string(), // e.g. 'content', 'medical', 'tracking', 'assessment'
  block_type: z.string(), // e.g. 'mcq', 'video', 'pdf'
  config: TpBlockConfigSchema,
  sort_order: z.number().int().default(0),
  is_required: z.boolean().default(false)
});
export type TpBlock = z.infer<typeof TpBlockSchema>;

export const TpStepSchema = z.object({
  id: z.string().uuid().optional(),
  day_offset: z.number().int().min(0),
  title: z.string().min(1),
  sort_order: z.number().int().default(0),
  blocks: z.array(TpBlockSchema).default([])
});
export type TpStep = z.infer<typeof TpStepSchema>;

export const TpProgramSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  duration_days: z.number().int().min(1).nullable().optional(),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  steps: z.array(TpStepSchema).default([])
});
export type TpProgram = z.infer<typeof TpProgramSchema>;

export const TpAssignmentSchema = z.object({
  id: z.string().uuid().optional(),
  patient_id: z.string().uuid(),
  program_id: z.string().uuid(),
  status: z.enum(["active", "paused", "completed", "cancelled"]).default("active")
});
export type TpAssignment = z.infer<typeof TpAssignmentSchema>;

export const TpResponseSchema = z.object({
  id: z.string().uuid().optional(),
  assignment_id: z.string().uuid(),
  block_id: z.string().uuid(),
  response_data: z.record(z.unknown()),
  score: z.number().nullable().optional()
});
export type TpResponse = z.infer<typeof TpResponseSchema>;

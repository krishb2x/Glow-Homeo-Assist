import { z } from "zod";

export const ContentCourseStatusSchema = z.enum(["draft", "published", "archived"]);

export const ContentLessonTypeSchema = z.enum([
  "video",
  "pdf",
  "quiz",
  "audio",
  "assignment",
  "certification",
  "text"
]);

export const ContentLessonPayloadSchema = z.object({
  videoUrl: z.string().url().max(2000).optional(),
  pdfUrl: z.string().url().max(2000).optional(),
  audioUrl: z.string().url().max(2000).optional(),
  textContent: z.string().max(8000).optional(),
  quizData: z.record(z.unknown()).optional(),
  durationSeconds: z.number().int().min(0).optional()
});

export const ContentLessonInputSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  contentType: ContentLessonTypeSchema,
  contentPayload: ContentLessonPayloadSchema.default({}),
  sortOrder: z.number().int().min(0).optional(),
  isPreview: z.boolean().default(false)
});

export const ContentModuleInputSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  sortOrder: z.number().int().min(0).optional(),
  lessons: z.array(ContentLessonInputSchema).default([])
});

export const ContentCourseInputSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(4000).optional().nullable(),
  thumbnailUrl: z.string().url().max(2000).optional().nullable(),
  status: ContentCourseStatusSchema.default("draft"),
  modules: z.array(ContentModuleInputSchema).default([])
});

export type ContentCourseInput = z.infer<typeof ContentCourseInputSchema>;
export type ContentModuleInput = z.infer<typeof ContentModuleInputSchema>;
export type ContentLessonInput = z.infer<typeof ContentLessonInputSchema>;

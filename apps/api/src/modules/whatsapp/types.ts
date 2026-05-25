import { z } from "zod";

export const WHATSAPP_VARIABLES = [
  "patient_name",
  "patient_age",
  "patient_phone",
  "clinic_name",
  "doctor_name",
  "last_visit_date",
  "chief_complaint",
  "appointment_date",
  "prescription_link",
  "followup_date"
] as const;

export type WhatsAppVariable = (typeof WHATSAPP_VARIABLES)[number];

export const AudienceSpecSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("all") }),
  z.object({
    mode: z.literal("individual"),
    patientIds: z.array(z.string().uuid()).min(1).max(500)
  }),
  z.object({
    mode: z.literal("tags"),
    tags: z.array(z.string().min(1).max(40)).min(1).max(20)
  }),
  z.object({
    mode: z.literal("filter"),
    filter: z
      .object({
        status: z.enum(["stable", "critical"]).optional(),
        tags: z.array(z.string()).optional(),
        hasPhone: z.boolean().optional(),
        search: z.string().max(120).optional(),
        inactiveDaysMin: z.number().int().min(1).max(3650).optional(),
        lastVisitWithinDays: z.number().int().min(1).max(3650).optional(),
        treatmentCategory: z.string().max(80).optional()
      })
      .optional()
  })
]);

export type AudienceSpec = z.infer<typeof AudienceSpecSchema>;

export const ConnectionUpsertSchema = z.object({
  provider: z.enum(["meta_cloud", "twilio"]).default("meta_cloud"),
  wabaId: z.string().max(80).optional(),
  phoneNumberId: z.string().max(80).optional(),
  displayPhone: z.string().max(40).optional(),
  accessToken: z.string().min(10).max(2000).optional()
});

export const TemplateCreateSchema = z.object({
  name: z.string().min(2).max(120),
  metaTemplateName: z.string().max(120).optional(),
  languageCode: z.string().max(12).default("en"),
  category: z.enum(["MARKETING", "UTILITY", "AUTHENTICATION"]).default("UTILITY"),
  body: z.string().min(1).max(4000),
  status: z.enum(["draft", "pending_approval", "approved", "rejected"]).default("draft")
});

export const BroadcastCreateSchema = z.object({
  templateId: z.string().uuid().optional(),
  body: z.string().min(1).max(4000),
  audience: AudienceSpecSchema,
  scheduledAt: z.string().datetime({ offset: true }).optional()
});

export type WhatsAppConnectionRow = {
  id: string;
  clinic_id: string;
  doctor_id: string;
  provider: string;
  waba_id: string | null;
  phone_number_id: string | null;
  display_phone: string | null;
  access_token: string | null;
  status: string;
  verified_at: string | null;
  quality_rating: string | null;
};

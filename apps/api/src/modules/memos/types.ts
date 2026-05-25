import { z } from "zod";

export const MemoKindSchema = z.enum(["note", "reminder", "follow_up"]);
export const MemoPrioritySchema = z.enum(["normal", "urgent"]);
export const MemoStatusSchema = z.enum(["open", "done", "dismissed"]);

export const CreateMemoBodySchema = z.object({
  body: z.string().trim().min(1).max(4000),
  kind: MemoKindSchema.default("note"),
  patientId: z.string().uuid().optional(),
  consultationId: z.string().uuid().optional(),
  dueAt: z
    .string()
    .refine((s) => !Number.isNaN(Date.parse(s)), "Invalid date")
    .optional(),
  priority: MemoPrioritySchema.default("normal"),
  pinned: z.boolean().default(false)
});

export const PatchMemoBodySchema = z
  .object({
    body: z.string().trim().min(1).max(4000).optional(),
    kind: MemoKindSchema.optional(),
    dueAt: z
      .string()
      .nullable()
      .refine((s) => s == null || !Number.isNaN(Date.parse(s)), "Invalid date")
      .optional(),
    priority: MemoPrioritySchema.optional(),
    pinned: z.boolean().optional(),
    status: MemoStatusSchema.optional()
  })
  .refine((o) => Object.keys(o).length > 0, "At least one field required");

export type MemoRow = {
  id: string;
  clinic_id: string;
  doctor_id: string;
  patient_id: string | null;
  consultation_id: string | null;
  kind: "note" | "reminder" | "follow_up";
  body: string;
  due_at: string | null;
  priority: "normal" | "urgent";
  pinned: boolean;
  status: "open" | "done" | "dismissed";
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type MemoOut = {
  id: string;
  kind: "note" | "reminder" | "follow_up";
  body: string;
  dueAt: string | null;
  priority: "normal" | "urgent";
  pinned: boolean;
  status: "open" | "done" | "dismissed";
  patientId: string | null;
  patientName: string | null;
  consultationId: string | null;
  doctorId: string;
  overdue: boolean;
  createdAt: string;
  updatedAt: string;
};

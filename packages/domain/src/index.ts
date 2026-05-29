import { z } from "zod";

// Canonical clinical record (Zod) + sub-shapes used by 9-step consult UI.
// See docs/architecture/03_SCHEMA.md §6.
export * from "./schemas/clinicalRecord";
export * from "./schemas/carePlan";
export * from "./schemas/contentLibrary";

/** MVP: staff roles SUPER_ADMIN + DOCTOR; PATIENT is backend-only (no web app). */
export const RoleSchema = z.enum(["SUPER_ADMIN", "DOCTOR", "PATIENT"]);

export const ClinicSchema = z.object({
  id: z.string(),
  name: z.string(),
  isActive: z.boolean().default(true),
  region: z.string().default("IN")
});

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  passwordHash: z.string(),
  role: RoleSchema,
  clinicId: z.string().nullable()
});

export const OnboardingRequestSchema = z.object({
  id: z.string(),
  doctorName: z.string(),
  email: z.string().email(),
  degreeDocumentUrl: z.string().url(),
  status: z.enum(["PENDING", "VERIFIED", "REJECTED", "PROVISIONED"])
});

export type Role = z.infer<typeof RoleSchema>;
export type Clinic = z.infer<typeof ClinicSchema>;
export type User = z.infer<typeof UserSchema>;
export type OnboardingRequest = z.infer<typeof OnboardingRequestSchema>;

/** POST /doctor/patients (Express API) */
export const PatientCreateBodySchema = z.object({
  name: z.string().min(2),
  phone: z.string().optional(),
  languagePreference: z.string().optional(),
  age: z.coerce.number().int().min(0).max(150).optional(),
  /** ISO date string YYYY-MM-DD. Preferred over age. */
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  gender: z.string().max(80).optional(),
  address: z.string().max(2000).optional(),
  initialChiefComplaint: z.string().max(4000).optional(),
  patientNotes: z.string().max(8000).optional(),
  /** Allergies / sensitivities — free text, surfaced on chart header. */
  allergies: z.string().max(2000).optional(),
  /** Emergency contact name. */
  emergencyContactName: z.string().max(160).optional(),
  /** Emergency contact phone. */
  emergencyContactPhone: z.string().max(40).optional(),
  /** Blood group label (e.g. O+, AB-). */
  bloodGroup: z.string().max(8).optional(),
  /** Free-text long-term conditions / outside-Rx. */
  ongoingConditions: z.string().max(2000).optional(),
  /** Workflow tags shown in list and chart. */
  tags: z.array(z.string().max(40)).max(20).optional()
});

export type PatientCreateBody = z.infer<typeof PatientCreateBodySchema>;

/** PATCH /doctor/patients/:id */
export const PatientPatchBodySchema = PatientCreateBodySchema.partial().refine(
  (o) => Object.keys(o).length > 0,
  { message: "Provide at least one field" }
);

export type PatientPatchBody = z.infer<typeof PatientPatchBodySchema>;

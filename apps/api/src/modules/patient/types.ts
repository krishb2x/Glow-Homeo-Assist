/**
 * Shared types for the patient mobile namespace (/patient/*).
 *
 * The patient namespace is read-mostly: every authenticated patient call resolves
 * `patientId` server-side via `patients.auth_user_id = auth.uid()` and never trusts
 * a client-supplied patient id.
 *
 * See docs/PATIENT_MOBILE_APP.md and docs/MOBILE_API.md for the full contract.
 */

import type { Request } from "express";
import type { AuthClaims } from "../../auth";

export type PatientContext = {
  /** Supabase auth user id (matches profiles.id for the PATIENT role). */
  authUserId: string;
  /** Resolved row in public.patients. */
  patientId: string;
  /** Clinic the patient belongs to (mirrors patients.clinic_id). */
  clinicId: string;
  /** Raw Supabase access token (used to build RLS-scoped supabase clients). */
  accessToken: string;
};

/** Express request decorated by `requirePatientAuth`. */
export type PatientRequest = Request & {
  user: AuthClaims;
  patient: PatientContext;
};

/** Slot ids match `PrescriptionItemSchema.timingSlots` in @homeoassist/domain. */
export type MedicationSlot = "morning" | "afternoon" | "evening" | "night";

export type MedicationLogStatus = "TAKEN" | "SKIPPED" | "DELAYED";

export type PatientPushPlatform = "ios" | "android" | "web";

/** Topic prefix used by the queue dispatcher for patient-bound notifications. */
export const PATIENT_TOPIC_PREFIX = "patient.";

export const PATIENT_NOTIFICATION_TOPICS = {
  medicationReminder: "patient.medication_reminder",
  dietReminder: "patient.diet_reminder",
  followUpDue: "patient.follow_up_due",
  appointmentReminder24h: "patient.appointment_reminder_24h",
  appointmentReminder1h: "patient.appointment_reminder_1h",
  messageFromClinic: "patient.message_from_clinic",
  prescriptionReady: "patient.prescription_ready",
  newContent: "patient.new_content"
} as const;

export type PatientNotificationTopic =
  (typeof PATIENT_NOTIFICATION_TOPICS)[keyof typeof PATIENT_NOTIFICATION_TOPICS];

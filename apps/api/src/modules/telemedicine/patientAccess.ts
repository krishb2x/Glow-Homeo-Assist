import type { SupabaseClient } from "@supabase/supabase-js";
import { v4 as uuid } from "uuid";
import { AppError } from "../../lib/errors";
import { isMissingDbObjectError, SCHEMA_MIGRATION_HINT } from "../../lib/dbErrors";
import type { PatientAccessPurpose } from "./types";
import { env } from "../../config/env";

function publicAppBase(): string {
  return (
    env.APP_PUBLIC_URL?.trim() ||
    env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export function joinUrl(token: string): string {
  return `${publicAppBase()}/join/${token}`;
}

export function prescriptionUrl(token: string): string {
  return `${publicAppBase()}/patient/rx/${token}`;
}

export async function createPatientAccessToken(args: {
  admin: SupabaseClient;
  clinicId: string;
  patientId: string;
  purpose: PatientAccessPurpose;
  consultationId?: string | null;
  appointmentId?: string | null;
  expiresInHours?: number;
}): Promise<{ token: string; url: string; expiresAt: string }> {
  const token = uuid();
  const hours = args.expiresInHours ?? (args.purpose === "join_consultation" ? 72 : 168);
  const expiresAt = new Date(Date.now() + hours * 3600000).toISOString();

  const { error } = await args.admin.from("patient_access_tokens").insert({
    clinic_id: args.clinicId,
    patient_id: args.patientId,
    consultation_id: args.consultationId ?? null,
    appointment_id: args.appointmentId ?? null,
    purpose: args.purpose,
    token,
    expires_at: expiresAt
  });
  if (error) {
    if (isMissingDbObjectError(error)) {
      throw new AppError(`patient_access_tokens table is missing. ${SCHEMA_MIGRATION_HINT}`, {
        code: "SCHEMA_NOT_READY",
        statusCode: 503,
        kind: "operational"
      });
    }
    throw new Error(error.message);
  }

  const url =
    args.purpose === "view_prescription" || args.purpose === "view_report"
      ? prescriptionUrl(token)
      : joinUrl(token);

  return { token, url, expiresAt };
}

export async function resolvePatientAccessToken(
  admin: SupabaseClient,
  token: string
): Promise<{
  valid: boolean;
  purpose?: PatientAccessPurpose;
  consultationId?: string;
  patientId?: string;
  clinicId?: string;
  appointmentId?: string | null;
}> {
  const { data, error } = await admin
    .from("patient_access_tokens")
    .select("purpose,consultation_id,patient_id,clinic_id,appointment_id,expires_at")
    .eq("token", token)
    .maybeSingle();

  if (error || !data) return { valid: false };
  const row = data as {
    purpose: PatientAccessPurpose;
    consultation_id: string | null;
    patient_id: string;
    clinic_id: string;
    appointment_id: string | null;
    expires_at: string;
  };
  if (new Date(row.expires_at).getTime() < Date.now()) return { valid: false };

  return {
    valid: true,
    purpose: row.purpose,
    consultationId: row.consultation_id ?? undefined,
    patientId: row.patient_id,
    clinicId: row.clinic_id,
    appointmentId: row.appointment_id
  };
}

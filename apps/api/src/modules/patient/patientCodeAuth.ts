import crypto from "node:crypto";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { supabaseAdmin, supabaseAnon } from "../../supabase";
import { isMissingDbObjectError, SCHEMA_MIGRATION_HINT } from "../../lib/dbErrors";
import { logger } from "../../lib/logger";
import { AppError } from "../../lib/errors";

export type PatientRowForAuth = {
  id: string;
  clinic_id: string;
  name: string;
  phone: string | null;
  patient_code: string | null;
  auth_user_id: string | null;
};

/** Normalize codes from prescription slips (spaces, case). */
export function normalizePatientCode(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

/** Internal auth email — not shown to patients; login uses patient_code only. */
export function patientAuthEmail(patientId: string): string {
  return `p.${patientId}@patient.internal.glowhomeo`;
}

function authPepper(): string {
  const pepper = process.env.PATIENT_AUTH_PEPPER?.trim() || process.env.JWT_SECRET?.trim();
  if (!pepper) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("PATIENT_AUTH_PEPPER or JWT_SECRET is required for patient login");
    }
    return "dev-patient-auth-pepper";
  }
  return pepper;
}

export function patientAuthPassword(patientId: string): string {
  const hash = crypto.createHmac("sha256", authPepper()).update(patientId).digest("base64url");
  return `${hash.slice(0, 24)}Aa1!`;
}

export async function findPatientByCode(
  admin: SupabaseClient,
  patientCode: string
): Promise<PatientRowForAuth | null> {
  const normalized = normalizePatientCode(patientCode);
  if (!normalized) return null;

  let { data, error } = await admin
    .from("patients")
    .select("id,clinic_id,name,phone,patient_code,auth_user_id")
    .eq("patient_code", normalized)
    .limit(2);

  if (error && isMissingDbObjectError(error)) {
    throw new AppError(
      `patients.patient_code is missing. Apply 20260528000000_healthcare_references.sql. ${SCHEMA_MIGRATION_HINT}`,
      { code: "SCHEMA_NOT_READY", statusCode: 503, kind: "operational" }
    );
  }

  if (!error && (!data || data.length === 0)) {
    const ilike = await admin
      .from("patients")
      .select("id,clinic_id,name,phone,patient_code,auth_user_id")
      .ilike("patient_code", normalized)
      .limit(2);
    data = ilike.data;
    error = ilike.error;
  }

  if (error) {
    logger.warn("patient_code_lookup_failed", { message: error.message });
    throw error;
  }

  const rows = (data ?? []) as PatientRowForAuth[];
  if (rows.length === 0) return null;
  if (rows.length > 1) {
    logger.warn("patient_code_ambiguous", { patientCode: normalized, count: rows.length });
  }
  return rows[0] ?? null;
}

async function ensureAuthUser(patient: PatientRowForAuth): Promise<User> {
  const email = patientAuthEmail(patient.id);
  const password = patientAuthPassword(patient.id);

  if (patient.auth_user_id) {
    const { data: existing, error } = await supabaseAdmin.auth.admin.getUserById(patient.auth_user_id);
    if (!error && existing.user) {
      return existing.user;
    }
    logger.warn("patient_auth_user_stale", { patientId: patient.id, authUserId: patient.auth_user_id });
  }

  const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: patient.name,
      patient_id: patient.id,
      clinic_id: patient.clinic_id,
      role: "patient"
    }
  });

  if (createErr) {
    const msg = (createErr.message ?? "").toLowerCase();
    if (msg.includes("registered") || msg.includes("exists") || msg.includes("already")) {
      const { data: signInData, error: signInErr } = await supabaseAnon.auth.signInWithPassword({
        email,
        password
      });
      if (signInErr || !signInData.user) {
        throw createErr;
      }
      return signInData.user;
    }
    throw createErr;
  }

  if (!created.user) {
    throw new Error("createUser returned no user");
  }

  const { error: linkErr } = await supabaseAdmin
    .from("patients")
    .update({ auth_user_id: created.user.id })
    .eq("id", patient.id);

  if (linkErr) {
    logger.error("patient_auth_link_failed", { patientId: patient.id, message: linkErr.message });
    if (isMissingDbObjectError(linkErr)) {
      throw new AppError(
        `patients.auth_user_id is missing. Apply 20260527000000_patient_mobile.sql. ${SCHEMA_MIGRATION_HINT}`,
        { code: "SCHEMA_NOT_READY", statusCode: 503, kind: "operational" }
      );
    }
    throw linkErr;
  }

  return created.user;
}

export async function loginPatientWithCode(patientCode: string): Promise<{
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
    expires_in: number;
  };
  patient: PatientRowForAuth;
  clinic: { id: string; name: string };
}> {
  const patient = await findPatientByCode(supabaseAdmin, patientCode);
  if (!patient) {
    const err = new Error("Invalid patient code");
    (err as Error & { code: string }).code = "INVALID_PATIENT_CODE";
    throw err;
  }
  if (!patient.patient_code?.trim()) {
    const err = new Error("Patient has no code assigned");
    (err as Error & { code: string }).code = "PATIENT_CODE_MISSING";
    throw err;
  }

  await ensureAuthUser(patient);

  const email = patientAuthEmail(patient.id);
  const password = patientAuthPassword(patient.id);
  const { data, error } = await supabaseAnon.auth.signInWithPassword({ email, password });
  if (error || !data.session || !data.user) {
    logger.error("patient_code_sign_in_failed", { patientId: patient.id, message: error?.message });
    throw error ?? new Error("signInWithPassword failed");
  }

  if (!patient.auth_user_id || patient.auth_user_id !== data.user.id) {
    await supabaseAdmin.from("patients").update({ auth_user_id: data.user.id }).eq("id", patient.id);
    patient.auth_user_id = data.user.id;
  }

  const { data: clinicRow, error: clinicErr } = await supabaseAdmin
    .from("clinics")
    .select("id,name")
    .eq("id", patient.clinic_id)
    .maybeSingle();

  if (clinicErr || !clinicRow) {
    throw clinicErr ?? new Error("clinic not found");
  }

  const clinic = clinicRow as { id: string; name: string };

  return {
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at ?? 0,
      expires_in: data.session.expires_in ?? 3600
    },
    patient,
    clinic
  };
}

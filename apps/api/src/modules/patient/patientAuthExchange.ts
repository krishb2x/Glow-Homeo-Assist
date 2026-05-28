import { resolvePatientAccessToken } from "../telemedicine/patientAccess";
import { supabaseAdmin } from "../../supabase";
import { loginPatientWithCode } from "./patientCodeAuth";
import type { PatientRowForAuth } from "./patientCodeAuth";
import { patientAuthEmail, patientAuthPassword } from "./patientCodeAuth";
import { supabaseAnon } from "../../supabase";

export async function loginPatientWithAccessToken(token: string): Promise<
  Awaited<ReturnType<typeof loginPatientWithCode>>
> {
  const resolved = await resolvePatientAccessToken(supabaseAdmin, token);
  if (!resolved.valid || !resolved.patientId || !resolved.clinicId) {
    const err = new Error("Invalid or expired token");
    (err as Error & { code: string }).code = "INVALID_TOKEN";
    throw err;
  }

  const { data: patient, error } = await supabaseAdmin
    .from("patients")
    .select("id,clinic_id,name,phone,patient_code,auth_user_id")
    .eq("id", resolved.patientId)
    .maybeSingle();

  if (error || !patient) {
    const err = new Error("Patient not found");
    (err as Error & { code: string }).code = "NOT_FOUND";
    throw err;
  }

  const row = patient as PatientRowForAuth;
  if (row.patient_code?.trim()) {
    return loginPatientWithCode(row.patient_code);
  }

  const email = patientAuthEmail(row.id);
  const password = patientAuthPassword(row.id);
  const { data, error: signErr } = await supabaseAnon.auth.signInWithPassword({ email, password });
  if (signErr || !data.session) {
    const err = new Error("Unable to sign in");
    (err as Error & { code: string }).code = "AUTH_FAILED";
    throw err;
  }

  const { data: clinicRow } = await supabaseAdmin
    .from("clinics")
    .select("id,name")
    .eq("id", row.clinic_id)
    .maybeSingle();

  return {
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at ?? 0,
      expires_in: data.session.expires_in ?? 3600
    },
    patient: row,
    clinic: (clinicRow as { id: string; name: string }) ?? { id: row.clinic_id, name: "Clinic" }
  };
}

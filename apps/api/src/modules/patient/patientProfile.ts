import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingDbObjectError } from "../../lib/dbErrors";

const PATIENT_PROFILE_FULL =
  "id,name,phone,language_preference,age,date_of_birth,gender,address,patient_notes,initial_chief_complaint,created_at,allergies,emergency_contact_name,emergency_contact_phone,blood_group,ongoing_conditions,tags,follow_up_status,visit_count,last_visit_at,last_prescription_at,patient_code";

const PATIENT_PROFILE_LEGACY =
  "id,name,phone,language_preference,age,gender,address,patient_notes,initial_chief_complaint,created_at,allergies,emergency_contact_name,emergency_contact_phone,blood_group,ongoing_conditions,tags,patient_code";

export type PatientProfileDto = {
  id: string;
  name: string;
  phone?: string;
  languagePreference?: string | null;
  age?: number;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  patientNotes?: string;
  initialChiefComplaint?: string;
  allergies?: string;
  emergencyContact?: { name?: string; phone?: string };
  bloodGroup?: string;
  ongoingConditions?: string;
  tags?: string[];
  followUpStatus?: string;
  visitCount?: number;
  lastVisitAt?: string;
  lastPrescriptionAt?: string;
  patientCode?: string;
  createdAt?: string;
};

function mapPatientRow(row: Record<string, unknown>, hasDob: boolean): PatientProfileDto {
  return {
    id: row.id as string,
    name: row.name as string,
    phone: (row.phone as string | null) ?? undefined,
    languagePreference: (row.language_preference as string | null) ?? undefined,
    age: (row.age as number | null) ?? undefined,
    dateOfBirth: hasDob ? ((row.date_of_birth as string | null) ?? undefined) : undefined,
    gender: (row.gender as string | null) ?? undefined,
    address: (row.address as string | null) ?? undefined,
    patientNotes: (row.patient_notes as string | null) ?? undefined,
    initialChiefComplaint: (row.initial_chief_complaint as string | null) ?? undefined,
    allergies: (row.allergies as string | null) ?? undefined,
    emergencyContact:
      row.emergency_contact_name || row.emergency_contact_phone
        ? {
            name: (row.emergency_contact_name as string) ?? undefined,
            phone: (row.emergency_contact_phone as string) ?? undefined
          }
        : undefined,
    bloodGroup: (row.blood_group as string | null) ?? undefined,
    ongoingConditions: (row.ongoing_conditions as string | null) ?? undefined,
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : undefined,
    followUpStatus: (row.follow_up_status as string | null) ?? undefined,
    visitCount: (row.visit_count as number | null) ?? undefined,
    lastVisitAt: (row.last_visit_at as string | null) ?? undefined,
    lastPrescriptionAt: (row.last_prescription_at as string | null) ?? undefined,
    patientCode: (row.patient_code as string | null) ?? undefined,
    createdAt: (row.created_at as string | null) ?? undefined
  };
}

export async function fetchPatientProfile(
  admin: SupabaseClient,
  patientId: string,
  clinicId: string
): Promise<PatientProfileDto | null> {
  let hasDob = true;
  let row: Record<string, unknown> | null = null;
  let err: { message?: string; code?: string } | null = null;

  const full = await admin
    .from("patients")
    .select(PATIENT_PROFILE_FULL)
    .eq("id", patientId)
    .eq("clinic_id", clinicId)
    .maybeSingle();

  row = full.data as Record<string, unknown> | null;
  err = full.error;

  if (err && isMissingDbObjectError(err)) {
    const legacy = await admin
      .from("patients")
      .select(PATIENT_PROFILE_LEGACY)
      .eq("id", patientId)
      .eq("clinic_id", clinicId)
      .maybeSingle();
    row = legacy.data as Record<string, unknown> | null;
    err = legacy.error;
    hasDob = false;
  }

  if (err) throw err;
  if (!row) return null;
  return mapPatientRow(row, hasDob);
}

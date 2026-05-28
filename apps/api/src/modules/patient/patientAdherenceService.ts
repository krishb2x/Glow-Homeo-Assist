import type { SupabaseClient } from "@supabase/supabase-js";
import type { PatientContext, MedicationLogStatus, MedicationSlot } from "./types";

function utcDateString(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export async function upsertMedicationLog(
  admin: SupabaseClient,
  ctx: PatientContext,
  body: {
    prescriptionId: string;
    itemId: string;
    slot: MedicationSlot;
    status: MedicationLogStatus;
    takenAt?: string;
    note?: string;
  }
): Promise<Record<string, unknown>> {
  const takenAt = body.takenAt ?? new Date().toISOString();
  const takenDate = utcDateString(new Date(takenAt));

  const { data: rx } = await admin
    .from("prescriptions")
    .select("id")
    .eq("id", body.prescriptionId)
    .eq("patient_id", ctx.patientId)
    .eq("clinic_id", ctx.clinicId)
    .maybeSingle();

  if (!rx) {
    const err = new Error("Prescription not found");
    (err as Error & { code: string }).code = "NOT_FOUND";
    throw err;
  }

  const payload = {
    clinic_id: ctx.clinicId,
    patient_id: ctx.patientId,
    prescription_id: body.prescriptionId,
    item_id: body.itemId,
    slot: body.slot,
    taken_date: takenDate,
    taken_at: takenAt,
    status: body.status,
    note: body.note ?? null,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await admin
    .from("patient_medication_logs")
    .upsert(payload, { onConflict: "patient_id,prescription_id,item_id,slot,taken_date" })
    .select("id,prescription_id,item_id,slot,taken_at,status,note,taken_date")
    .single();

  if (error) throw error;
  return data as Record<string, unknown>;
}

export async function listMedicationLogs(
  admin: SupabaseClient,
  ctx: PatientContext,
  since?: string
): Promise<unknown[]> {
  let q = admin
    .from("patient_medication_logs")
    .select("id,prescription_id,item_id,slot,taken_at,status,note,taken_date")
    .eq("patient_id", ctx.patientId)
    .order("taken_at", { ascending: false })
    .limit(200);

  if (since) {
    const t = Date.parse(since);
    if (!Number.isNaN(t)) {
      q = q.gte("taken_at", new Date(t).toISOString());
    }
  }

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function upsertDietLog(
  admin: SupabaseClient,
  ctx: PatientContext,
  body: { date?: string; onPlan: boolean; note?: string }
): Promise<Record<string, unknown>> {
  const logDate = body.date?.slice(0, 10) ?? utcDateString();

  const { data, error } = await admin
    .from("patient_diet_logs")
    .upsert(
      {
        clinic_id: ctx.clinicId,
        patient_id: ctx.patientId,
        log_date: logDate,
        on_plan: body.onPlan,
        note: body.note ?? null,
        updated_at: new Date().toISOString()
      },
      { onConflict: "patient_id,log_date" }
    )
    .select("id,log_date,on_plan,note")
    .single();

  if (error) throw error;
  return data as Record<string, unknown>;
}

export async function createCheckIn(
  admin: SupabaseClient,
  ctx: PatientContext,
  body: {
    wellbeingScore?: number;
    symptoms?: string[];
    energy?: string;
    sleep?: string;
    mood?: string;
    freeText?: string;
    followUpId?: string;
  }
): Promise<Record<string, unknown>> {
  const { data, error } = await admin
    .from("patient_check_ins")
    .insert({
      clinic_id: ctx.clinicId,
      patient_id: ctx.patientId,
      follow_up_id: body.followUpId ?? null,
      wellbeing_score: body.wellbeingScore ?? null,
      symptoms: body.symptoms ?? [],
      energy: body.energy ?? null,
      sleep: body.sleep ?? null,
      mood: body.mood ?? null,
      free_text: body.freeText ?? null
    })
    .select("id,recorded_at,wellbeing_score,symptoms,energy,sleep,mood,free_text")
    .single();

  if (error) throw error;
  return data as Record<string, unknown>;
}

export async function listCheckIns(
  admin: SupabaseClient,
  ctx: PatientContext,
  since?: string
): Promise<unknown[]> {
  let q = admin
    .from("patient_check_ins")
    .select("id,recorded_at,wellbeing_score,symptoms,energy,sleep,mood,free_text,follow_up_id")
    .eq("patient_id", ctx.patientId)
    .order("recorded_at", { ascending: false })
    .limit(100);

  if (since) {
    const t = Date.parse(since);
    if (!Number.isNaN(t)) {
      q = q.gte("recorded_at", new Date(t).toISOString());
    }
  }

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

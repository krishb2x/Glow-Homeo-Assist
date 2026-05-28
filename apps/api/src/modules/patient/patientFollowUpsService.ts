import type { SupabaseClient } from "@supabase/supabase-js";
import { createCheckIn } from "./patientAdherenceService";
import type { PatientContext } from "./types";

export async function listPatientFollowUps(
  admin: SupabaseClient,
  ctx: PatientContext
): Promise<{ intentional: unknown[]; suggested: unknown[] }> {
  const { data: rows, error } = await admin
    .from("follow_ups")
    .select("id,title,reason,due_at,status,completed_at,consultation_id")
    .eq("patient_id", ctx.patientId)
    .eq("clinic_id", ctx.clinicId)
    .order("due_at", { ascending: true })
    .limit(40);

  if (error) throw error;

  const intentional = (rows ?? [])
    .filter((r) => (r as { status: string }).status !== "COMPLETED")
    .map((r) => {
      const row = r as {
        id: string;
        title: string;
        reason?: string;
        due_at: string;
        status: string;
        consultation_id: string | null;
      };
      return {
        id: row.id,
        source: "intentional" as const,
        title: row.title,
        reason: row.reason ?? row.title,
        dueAt: row.due_at,
        status: row.status,
        consultationId: row.consultation_id
      };
    });

  const { data: consult } = await admin
    .from("consultations")
    .select("follow_up_recommended_at,follow_up_note,symptoms_to_monitor")
    .eq("patient_id", ctx.patientId)
    .not("follow_up_recommended_at", "is", null)
    .order("follow_up_recommended_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const suggested: unknown[] = [];
  if (consult) {
    const c = consult as {
      follow_up_recommended_at: string;
      follow_up_note: string | null;
      symptoms_to_monitor: string[] | null;
    };
    const alreadyCovered = intentional.some(
      (f) => (f as { dueAt: string }).dueAt === c.follow_up_recommended_at
    );
    if (!alreadyCovered) {
      suggested.push({
        source: "suggested",
        title: c.follow_up_note?.trim() || "Recommended follow-up",
        dueAt: c.follow_up_recommended_at,
        symptomsToMonitor: c.symptoms_to_monitor ?? []
      });
    }
  }

  return { intentional, suggested };
}

export async function completePatientFollowUp(
  admin: SupabaseClient,
  ctx: PatientContext,
  followUpId: string,
  checkIn: Parameters<typeof createCheckIn>[2]
): Promise<{ followUpId: string; checkInId: string }> {
  const { data: fu, error } = await admin
    .from("follow_ups")
    .select("id,status")
    .eq("id", followUpId)
    .eq("patient_id", ctx.patientId)
    .eq("clinic_id", ctx.clinicId)
    .maybeSingle();

  if (error) throw error;
  if (!fu) {
    const err = new Error("Follow-up not found");
    (err as Error & { code: string }).code = "NOT_FOUND";
    throw err;
  }

  const checkInRow = await createCheckIn(admin, ctx, { ...checkIn, followUpId });

  const { error: upErr } = await admin
    .from("follow_ups")
    .update({
      status: "COMPLETED",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("id", followUpId);

  if (upErr) throw upErr;

  return {
    followUpId,
    checkInId: (checkInRow as { id: string }).id
  };
}

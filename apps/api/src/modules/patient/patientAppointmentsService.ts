import type { SupabaseClient } from "@supabase/supabase-js";
import { v4 as uuid } from "uuid";
import { buildDailyPatientJoin } from "../telemedicine/meetingService";
import { isDailyConfigured } from "../telemedicine/daily/dailyRoomConfig";
import type { PatientContext } from "./types";

async function doctorNames(admin: SupabaseClient, ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (ids.length === 0) return map;
  const { data } = await admin.from("profiles").select("id,full_name").in("id", ids);
  for (const row of data ?? []) {
    const r = row as { id: string; full_name: string | null };
    map.set(r.id, r.full_name?.trim() || "Doctor");
  }
  return map;
}

function mapAppointmentRow(
  row: Record<string, unknown>,
  doctorName: string
): Record<string, unknown> {
  const scheduledFor = row.scheduled_for as string;
  const now = Date.now();
  const scheduledMs = new Date(scheduledFor).getTime();
  const status = row.status as string;
  const mode = (row.consultation_mode as string) ?? "IN_CLINIC";
  const canJoinNow =
    mode === "ONLINE" &&
    status !== "CANCELLED" &&
    scheduledMs - 15 * 60_000 <= now &&
    now <= scheduledMs + 90 * 60_000;

  return {
    id: row.id,
    scheduledFor,
    durationMinutes: row.duration_minutes ?? 30,
    status,
    mode,
    doctorName,
    reason: row.reason ?? undefined,
    canJoinNow,
    meetingAvailable: mode === "ONLINE" && Boolean(row.meeting_url) && isDailyConfigured()
  };
}

export async function listPatientAppointments(
  admin: SupabaseClient,
  ctx: PatientContext
): Promise<{ upcoming: unknown[]; past: unknown[] }> {
  const nowIso = new Date().toISOString();

  const [{ data: upcoming }, { data: past }] = await Promise.all([
    admin
      .from("appointments")
      .select(
        "id,scheduled_for,duration_minutes,status,consultation_mode,reason,doctor_id,meeting_url"
      )
      .eq("patient_id", ctx.patientId)
      .eq("clinic_id", ctx.clinicId)
      .gte("scheduled_for", nowIso)
      .not("status", "eq", "CANCELLED")
      .order("scheduled_for", { ascending: true })
      .limit(30),
    admin
      .from("appointments")
      .select(
        "id,scheduled_for,duration_minutes,status,consultation_mode,reason,doctor_id,meeting_url"
      )
      .eq("patient_id", ctx.patientId)
      .eq("clinic_id", ctx.clinicId)
      .lt("scheduled_for", nowIso)
      .order("scheduled_for", { ascending: false })
      .limit(3)
  ]);

  const all = [...(upcoming ?? []), ...(past ?? [])] as Record<string, unknown>[];
  const names = await doctorNames(
    admin,
    all.map((r) => r.doctor_id as string).filter(Boolean)
  );

  return {
    upcoming: (upcoming ?? []).map((r) =>
      mapAppointmentRow(r as Record<string, unknown>, names.get((r as { doctor_id: string }).doctor_id) ?? "Doctor")
    ),
    past: (past ?? []).map((r) =>
      mapAppointmentRow(r as Record<string, unknown>, names.get((r as { doctor_id: string }).doctor_id) ?? "Doctor")
    )
  };
}

export async function createPatientAppointmentRequest(
  admin: SupabaseClient,
  ctx: PatientContext,
  body: {
    preferredDate: string;
    preferredTimeWindow: "MORNING" | "AFTERNOON" | "EVENING";
    mode: "ONLINE" | "IN_CLINIC";
    reason: string;
  }
): Promise<Record<string, unknown>> {
  const { data: patient } = await admin
    .from("patients")
    .select("assigned_doctor_id")
    .eq("id", ctx.patientId)
    .maybeSingle();

  let doctorId = (patient as { assigned_doctor_id?: string | null } | null)?.assigned_doctor_id;
  if (!doctorId) {
    const { data: doc } = await admin
      .from("profiles")
      .select("id")
      .eq("clinic_id", ctx.clinicId)
      .eq("role", "DOCTOR")
      .limit(1)
      .maybeSingle();
    doctorId = (doc as { id?: string } | null)?.id;
  }
  if (!doctorId) {
    const err = new Error("No doctor available for this clinic");
    (err as Error & { code: string }).code = "NO_DOCTOR";
    throw err;
  }

  const hour =
    body.preferredTimeWindow === "MORNING"
      ? 9
      : body.preferredTimeWindow === "AFTERNOON"
        ? 14
        : 18;
  const scheduledFor = new Date(`${body.preferredDate}T${String(hour).padStart(2, "0")}:00:00.000Z`).toISOString();

  const { data, error } = await admin
    .from("appointments")
    .insert({
      id: uuid(),
      clinic_id: ctx.clinicId,
      patient_id: ctx.patientId,
      doctor_id: doctorId,
      scheduled_for: scheduledFor,
      status: "REQUESTED",
      consultation_mode: body.mode,
      reason: body.reason.trim()
    })
    .select("id,scheduled_for,status,consultation_mode")
    .single();

  if (error) throw error;
  return data as Record<string, unknown>;
}

export async function cancelPatientAppointment(
  admin: SupabaseClient,
  ctx: PatientContext,
  appointmentId: string,
  body: { reason: string; note?: string }
): Promise<void> {
  const note = [body.reason, body.note].filter(Boolean).join(": ");
  const { data, error } = await admin
    .from("appointments")
    .update({ status: "CANCELLED", notes: note || null, updated_at: new Date().toISOString() })
    .eq("id", appointmentId)
    .eq("patient_id", ctx.patientId)
    .eq("clinic_id", ctx.clinicId)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    const err = new Error("Appointment not found");
    (err as Error & { code: string }).code = "NOT_FOUND";
    throw err;
  }
}

export async function getPatientAppointmentMeeting(
  admin: SupabaseClient,
  ctx: PatientContext,
  appointmentId: string
): Promise<{ roomId: string; jitsiUrl: string; jwt: string; jwtExpiresAt: string } | null> {
  const { data: apt, error } = await admin
    .from("appointments")
    .select("id,scheduled_for,consultation_mode,status,meeting_url")
    .eq("id", appointmentId)
    .eq("patient_id", ctx.patientId)
    .eq("clinic_id", ctx.clinicId)
    .maybeSingle();

  if (error) throw error;
  if (!apt) return null;

  const row = apt as {
    scheduled_for: string;
    consultation_mode: string;
    status: string;
  };

  if (row.consultation_mode !== "ONLINE") {
    const err = new Error("Not an online appointment");
    (err as Error & { code: string }).code = "NOT_ONLINE";
    throw err;
  }

  const now = Date.now();
  const scheduledMs = new Date(row.scheduled_for).getTime();
  if (scheduledMs - 15 * 60_000 > now || now > scheduledMs + 90 * 60_000) {
    const err = new Error("Meeting is not available in this time window");
    (err as Error & { code: string }).code = "MEETING_WINDOW";
    throw err;
  }

  const { data: consult } = await admin
    .from("consultations")
    .select("id")
    .eq("appointment_id", appointmentId)
    .eq("patient_id", ctx.patientId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const consultId = (consult as { id?: string } | null)?.id;
  if (!consultId) {
    const err = new Error("Consultation not linked");
    (err as Error & { code: string }).code = "NOT_FOUND";
    throw err;
  }

  const { data: session } = await admin
    .from("video_sessions")
    .select("room_id")
    .eq("consultation_id", consultId)
    .not("status", "eq", "ENDED")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const roomId = (session as { room_id?: string } | null)?.room_id;
  if (!roomId || !isDailyConfigured()) {
    const err = new Error("Video session not ready");
    (err as Error & { code: string }).code = "MEETING_UNAVAILABLE";
    throw err;
  }

  const join = await buildDailyPatientJoin({ roomName: roomId });
  const jwtExpiresAt = new Date(Date.now() + 3600_000).toISOString();

  return {
    roomId: join.roomName,
    jitsiUrl: `${join.roomUrl}?t=${join.meetingToken}`,
    jwt: join.meetingToken,
    jwtExpiresAt
  };
}

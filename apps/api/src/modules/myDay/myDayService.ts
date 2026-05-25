import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthClaims } from "../../auth";
import { startSpan } from "../../lib/observability";

const MS_SUGGESTED_FOLLOWUP = 14 * 24 * 60 * 60 * 1000;

export type FollowUpOut = {
  id: string;
  patientId: string;
  patientName: string;
  phone?: string;
  dueAt: string;
  overdue: boolean;
  title: string;
  sourceConsultationId: string;
  source: "intentional" | "suggested";
  reason?: string;
};

async function loadPatientNames(
  client: SupabaseClient,
  ids: string[]
): Promise<Map<string, { name: string; phone?: string; initialChiefComplaint?: string | null }>> {
  const map = new Map<string, { name: string; phone?: string; initialChiefComplaint?: string | null }>();
  if (ids.length === 0) return map;
  const unique = [...new Set(ids)];
  const { data } = await client
    .from("patients")
    .select("id,name,phone,initial_chief_complaint,assigned_doctor_id")
    .in("id", unique);
  for (const p of data ?? []) {
    const r = p as {
      id: string;
      name: string;
      phone: string | null;
      initial_chief_complaint: string | null;
    };
    map.set(r.id, {
      name: r.name,
      phone: r.phone ?? undefined,
      initialChiefComplaint: r.initial_chief_complaint
    });
  }
  return map;
}

/**
 * Suggested follow-ups from denormalized last_visit_at — O(patients due) not O(all consults).
 */
export async function buildSuggestedFollowUps(
  client: SupabaseClient,
  clinicId: string,
  claims: AuthClaims
): Promise<FollowUpOut[]> {
  const cutoff = new Date(Date.now() - MS_SUGGESTED_FOLLOWUP).toISOString();
  let query = client
    .from("patients")
    .select("id,name,phone,last_visit_at,follow_up_status,assigned_doctor_id")
    .eq("clinic_id", clinicId)
    .eq("follow_up_status", "critical")
    .not("last_visit_at", "is", null)
    .lt("last_visit_at", cutoff);

  if (claims.role === "DOCTOR") {
    query = query.or(`assigned_doctor_id.eq.${claims.userId},assigned_doctor_id.is.null`);
  }

  const { data: patients, error } = await query.limit(80);
  if (error) throw new Error(error.message);

  const patientIds = (patients ?? []).map((p) => (p as { id: string }).id);
  const { data: lastCons } = await client
    .from("consultations")
    .select("id,patient_id,ended_at")
    .eq("clinic_id", clinicId)
    .in("patient_id", patientIds.length ? patientIds : ["00000000-0000-0000-0000-000000000000"])
    .not("ended_at", "is", null)
    .order("ended_at", { ascending: false });

  const lastConsultByPatient = new Map<string, string>();
  for (const c of lastCons ?? []) {
    const pid = (c as { patient_id: string }).patient_id;
    if (!lastConsultByPatient.has(pid)) {
      lastConsultByPatient.set(pid, (c as { id: string }).id);
    }
  }

  const nowMs = Date.now();
  const items: FollowUpOut[] = [];
  for (const p of patients ?? []) {
    const row = p as {
      id: string;
      name: string;
      phone: string | null;
      last_visit_at: string;
    };
    const last = row.last_visit_at;
    const dueMs = new Date(last).getTime() + MS_SUGGESTED_FOLLOWUP;
    const consultationId = lastConsultByPatient.get(row.id) ?? row.id;
    items.push({
      id: `suggested-${row.id}-${consultationId}`,
      patientId: row.id,
      patientName: row.name,
      phone: row.phone ?? undefined,
      dueAt: new Date(dueMs).toISOString(),
      overdue: nowMs > dueMs,
      title: "Post-consultation check-in",
      sourceConsultationId: consultationId,
      source: "suggested",
      reason: "14-day check-in after last visit"
    });
  }
  return items;
}

export function dedupeFollowUps(intentional: FollowUpOut[], suggested: FollowUpOut[]): FollowUpOut[] {
  const seen = new Set<string>();
  const out: FollowUpOut[] = [];
  for (const it of intentional) {
    const k = `${it.patientId}|${it.dueAt.slice(0, 10)}`;
    seen.add(k);
    out.push(it);
  }
  for (const it of suggested) {
    const k = `${it.patientId}|${it.dueAt.slice(0, 10)}`;
    if (seen.has(k)) continue;
    out.push(it);
  }
  out.sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  return out;
}

export type MyDayPayload = {
  window: { from: string; to: string; days: number };
  upcomingAppointments: Array<{
    id: string;
    scheduledFor: string;
    durationMinutes: number;
    status: string;
    patientId: string;
    patientName: string;
    complexity: string | null;
    reason: string | null;
    chiefComplaint: string | null;
  }>;
  followUps: FollowUpOut[];
  pendingOutcomes: Array<{
    consultationId: string;
    patientId: string;
    patientName: string;
    endedAt: string;
    summary: string;
  }>;
  needsNoteFinalization: Array<{
    consultationId: string;
    patientId: string;
    patientName: string;
    startedAt: string;
  }>;
  activeConsultations: {
    inClinic: Array<{ id: string; patientId: string; patientName: string; startedAt: string }>;
    online: Array<{ id: string; patientId: string; patientName: string; startedAt: string }>;
  };
};

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86400000);
}

export async function buildMyDay(
  client: SupabaseClient,
  clinicId: string,
  claims: AuthClaims,
  days: number,
  doctorFilter: string
): Promise<MyDayPayload> {
  const span = startSpan("build_my_day", { clinicId, days });
  const now = new Date();
  const from = now;
  const to = addDays(now, days);

  const upcoming: MyDayPayload["upcomingAppointments"] = [];
  const { data: apts } = await client
    .from("appointments")
    .select("id,scheduled_for,duration_minutes,status,patient_id,reason")
    .eq("clinic_id", clinicId)
    .eq("doctor_id", doctorFilter)
    .gte("scheduled_for", from.toISOString())
    .lte("scheduled_for", to.toISOString())
    .in("status", ["REQUESTED", "CONFIRMED", "IN_PROGRESS"])
    .order("scheduled_for", { ascending: true });

  const aptPatientIds = (apts ?? []).map((a) => (a as { patient_id: string }).patient_id);
  const aptNames = await loadPatientNames(client, aptPatientIds);

  for (const a of apts ?? []) {
    const r = a as {
      id: string;
      scheduled_for: string;
      duration_minutes: number;
      status: string;
      patient_id: string;
      reason: string | null;
    };
    const pr = aptNames.get(r.patient_id);
    upcoming.push({
      id: r.id,
      scheduledFor: r.scheduled_for,
      durationMinutes: r.duration_minutes,
      status: r.status,
      patientId: r.patient_id,
      patientName: pr?.name ?? "Patient",
      complexity: null,
      reason: r.reason,
      chiefComplaint: pr?.initialChiefComplaint ?? null
    });
  }

  const intentional: FollowUpOut[] = [];
  const { data: fuRows } = await client
    .from("follow_ups")
    .select("id,patient_id,due_at,title,reason,status,doctor_id,consultation_id")
    .eq("clinic_id", clinicId)
    .eq("status", "PENDING");

  const fuPatientIds = (fuRows ?? []).map((f) => (f as { patient_id: string }).patient_id);
  const fuNames = await loadPatientNames(client, fuPatientIds);

  for (const f of fuRows ?? []) {
    const fr = f as {
      id: string;
      patient_id: string;
      due_at: string;
      title: string;
      reason?: string;
      doctor_id: string | null;
      consultation_id: string | null;
    };
    if (fr.doctor_id && fr.doctor_id !== claims.userId && claims.role === "DOCTOR") continue;
    const pr = fuNames.get(fr.patient_id);
    intentional.push({
      id: fr.id,
      patientId: fr.patient_id,
      patientName: pr?.name ?? "Patient",
      phone: pr?.phone,
      dueAt: fr.due_at,
      overdue: Date.now() > new Date(fr.due_at).getTime(),
      title: fr.title,
      sourceConsultationId: fr.consultation_id ?? "",
      source: "intentional",
      reason: fr.reason ?? fr.title
    });
  }

  let suggested: FollowUpOut[] = [];
  try {
    suggested = await buildSuggestedFollowUps(client, clinicId, claims);
  } catch {
    suggested = [];
  }
  const followUps = dedupeFollowUps(intentional, suggested);

  const pendingOutcomes: MyDayPayload["pendingOutcomes"] = [];
  const since = new Date(Date.now() - 45 * 86400000).toISOString();
  const { data: endedCons } = await client
    .from("consultations")
    .select("id,patient_id,ended_at,note_final")
    .eq("clinic_id", clinicId)
    .not("ended_at", "is", null)
    .gte("ended_at", since)
    .not("note_final", "is", null)
    .limit(40);

  const { data: outcomes } = await client
    .from("case_outcomes")
    .select("consultation_id")
    .eq("clinic_id", clinicId);
  const hasOutcome = new Set(
    (outcomes ?? []).map((o) => (o as { consultation_id: string }).consultation_id)
  );

  const outcomePatientIds = (endedCons ?? [])
    .filter((c) => !hasOutcome.has((c as { id: string }).id))
    .map((c) => (c as { patient_id: string }).patient_id);
  const outcomeNames = await loadPatientNames(client, outcomePatientIds);

  for (const c of endedCons ?? []) {
    const cr = c as { id: string; patient_id: string; ended_at: string; note_final: unknown };
    if (hasOutcome.has(cr.id)) continue;
    const summ =
      typeof (cr.note_final as { chiefComplaints?: string })?.chiefComplaints === "string"
        ? (cr.note_final as { chiefComplaints: string }).chiefComplaints
        : "Document outcome";
    pendingOutcomes.push({
      consultationId: cr.id,
      patientId: cr.patient_id,
      patientName: outcomeNames.get(cr.patient_id)?.name ?? "Patient",
      endedAt: cr.ended_at,
      summary: summ.slice(0, 200)
    });
  }

  const needsNoteFinalization: MyDayPayload["needsNoteFinalization"] = [];
  const { data: openNotes } = await client
    .from("consultations")
    .select("id,patient_id,started_at,attending_user_id")
    .eq("clinic_id", clinicId)
    .not("ended_at", "is", null)
    .is("note_final", null)
    .not("note_draft", "is", null)
    .limit(20);

  const notePatientIds = (openNotes ?? []).map((c) => (c as { patient_id: string }).patient_id);
  const noteNames = await loadPatientNames(client, notePatientIds);

  for (const c of openNotes ?? []) {
    const cr = c as {
      id: string;
      patient_id: string;
      started_at: string;
      attending_user_id: string | null;
    };
    if (claims.role === "DOCTOR" && cr.attending_user_id && cr.attending_user_id !== claims.userId) {
      continue;
    }
    needsNoteFinalization.push({
      consultationId: cr.id,
      patientId: cr.patient_id,
      patientName: noteNames.get(cr.patient_id)?.name ?? "Patient",
      startedAt: cr.started_at
    });
  }

  const inClinicOpen: MyDayPayload["activeConsultations"]["inClinic"] = [];
  const onlineOpen: MyDayPayload["activeConsultations"]["online"] = [];
  const { data: liveRows } = await client
    .from("consultations")
    .select("id,patient_id,started_at,consultation_mode,attending_user_id")
    .eq("clinic_id", clinicId)
    .is("ended_at", null);

  const livePatientIds = (liveRows ?? []).map((c) => (c as { patient_id: string }).patient_id);
  const liveNames = await loadPatientNames(client, livePatientIds);

  for (const c of liveRows ?? []) {
    const cr = c as {
      id: string;
      patient_id: string;
      started_at: string;
      consultation_mode: string;
      attending_user_id: string | null;
    };
    if (claims.role === "DOCTOR" && cr.attending_user_id && cr.attending_user_id !== claims.userId) {
      continue;
    }
    const row = {
      id: cr.id,
      patientId: cr.patient_id,
      patientName: liveNames.get(cr.patient_id)?.name ?? "Patient",
      startedAt: cr.started_at
    };
    if (cr.consultation_mode === "ONLINE") onlineOpen.push(row);
    else inClinicOpen.push(row);
  }

  inClinicOpen.sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
  onlineOpen.sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());

  span.end({ followUps: followUps.length });
  return {
    window: { from: from.toISOString(), to: to.toISOString(), days },
    upcomingAppointments: upcoming,
    followUps: followUps.slice(0, 40),
    pendingOutcomes: pendingOutcomes.slice(0, 20),
    needsNoteFinalization: needsNoteFinalization.slice(0, 15),
    activeConsultations: { inClinic: inClinicOpen, online: onlineOpen }
  };
}

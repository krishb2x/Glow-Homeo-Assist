import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthClaims } from "../../auth";
import type { MemoOut, MemoRow } from "./types";

function isOverdue(dueAt: string | null, status: string): boolean {
  if (!dueAt || status !== "open") return false;
  return new Date(dueAt).getTime() < Date.now();
}

function mapRow(
  row: MemoRow,
  patientName: string | null
): MemoOut {
  return {
    id: row.id,
    kind: row.kind,
    body: row.body,
    dueAt: row.due_at,
    priority: row.priority,
    pinned: row.pinned,
    status: row.status,
    patientId: row.patient_id,
    patientName,
    consultationId: row.consultation_id,
    doctorId: row.doctor_id,
    overdue: isOverdue(row.due_at, row.status),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function loadPatientNames(
  client: SupabaseClient,
  ids: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return map;
  const { data } = await client.from("patients").select("id,name").in("id", unique);
  for (const p of data ?? []) {
    map.set((p as { id: string }).id, (p as { name: string }).name);
  }
  return map;
}

export type ListMemosParams = {
  patientId?: string;
  consultationId?: string;
  status?: "open" | "done" | "dismissed" | "all";
  urgentOnly?: boolean;
  dueBefore?: string;
  limit?: number;
};

export async function listDoctorMemos(
  client: SupabaseClient,
  clinicId: string,
  claims: AuthClaims,
  params: ListMemosParams
): Promise<MemoOut[]> {
  const limit = Math.min(100, Math.max(1, params.limit ?? 40));
  let q = client
    .from("doctor_memos")
    .select(
      "id,clinic_id,doctor_id,patient_id,consultation_id,kind,body,due_at,priority,pinned,status,completed_at,created_at,updated_at"
    )
    .eq("clinic_id", clinicId)
    .order("pinned", { ascending: false })
    .order("due_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (claims.role === "DOCTOR") {
    q = q.eq("doctor_id", claims.userId);
  }
  if (params.patientId) q = q.eq("patient_id", params.patientId);
  if (params.consultationId) q = q.eq("consultation_id", params.consultationId);
  if (params.status && params.status !== "all") q = q.eq("status", params.status);
  if (params.urgentOnly) q = q.eq("priority", "urgent");
  if (params.dueBefore) q = q.lte("due_at", params.dueBefore);

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as MemoRow[];
  const names = await loadPatientNames(
    client,
    rows.map((r) => r.patient_id).filter((id): id is string => Boolean(id))
  );
  return rows.map((r) => mapRow(r, r.patient_id ? names.get(r.patient_id) ?? null : null));
}

export type MemoSummary = {
  openCount: number;
  urgentCount: number;
  overdueCount: number;
  pinnedCount: number;
  dueTodayCount: number;
  topUrgent: MemoOut[];
};

export async function getMemoSummary(
  client: SupabaseClient,
  clinicId: string,
  claims: AuthClaims
): Promise<MemoSummary> {
  const open = await listDoctorMemos(client, clinicId, claims, {
    status: "open",
    limit: 50
  });
  const now = Date.now();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const urgent = open.filter((m) => m.priority === "urgent");
  const overdue = open.filter((m) => m.overdue);
  const pinned = open.filter((m) => m.pinned);
  const dueToday = open.filter((m) => {
    if (!m.dueAt) return false;
    const t = new Date(m.dueAt).getTime();
    return t >= startOfDay.getTime() && t < endOfDay.getTime();
  });

  const topUrgent = [...open]
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
      if (a.priority !== b.priority) return a.priority === "urgent" ? -1 : 1;
      const ad = a.dueAt ? new Date(a.dueAt).getTime() : now + 86400000 * 365;
      const bd = b.dueAt ? new Date(b.dueAt).getTime() : now + 86400000 * 365;
      return ad - bd;
    })
    .slice(0, 6);

  return {
    openCount: open.length,
    urgentCount: urgent.length,
    overdueCount: overdue.length,
    pinnedCount: pinned.length,
    dueTodayCount: dueToday.length,
    topUrgent
  };
}

export async function createDoctorMemo(
  client: SupabaseClient,
  clinicId: string,
  claims: AuthClaims,
  input: {
    body: string;
    kind: "note" | "reminder" | "follow_up";
    patientId?: string;
    consultationId?: string;
    dueAt?: string;
    priority: "normal" | "urgent";
    pinned: boolean;
  }
): Promise<MemoOut> {
  if ((input.kind === "reminder" || input.kind === "follow_up") && !input.dueAt) {
    throw new Error("dueAt is required for reminders and follow-up notes");
  }
  if (input.patientId) {
    const { data: p } = await client
      .from("patients")
      .select("id,name")
      .eq("id", input.patientId)
      .eq("clinic_id", clinicId)
      .maybeSingle();
    if (!p) throw new Error("Patient not found");
  }

  const { data, error } = await client
    .from("doctor_memos")
    .insert({
      clinic_id: clinicId,
      doctor_id: claims.userId,
      patient_id: input.patientId ?? null,
      consultation_id: input.consultationId ?? null,
      kind: input.kind,
      body: input.body,
      due_at: input.dueAt ?? null,
      priority: input.priority,
      pinned: input.pinned,
      status: "open"
    })
    .select(
      "id,clinic_id,doctor_id,patient_id,consultation_id,kind,body,due_at,priority,pinned,status,completed_at,created_at,updated_at"
    )
    .single();

  if (error) throw new Error(error.message);
  const row = data as MemoRow;
  let patientName: string | null = null;
  if (row.patient_id) {
    const { data: p } = await client.from("patients").select("name").eq("id", row.patient_id).maybeSingle();
    patientName = (p as { name: string } | null)?.name ?? null;
  }
  return mapRow(row, patientName);
}

export async function patchDoctorMemo(
  client: SupabaseClient,
  clinicId: string,
  claims: AuthClaims,
  memoId: string,
  patch: {
    body?: string;
    kind?: "note" | "reminder" | "follow_up";
    dueAt?: string | null;
    priority?: "normal" | "urgent";
    pinned?: boolean;
    status?: "open" | "done" | "dismissed";
  }
): Promise<MemoOut> {
  const { data: existing, error: fetchErr } = await client
    .from("doctor_memos")
    .select("id,doctor_id,kind,due_at,status")
    .eq("id", memoId)
    .eq("clinic_id", clinicId)
    .maybeSingle();
  if (fetchErr) throw new Error(fetchErr.message);
  if (!existing) throw new Error("Memo not found");
  if (claims.role === "DOCTOR" && (existing as { doctor_id: string }).doctor_id !== claims.userId) {
    throw new Error("Forbidden");
  }

  const nextKind = patch.kind ?? (existing as { kind: string }).kind;
  const nextDue =
    patch.dueAt !== undefined ? patch.dueAt : (existing as { due_at: string | null }).due_at;
  if ((nextKind === "reminder" || nextKind === "follow_up") && !nextDue) {
    throw new Error("dueAt is required for reminders and follow-up notes");
  }

  const update: Record<string, unknown> = { ...patch };
  if (patch.dueAt !== undefined) update.due_at = patch.dueAt;
  delete update.dueAt;

  if (patch.status === "done" || patch.status === "dismissed") {
    update.completed_at = new Date().toISOString();
  } else if (patch.status === "open") {
    update.completed_at = null;
  }

  const { data, error } = await client
    .from("doctor_memos")
    .update(update)
    .eq("id", memoId)
    .eq("clinic_id", clinicId)
    .select(
      "id,clinic_id,doctor_id,patient_id,consultation_id,kind,body,due_at,priority,pinned,status,completed_at,created_at,updated_at"
    )
    .single();

  if (error) throw new Error(error.message);
  const row = data as MemoRow;
  let patientName: string | null = null;
  if (row.patient_id) {
    const { data: p } = await client.from("patients").select("name").eq("id", row.patient_id).maybeSingle();
    patientName = (p as { name: string } | null)?.name ?? null;
  }
  return mapRow(row, patientName);
}

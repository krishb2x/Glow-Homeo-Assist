import type { SupabaseClient } from "@supabase/supabase-js";
import type { AudienceSpec } from "./types";

const MS_FOLLOWUP_DUE = 14 * 24 * 60 * 60 * 1000;

export type PatientAudienceRow = {
  id: string;
  name: string;
  phone: string | null;
  age: number | null;
  tags: string[] | null;
  initial_chief_complaint: string | null;
  last_visit_at: string | null;
};

export type ResolvedAudience = {
  patients: PatientAudienceRow[];
  skippedNoPhone: number;
};

function computeStatus(lastVisitAt: string | null, now: number): "stable" | "critical" {
  if (!lastVisitAt) return "stable";
  if (now > new Date(lastVisitAt).getTime() + MS_FOLLOWUP_DUE) return "critical";
  return "stable";
}

async function lastVisitMap(
  client: SupabaseClient,
  clinicId: string,
  patientIds: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (patientIds.length === 0) return map;

  const { data } = await client
    .from("consultations")
    .select("patient_id,ended_at")
    .eq("clinic_id", clinicId)
    .in("patient_id", patientIds)
    .not("ended_at", "is", null)
    .order("ended_at", { ascending: false });

  for (const row of data ?? []) {
    const pid = (row as { patient_id: string }).patient_id;
    const end = (row as { ended_at: string }).ended_at;
    if (!map.has(pid)) map.set(pid, end);
  }
  return map;
}

function applyFilter(
  rows: PatientAudienceRow[],
  lastByPatient: Map<string, string>,
  spec: AudienceSpec,
  now: number
): PatientAudienceRow[] {
  if (spec.mode !== "filter" || !spec.filter) return rows;
  const f = spec.filter;
  let out = rows;

  if (f.search?.trim()) {
    const s = f.search.trim().toLowerCase();
    out = out.filter(
      (p) =>
        p.name.toLowerCase().includes(s) ||
        (p.phone ?? "").includes(s) ||
        (p.initial_chief_complaint ?? "").toLowerCase().includes(s)
    );
  }

  if (f.tags?.length) {
    const want = new Set(f.tags.map((t) => t.toLowerCase()));
    out = out.filter((p) => (p.tags ?? []).some((t) => want.has(t.toLowerCase())));
  }

  if (f.hasPhone === true) {
    out = out.filter((p) => Boolean(p.phone?.trim()));
  }

  if (f.status) {
    out = out.filter((p) => {
      const last = p.last_visit_at ?? lastByPatient.get(p.id) ?? null;
      return computeStatus(last, now) === f.status;
    });
  }

  if (f.inactiveDaysMin != null) {
    const cutoff = now - f.inactiveDaysMin * 86400000;
    out = out.filter((p) => {
      const last = p.last_visit_at ?? lastByPatient.get(p.id) ?? null;
      if (!last) return true;
      return new Date(last).getTime() < cutoff;
    });
  }

  if (f.lastVisitWithinDays != null) {
    const cutoff = now - f.lastVisitWithinDays * 86400000;
    out = out.filter((p) => {
      const last = p.last_visit_at ?? lastByPatient.get(p.id) ?? null;
      return last != null && new Date(last).getTime() >= cutoff;
    });
  }

  if (f.treatmentCategory?.trim()) {
    const tc = f.treatmentCategory.trim().toLowerCase();
    out = out.filter((p) => (p.tags ?? []).some((t) => t.toLowerCase().includes(tc)));
  }

  return out;
}

/**
 * Resolve broadcast audience for a clinic. Caps at maxRecipients to protect workers.
 */
export async function resolveAudience(
  client: SupabaseClient,
  clinicId: string,
  spec: AudienceSpec,
  maxRecipients = 2000
): Promise<ResolvedAudience> {
  const now = Date.now();

  if (spec.mode === "individual") {
    const { data, error } = await client
      .from("patients")
      .select("id,name,phone,age,tags,initial_chief_complaint,last_visit_at")
      .eq("clinic_id", clinicId)
      .in("id", spec.patientIds);
    if (error) throw error;
    const rows = (data ?? []) as PatientAudienceRow[];
    const withPhone = rows.filter((p) => p.phone?.trim());
    return { patients: withPhone.slice(0, maxRecipients), skippedNoPhone: rows.length - withPhone.length };
  }

  let query = client
    .from("patients")
    .select("id,name,phone,age,tags,initial_chief_complaint,last_visit_at")
    .eq("clinic_id", clinicId);

  if (spec.mode === "tags") {
    query = query.overlaps("tags", spec.tags);
  }

  const { data, error } = await query.limit(maxRecipients + 500);
  if (error) throw error;

  let rows = (data ?? []) as PatientAudienceRow[];
  const needLast = rows.some((p) => !p.last_visit_at);
  const lastByPatient = needLast ? await lastVisitMap(client, clinicId, rows.map((p) => p.id)) : new Map();

  if (spec.mode === "filter") {
    rows = applyFilter(rows, lastByPatient, spec, now);
  }

  const withPhone = rows.filter((p) => p.phone?.trim());
  return {
    patients: withPhone.slice(0, maxRecipients),
    skippedNoPhone: rows.length - withPhone.length
  };
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { createDownloadUrl } from "../../s3";
import { encodeCursor, decodeCursor, clampLimit } from "./patientPagination";
import {
  mergeAdvice,
  mapPrescriptionItems,
  firstLineFromNote,
  restrictionsFromAdvice,
  type PatientAdviceCard
} from "./patientMappers";
import type { PatientContext } from "./types";

const VISIT_SELECT =
  "id,started_at,ended_at,consultation_mode,complexity,lifecycle_status,clinical_record,advice,note_final,pdf_object_id,symptoms_to_monitor,attending_user_id,audio_object_key,follow_up_note";

export type VisitListItem = {
  id: string;
  startedAt: string;
  endedAt?: string;
  mode: string;
  doctorName: string;
  complexity?: string;
  lifecycleStatus: string;
  summary?: string;
  hasPrescription: boolean;
  hasRecording: boolean;
  outcome?: string;
};

async function doctorNameMap(
  admin: SupabaseClient,
  userIds: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return map;
  const { data } = await admin.from("profiles").select("id,full_name").in("id", ids);
  for (const row of data ?? []) {
    const r = row as { id: string; full_name: string | null };
    map.set(r.id, r.full_name?.trim() || "Doctor");
  }
  return map;
}

function visitSummary(row: Record<string, unknown>): string | undefined {
  const note = row.note_final ?? row.clinical_record;
  const line = firstLineFromNote(note);
  if (line) return line;
  const fu = row.follow_up_note;
  if (typeof fu === "string" && fu.trim()) return fu.trim().slice(0, 200);
  return undefined;
}

export async function listPatientVisits(
  admin: SupabaseClient,
  ctx: PatientContext,
  opts: { limit?: number; cursor?: string }
): Promise<{ items: VisitListItem[]; nextCursor: string | null }> {
  const limit = clampLimit(opts.limit);
  let q = admin
    .from("consultations")
    .select(VISIT_SELECT)
    .eq("patient_id", ctx.patientId)
    .eq("clinic_id", ctx.clinicId)
    .order("started_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  const decoded = opts.cursor ? decodeCursor(opts.cursor) : null;
  if (decoded) {
    q = q.or(`started_at.lt.${decoded.iso},and(started_at.eq.${decoded.iso},id.lt.${decoded.id})`);
  }

  const { data: rows, error } = await q;
  if (error) throw error;

  const list = (rows ?? []) as Record<string, unknown>[];
  const page = list.slice(0, limit);
  const hasMore = list.length > limit;

  const consultIds = page.map((r) => r.id as string);
  const rxSet = new Set<string>();
  const outcomeByConsult = new Map<string, string>();

  if (consultIds.length > 0) {
    const [{ data: rxRows }, { data: outcomes }] = await Promise.all([
      admin.from("prescriptions").select("consultation_id").in("consultation_id", consultIds),
      admin.from("case_outcomes").select("consultation_id,outcome").in("consultation_id", consultIds)
    ]);
    for (const r of rxRows ?? []) {
      rxSet.add((r as { consultation_id: string }).consultation_id);
    }
    for (const o of outcomes ?? []) {
      const row = o as { consultation_id: string; outcome: string };
      outcomeByConsult.set(row.consultation_id, row.outcome);
    }
  }

  const names = await doctorNameMap(
    admin,
    page.map((r) => r.attending_user_id as string | null).filter(Boolean) as string[]
  );

  const items: VisitListItem[] = page.map((r) => ({
    id: r.id as string,
    startedAt: r.started_at as string,
    endedAt: (r.ended_at as string | null) ?? undefined,
    mode: (r.consultation_mode as string) ?? "IN_CLINIC",
    doctorName: names.get((r.attending_user_id as string) ?? "") ?? "Doctor",
    complexity: (r.complexity as string | null) ?? undefined,
    lifecycleStatus: (r.lifecycle_status as string) ?? "ACTIVE",
    summary: visitSummary(r),
    hasPrescription: rxSet.has(r.id as string) || Boolean(r.pdf_object_id),
    hasRecording: Boolean(r.audio_object_key),
    outcome: outcomeByConsult.get(r.id as string)
  }));

  let nextCursor: string | null = null;
  if (hasMore && page.length > 0) {
    const last = page[page.length - 1]!;
    nextCursor = encodeCursor(String(last.started_at), String(last.id));
  }

  return { items, nextCursor };
}

export async function getPatientVisitDetail(
  admin: SupabaseClient,
  ctx: PatientContext,
  visitId: string
): Promise<{
  visit: VisitListItem;
  chiefComplaint?: string;
  advice: PatientAdviceCard[];
  prescription?: { id: string; items: ReturnType<typeof mapPrescriptionItems>; pdfUrl?: string };
  followUp?: { id: string; dueAt: string; symptomsToMonitor: string[] };
} | null> {
  const { data: row, error } = await admin
    .from("consultations")
    .select(`${VISIT_SELECT},audio_object_key,follow_up_note,follow_up_recommended_at`)
    .eq("id", visitId)
    .eq("patient_id", ctx.patientId)
    .eq("clinic_id", ctx.clinicId)
    .maybeSingle();

  if (error) throw error;
  if (!row) return null;

  const r = row as Record<string, unknown>;
  const names = await doctorNameMap(admin, [r.attending_user_id as string].filter(Boolean));

  const { data: rx } = await admin
    .from("prescriptions")
    .select("id,items,created_at")
    .eq("consultation_id", visitId)
    .eq("patient_id", ctx.patientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let pdfUrl: string | undefined;
  const pdfId = r.pdf_object_id as string | null;
  if (pdfId) {
    const { data: media } = await admin
      .from("media_objects")
      .select("storage_object_key")
      .eq("id", pdfId)
      .eq("clinic_id", ctx.clinicId)
      .maybeSingle();
    const key = (media as { storage_object_key?: string } | null)?.storage_object_key;
    if (key && !key.startsWith("inline:")) {
      pdfUrl = await createDownloadUrl(key);
    }
  }

  const { data: fu } = await admin
    .from("follow_ups")
    .select("id,due_at,status")
    .eq("consultation_id", visitId)
    .eq("patient_id", ctx.patientId)
    .in("status", ["PENDING", "IN_PROGRESS"])
    .order("due_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const { data: outcome } = await admin
    .from("case_outcomes")
    .select("outcome")
    .eq("consultation_id", visitId)
    .maybeSingle();

  const visit: VisitListItem = {
    id: r.id as string,
    startedAt: r.started_at as string,
    endedAt: (r.ended_at as string | null) ?? undefined,
    mode: (r.consultation_mode as string) ?? "IN_CLINIC",
    doctorName: names.get((r.attending_user_id as string) ?? "") ?? "Doctor",
    complexity: (r.complexity as string | null) ?? undefined,
    lifecycleStatus: (r.lifecycle_status as string) ?? "ACTIVE",
    summary: visitSummary(r),
    hasPrescription: Boolean(rx) || Boolean(pdfId),
    hasRecording: Boolean(r.audio_object_key),
    outcome: (outcome as { outcome?: string } | null)?.outcome
  };

  const cr = r.clinical_record;
  let chiefComplaint: string | undefined;
  if (cr && typeof cr === "object") {
    const c = (cr as Record<string, unknown>).chiefComplaints ?? (cr as Record<string, unknown>).chief_complaints;
    if (typeof c === "string" && c.trim()) chiefComplaint = c.trim();
  }

  const advice = mergeAdvice(r.advice, r.clinical_record);

  return {
    visit,
    chiefComplaint,
    advice,
    prescription: rx
      ? {
          id: (rx as { id: string }).id,
          items: mapPrescriptionItems((rx as { items: unknown }).items),
          pdfUrl
        }
      : pdfUrl
        ? { id: visitId, items: [], pdfUrl }
        : undefined,
    followUp: fu
      ? {
          id: (fu as { id: string }).id,
          dueAt: (fu as { due_at: string }).due_at,
          symptomsToMonitor: Array.isArray(r.symptoms_to_monitor)
            ? (r.symptoms_to_monitor as string[])
            : []
        }
      : undefined
  };
}

export async function getPatientPrescription(
  admin: SupabaseClient,
  ctx: PatientContext,
  prescriptionId: string
): Promise<{ id: string; items: ReturnType<typeof mapPrescriptionItems>; pdfUrl?: string; consultationId: string } | null> {
  const { data: rx, error } = await admin
    .from("prescriptions")
    .select("id,items,consultation_id")
    .eq("id", prescriptionId)
    .eq("patient_id", ctx.patientId)
    .eq("clinic_id", ctx.clinicId)
    .maybeSingle();

  if (error) throw error;
  if (!rx) return null;

  const consultationId = (rx as { consultation_id: string }).consultation_id;
  const { data: consult } = await admin
    .from("consultations")
    .select("pdf_object_id")
    .eq("id", consultationId)
    .eq("patient_id", ctx.patientId)
    .maybeSingle();

  let pdfUrl: string | undefined;
  const pdfId = (consult as { pdf_object_id?: string } | null)?.pdf_object_id;
  if (pdfId) {
    const { data: media } = await admin
      .from("media_objects")
      .select("storage_object_key")
      .eq("id", pdfId)
      .maybeSingle();
    const key = (media as { storage_object_key?: string } | null)?.storage_object_key;
    if (key && !key.startsWith("inline:")) {
      pdfUrl = await createDownloadUrl(key);
    }
  }

  return {
    id: (rx as { id: string }).id,
    items: mapPrescriptionItems((rx as { items: unknown }).items),
    pdfUrl,
    consultationId
  };
}

export { restrictionsFromAdvice };

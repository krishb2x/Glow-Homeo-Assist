import type { SupabaseClient } from "@supabase/supabase-js";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UntypedFrom = ReturnType<SupabaseClient<any>["from"]>;
import { startSpan } from "../../lib/observability";

const MS_FOLLOWUP_DUE = 14 * 24 * 60 * 60 * 1000;

function firstLine(n: unknown): string | null {
  if (!n || typeof n !== "object") return null;
  const t = n as Record<string, unknown>;
  const c = t.chiefComplaints ?? t.chief_complaints;
  if (typeof c === "string" && c.trim()) {
    return c.length > 160 ? `${c.slice(0, 160)}…` : c;
  }
  if (typeof t.summary === "string" && t.summary.trim()) {
    return t.summary.length > 120 ? `${t.summary.slice(0, 120)}…` : t.summary;
  }
  return null;
}

function extractNoteDetail(n: unknown): Record<string, string> | null {
  if (!n || typeof n !== "object") return null;
  const t = n as Record<string, unknown>;
  const o: Record<string, string> = {};
  for (const k of ["chiefComplaints", "emotionalState", "timeline", "physicalSymptoms", "modalities"]) {
    if (typeof t[k] === "string" && (t[k] as string).trim()) o[k] = t[k] as string;
  }
  return Object.keys(o).length ? o : null;
}

export type TimelineQuery = {
  limit: number;
  offset: number;
  includeNotes: boolean;
};

export type TimelineResult = {
  events: Array<Record<string, unknown>>;
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};

/**
 * Paginated timeline — consultations fetched without note JSONB when includeNotes=false.
 * explain: idx_consult_patient_timeline + limit avoids multi-MB note_final payloads at 500+ consults.
 */
export async function buildPatientTimeline(
  client: SupabaseClient,
  clinicId: string,
  patientId: string,
  q: TimelineQuery
): Promise<TimelineResult> {
  const span = startSpan("build_patient_timeline", { patientId, includeNotes: q.includeNotes });

  const { count: consultCount } = await client
    .from("consultations")
    .select("id", { count: "exact", head: true })
    .eq("patient_id", patientId)
    .eq("clinic_id", clinicId);

  const consultSelect = q.includeNotes
    ? "id,patient_id,type,started_at,ended_at,note_draft,note_final,has_final_note"
    : "id,patient_id,type,started_at,ended_at,has_final_note";

  const consultTable = client.from("consultations") as UntypedFrom;
  const { data: consRows, error: cErr } = await consultTable
    .select(consultSelect)
    .eq("patient_id", patientId)
    .eq("clinic_id", clinicId)
    .order("started_at", { ascending: false })
    .range(q.offset, q.offset + q.limit - 1);

  if (cErr) throw cErr;

  const { data: rxRows } = await client
    .from("prescriptions")
    .select("id,items,created_at,consultation_id")
    .eq("patient_id", patientId)
    .eq("clinic_id", clinicId)
    .order("created_at", { ascending: false })
    .limit(Math.min(q.limit, 40));

  const now = new Date();
  const events: Array<Record<string, unknown>> = [];
  const cons = (consRows ?? []) as unknown[];

  for (const r of cons) {
    const at = (r as { ended_at?: string; started_at: string }).ended_at ?? (r as { started_at: string }).started_at;
    if (!at) continue;
    const hasNoteFinal = Boolean(
      (r as { has_final_note?: boolean }).has_final_note ??
        (r as { note_final?: unknown }).note_final
    );
    let summary: string | null = null;
    let detail: Record<string, string> | null = null;
    if (q.includeNotes) {
      const final = (r as { note_final?: unknown }).note_final;
      const draft = (r as { note_draft?: unknown }).note_draft;
      summary = firstLine(final) ?? firstLine(draft);
      detail = extractNoteDetail(final) ?? extractNoteDetail(draft);
    }
    events.push({
      kind: "consultation",
      id: (r as { id: string }).id,
      consultationId: (r as { id: string }).id,
      at: new Date(at).toISOString(),
      visitType: (r as { type: string }).type,
      endedAt: (r as { ended_at?: string }).ended_at ?? null,
      hasNoteFinal,
      summary: summary ?? (hasNoteFinal ? "Case notes on file" : "Draft in progress or notes pending"),
      ...(detail && q.includeNotes ? { detail } : {})
    });
  }

  for (const r of rxRows ?? []) {
    const it = (r as { items?: unknown }).items;
    const items = Array.isArray(it) ? it : [];
    events.push({
      kind: "prescription",
      id: (r as { id: string }).id,
      at: new Date((r as { created_at: string }).created_at).toISOString(),
      items: items
        .filter((x) => Boolean(x) && typeof x === "object")
        .map((i) => {
          const o = i as Record<string, unknown>;
          if (typeof o.remedyName === "string") {
            return {
              remedyName: o.remedyName,
              potency: String(o.potency ?? ""),
              dosage: String(o.dosage ?? ""),
              frequency: String(o.frequency ?? ""),
              duration: String(o.duration ?? ""),
              instructions: String(o.instructions ?? "")
            };
          }
          return {
            remedy: String(o.doctorVisibleRemedy ?? o.remedy ?? ""),
            code: String(o.patientVisibleCode ?? o.code ?? ""),
            dosage: String(o.dosageInstruction ?? o.dosage ?? "")
          };
        }),
      consultationId: (r as { consultation_id: string | null }).consultation_id
    });
  }

  const { data: fuRows } = await client
    .from("follow_ups")
    .select("id,due_at,title,reason,status,consultation_id,completed_at")
    .eq("patient_id", patientId)
    .eq("clinic_id", clinicId)
    .order("due_at", { ascending: false })
    .limit(30);

  let hasIntentionalFu = false;
  for (const fu of fuRows ?? []) {
    const f = fu as {
      id: string;
      due_at: string;
      title: string;
      reason: string | null;
      status: string;
      consultation_id: string | null;
    };
    if (f.status === "COMPLETED" || f.status === "CANCELLED") continue;
    hasIntentionalFu = true;
    const overdue = now.getTime() > new Date(f.due_at).getTime() && f.status === "PENDING";
    events.push({
      kind: "followup",
      id: f.id,
      at: f.due_at,
      dueAt: f.due_at,
      title: f.title,
      reason: f.reason ?? undefined,
      sourceConsultationId: f.consultation_id ?? "",
      status: f.status,
      overdue,
      source: "intentional"
    });
  }

  if (!hasIntentionalFu && cons.length > 0) {
    const withEnded = cons
      .filter((r) => (r as { ended_at?: string }).ended_at)
      .map((r) => ({
        id: (r as { id: string }).id,
        ended: new Date((r as { ended_at: string }).ended_at).getTime()
      }))
      .sort((a, b) => b.ended - a.ended);
    if (withEnded[0]) {
      const due = withEnded[0].ended + MS_FOLLOWUP_DUE;
      events.push({
        kind: "followup",
        id: `fu-${withEnded[0].id}`,
        at: new Date(due).toISOString(),
        dueAt: new Date(due).toISOString(),
        title: "Post-consultation check-in",
        sourceConsultationId: withEnded[0].id,
        overdue: now.getTime() > due,
        source: "suggested"
      });
    }
  }

  const consultIds = cons.map((r) => (r as { id: string }).id);
  if (consultIds.length > 0) {
    const { data: docRows } = await client
      .from("file_objects")
      .select("id,object_key,category,created_at")
      .eq("clinic_id", clinicId)
      .eq("category", "document")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(15);
    for (const d of docRows ?? []) {
      const dr = d as { id: string; object_key: string; created_at: string };
      events.push({
        kind: "document",
        id: dr.id,
        at: dr.created_at,
        objectKey: dr.object_key,
        filename: dr.object_key.split("/").pop() ?? "Document"
      });
    }
  }

  const { data: outcomeRows } = await client
    .from("case_outcomes")
    .select("id,consultation_id,outcome,assessment,documented_at")
    .eq("patient_id", patientId)
    .eq("clinic_id", clinicId)
    .order("documented_at", { ascending: false })
    .limit(20);

  for (const o of outcomeRows ?? []) {
    const or = o as {
      id: string;
      consultation_id: string;
      outcome: string;
      assessment: string | null;
      documented_at: string;
    };
    events.push({
      kind: "case_outcome",
      id: or.id,
      at: or.documented_at,
      consultationId: or.consultation_id,
      outcome: or.outcome,
      assessment: or.assessment ?? undefined
    });
  }

  events.sort((a, b) => new Date(String(b.at)).getTime() - new Date(String(a.at)).getTime());

  const total = consultCount ?? cons.length;
  const hasMore = q.offset + cons.length < total;

  span.end({ eventCount: events.length, hasMore });
  return {
    events,
    total,
    limit: q.limit,
    offset: q.offset,
    hasMore
  };
}

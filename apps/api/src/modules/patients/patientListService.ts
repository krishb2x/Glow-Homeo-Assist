import type { SupabaseClient } from "@supabase/supabase-js";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UntypedFrom = ReturnType<SupabaseClient<any>["from"]>;
import { startSpan } from "../../lib/observability";

const MS_FOLLOWUP_DUE = 14 * 24 * 60 * 60 * 1000;

export type PatientListQuery = {
  limit: number;
  offset: number;
  search?: string;
  tags?: string;
  status?: "stable" | "critical";
  sort?: "created_at" | "last_visit_at" | "name";
  sortDir?: "asc" | "desc";
  lightweight?: boolean;
  cursor?: string;
};

export type PatientListItemDto = {
  id: string;
  name: string;
  phone?: string;
  languagePreference: string | null;
  age?: number;
  initialChiefComplaint?: string;
  createdAt: string;
  lastVisitAt: string | null;
  status: "stable" | "critical";
  tags?: string[];
  allergies?: string;
  visitCount?: number;
  activeConsultCount?: number;
};

export type PatientListResult = {
  items: PatientListItemDto[];
  total: number;
  limit: number;
  offset: number;
  nextCursor: string | null;
};

function decodeCursor(cursor: string): { createdAt: string; id: string } | null {
  try {
    const raw = Buffer.from(cursor, "base64url").toString("utf8");
    const p = JSON.parse(raw) as { createdAt: string; id: string };
    if (p.createdAt && p.id) return p;
  } catch {
    /* ignore */
  }
  return null;
}

function encodeCursor(createdAt: string, id: string): string {
  return Buffer.from(JSON.stringify({ createdAt, id }), "utf8").toString("base64url");
}

/**
 * Paginated patient list — uses denormalized follow_up_status + last_visit_at (no full-clinic consult scan).
 * explain: idx_patients_clinic_follow_up supports status filter; offset pagination for UI, cursor for infinite scroll.
 */
export async function listPatients(
  client: SupabaseClient,
  clinicId: string,
  q: PatientListQuery
): Promise<PatientListResult> {
  const span = startSpan("list_patients", { clinicId, limit: q.limit });

  // Columns from enterprise migration — regenerate Supabase types after db push.
  const table = client.from("patients") as UntypedFrom;
  let query = table
    .select(
      q.lightweight
        ? "id,name,phone,last_visit_at,follow_up_status,tags,created_at"
        : "id,name,phone,language_preference,age,initial_chief_complaint,created_at,tags,allergies,last_visit_at,visit_count,active_consult_count,follow_up_status",
      { count: "exact" }
    )
    .eq("clinic_id", clinicId);

  if (q.search?.trim()) {
    const s = `%${q.search.trim().replace(/%/g, "")}%`;
    query = query.or(`name.ilike.${s},phone.ilike.${s}`);
  }
  if (q.tags?.trim()) {
    const tagList = q.tags.split(",").map((t) => t.trim()).filter(Boolean);
    if (tagList.length > 0) query = query.overlaps("tags", tagList);
  }
  if (q.status) {
    query = query.eq("follow_up_status", q.status);
  }

  const sortCol = q.sort === "name" ? "name" : q.sort === "last_visit_at" ? "last_visit_at" : "created_at";
  const ascending = q.sortDir === "asc";

  const decoded = q.cursor ? decodeCursor(q.cursor) : null;
  if (decoded) {
    query = query.or(
      `created_at.lt.${decoded.createdAt},and(created_at.eq.${decoded.createdAt},id.lt.${decoded.id})`
    );
  }

  const { data, error, count } = await query
    .order(sortCol, { ascending, nullsFirst: false })
    .order("id", { ascending: false })
    .range(q.offset, q.offset + q.limit - 1);

  if (error) throw error;

  const now = Date.now();
  const rows = (data ?? []) as unknown[];
  const items: PatientListItemDto[] = rows.map((row) => {
    const r = row as {
      id: string;
      name: string;
      phone: string | null;
      language_preference?: string | null;
      age?: number | null;
      initial_chief_complaint?: string | null;
      created_at: string;
      tags?: string[] | null;
      allergies?: string | null;
      last_visit_at?: string | null;
      visit_count?: number;
      active_consult_count?: number;
      follow_up_status?: string;
    };
    const last = r.last_visit_at ?? null;
    let status: "stable" | "critical" =
      r.follow_up_status === "critical" ? "critical" : "stable";
    if (!r.follow_up_status && last && now > new Date(last).getTime() + MS_FOLLOWUP_DUE) {
      status = "critical";
    }
    return {
      id: r.id,
      name: r.name,
      phone: r.phone ?? undefined,
      languagePreference: r.language_preference ?? null,
      age: r.age ?? undefined,
      initialChiefComplaint: r.initial_chief_complaint ?? undefined,
      createdAt: r.created_at,
      lastVisitAt: last,
      status,
      tags: Array.isArray(r.tags) ? r.tags : undefined,
      allergies: r.allergies ?? undefined,
      visitCount: r.visit_count,
      activeConsultCount: r.active_consult_count
    };
  });

  const lastRow = rows[rows.length - 1] as unknown as { created_at: string; id: string } | undefined;
  const nextCursor =
    lastRow && items.length === q.limit
      ? encodeCursor(lastRow.created_at, lastRow.id)
      : null;

  span.end({ total: count ?? items.length });
  return {
    items,
    total: count ?? items.length,
    limit: q.limit,
    offset: q.offset,
    nextCursor
  };
}

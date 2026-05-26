/**
 * Pure helpers for clinic operational queues — active visits, follow-ups, reminders.
 * Used by the dashboard and consultation hub to dedupe, prioritize, and group at scale.
 */

import type { ActiveConsultationRow, FollowUpQueueItem } from "./doctor-api";

export type ActiveVisitRow = ActiveConsultationRow & {
  mode: "IN_CLINIC" | "ONLINE";
  /** Additional open visits for the same patient (older sessions). */
  duplicateCount: number;
  /** Started more than 24 h ago and still open. */
  stale: boolean;
  /** Minutes since start. */
  ageMinutes: number;
  videoStatus?: string | null;
  patientWaitingSince?: string | null;
};

export type FollowUpGroup = "overdue" | "today" | "upcoming";

export type GroupedFollowUp = FollowUpQueueItem & { group: FollowUpGroup };

const STALE_MS = 24 * 60 * 60 * 1000;

/** Keep the newest open visit per patient; surface duplicates and stale visits. */
export function dedupeActiveVisits(
  inClinic: ActiveConsultationRow[],
  online: ActiveConsultationRow[]
): ActiveVisitRow[] {
  const tagged: ActiveVisitRow[] = [
    ...inClinic.map((v) => ({
      ...v,
      mode: "IN_CLINIC" as const,
      duplicateCount: 0,
      stale: false,
      ageMinutes: 0,
      videoStatus: null,
      patientWaitingSince: null
    })),
    ...online.map((v) => ({
      ...v,
      mode: "ONLINE" as const,
      duplicateCount: 0,
      stale: false,
      ageMinutes: 0,
      videoStatus: v.videoStatus ?? null,
      patientWaitingSince: v.patientWaitingSince ?? null
    }))
  ];

  const byPatient = new Map<string, ActiveVisitRow[]>();
  for (const v of tagged) {
    const list = byPatient.get(v.patientId) ?? [];
    list.push(v);
    byPatient.set(v.patientId, list);
  }

  const now = Date.now();
  const out: ActiveVisitRow[] = [];

  for (const visits of byPatient.values()) {
    visits.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    const primary = visits[0]!;
    const ageMs = now - new Date(primary.startedAt).getTime();
    out.push({
      ...primary,
      duplicateCount: Math.max(0, visits.length - 1),
      stale: ageMs > STALE_MS,
      ageMinutes: Math.floor(ageMs / 60_000)
    });
  }

  return out.sort((a, b) => {
    if (a.stale !== b.stale) return a.stale ? -1 : 1;
    return new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime();
  });
}

/** Index active visits by patient for O(1) duplicate-open lookup at hub start. */
export function activeVisitByPatientId(visits: ActiveVisitRow[]): Map<string, ActiveVisitRow> {
  const map = new Map<string, ActiveVisitRow>();
  for (const v of visits) {
    map.set(v.patientId, v);
  }
  return map;
}

/** Newest open visit for a patient, if any. */
export function findOpenVisitForPatient(
  patientId: string,
  visits: ActiveVisitRow[]
): ActiveVisitRow | undefined {
  return activeVisitByPatientId(visits).get(patientId);
}

/** Other in-progress visits excluding the current consultation. */
export function otherActiveVisits(
  visits: ActiveVisitRow[],
  currentConsultationId: string
): ActiveVisitRow[] {
  return visits.filter((v) => v.id !== currentConsultationId);
}

export function groupFollowUps(items: FollowUpQueueItem[], now = new Date()): GroupedFollowUp[] {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const byPatient = new Map<string, GroupedFollowUp>();

  for (const f of items) {
    const due = new Date(f.dueAt);
    let group: FollowUpGroup = "upcoming";
    if (f.overdue || due.getTime() < start.getTime()) group = "overdue";
    else if (due.getTime() < end.getTime()) group = "today";

    const existing = byPatient.get(f.patientId);
    if (!existing) {
      byPatient.set(f.patientId, { ...f, group });
      continue;
    }
    const rank = (g: FollowUpGroup) => (g === "overdue" ? 0 : g === "today" ? 1 : 2);
    if (rank(group) < rank(existing.group)) {
      byPatient.set(f.patientId, { ...f, group });
    } else if (group === existing.group && new Date(f.dueAt).getTime() < new Date(existing.dueAt).getTime()) {
      byPatient.set(f.patientId, { ...f, group });
    }
  }

  const out = [...byPatient.values()];
  out.sort((a, b) => {
    const rank = (g: FollowUpGroup) => (g === "overdue" ? 0 : g === "today" ? 1 : 2);
    const dr = rank(a.group) - rank(b.group);
    if (dr !== 0) return dr;
    return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
  });
  return out;
}

export function formatVisitAge(minutes: number): string {
  if (minutes < 2) return "just started";
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h < 24) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export type OperationalSummary = {
  activeCount: number;
  staleActiveCount: number;
  overdueFollowUps: number;
  todayFollowUps: number;
  draftNotes: number;
  pendingOutcomes: number;
  openMemos: number;
  urgentMemos: number;
  totalActions: number;
};

export function buildOperationalSummary(input: {
  activeVisits: ActiveVisitRow[];
  followUps: GroupedFollowUp[];
  draftNotes: number;
  pendingOutcomes: number;
  openMemos: number;
  urgentMemos: number;
}): OperationalSummary {
  const overdueFollowUps = input.followUps.filter((f) => f.group === "overdue").length;
  const todayFollowUps = input.followUps.filter((f) => f.group === "today").length;
  const staleActiveCount = input.activeVisits.filter((v) => v.stale).length;

  return {
    activeCount: input.activeVisits.length,
    staleActiveCount,
    overdueFollowUps,
    todayFollowUps,
    draftNotes: input.draftNotes,
    pendingOutcomes: input.pendingOutcomes,
    openMemos: input.openMemos,
    urgentMemos: input.urgentMemos,
    totalActions:
      overdueFollowUps +
      todayFollowUps +
      input.draftNotes +
      input.pendingOutcomes +
      input.urgentMemos +
      staleActiveCount
  };
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, ChevronDown, Loader2, Plus } from "lucide-react";
import {
  fetchDoctorMemoSummary,
  patchDoctorMemo,
  type DoctorMemo,
  type DoctorMemoSummary
} from "../../../lib/doctor-api";
import { friendlyLoadError } from "../../../lib/friendly-error";
import { DoctorMemoCard } from "./DoctorMemoCard";
import { cn } from "../../../lib/cn";

type MemoGroup = "overdue" | "today" | "pinned" | "other";

function groupMemos(memos: DoctorMemo[]): Record<MemoGroup, DoctorMemo[]> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const groups: Record<MemoGroup, DoctorMemo[]> = {
    overdue: [],
    today: [],
    pinned: [],
    other: []
  };

  for (const m of memos) {
    if (m.overdue) {
      groups.overdue.push(m);
      continue;
    }
    if (m.dueAt) {
      const t = new Date(m.dueAt).getTime();
      if (t >= start.getTime() && t < end.getTime()) {
        groups.today.push(m);
        continue;
      }
    }
    if (m.pinned) {
      groups.pinned.push(m);
      continue;
    }
    groups.other.push(m);
  }
  return groups;
}

const GROUP_META: Record<MemoGroup, { label: string; tone: string }> = {
  overdue: { label: "Overdue", tone: "text-rose-800" },
  today: { label: "Due today", tone: "text-amber-900" },
  pinned: { label: "Pinned", tone: "text-hs-primary" },
  other: { label: "Notes", tone: "text-hs-text-secondary" }
};

const PREVIEW_PER_GROUP = 3;

/**
 * Operational reminder queue — overdue, due today, pinned, and open notes.
 */
export function DashboardMemoWidget(): JSX.Element {
  const [summary, setSummary] = useState<DoctorMemoSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const load = useCallback(async () => {
    setErr(null);
    try {
      setSummary(await fetchDoctorMemoSummary());
    } catch (e) {
      setErr(friendlyLoadError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const queue = useMemo(
    () => summary?.actionQueue ?? summary?.topUrgent ?? [],
    [summary]
  );

  const groups = useMemo(() => groupMemos(queue), [queue]);

  const complete = useCallback(
    async (id: string) => {
      await patchDoctorMemo(id, { status: "done" });
      void load();
    },
    [load]
  );

  if (loading) {
    return (
      <section className="ds-card ds-card-pad">
        <p className="flex items-center gap-2 text-caption-sm text-hs-text-tertiary">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Loading reminders…
        </p>
      </section>
    );
  }

  if (err) {
    return (
      <section className="rounded-xl border border-rose-200/60 bg-rose-50/80 p-4 text-caption-sm text-rose-900">
        <p>{err}</p>
        <p className="mt-2 text-[11px] text-rose-800/80">
          If reminders fail to load, apply{" "}
          <code className="rounded bg-rose-100/80 px-1">20260526000000_doctor_memos.sql</code> in Supabase.
        </p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-2 text-caption-sm font-semibold text-rose-900 underline"
        >
          Retry
        </button>
      </section>
    );
  }

  const s = summary!;
  const hasWork = s.openCount > 0;
  const visibleGroups = (["overdue", "today", "pinned", "other"] as MemoGroup[]).filter(
    (g) => groups[g].length > 0
  );

  return (
    <section className="ds-card ds-card-pad">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-heading text-body-md font-semibold text-hs-ink">Reminders</h2>
          <p className="text-caption-sm text-hs-text-tertiary">Operational tasks for today</p>
        </div>
        {(s.overdueCount > 0 || s.urgentCount > 0) && (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/70 bg-amber-50 px-2 py-0.5 text-caption-sm font-semibold text-amber-900">
            <AlertCircle className="h-3 w-3" aria-hidden />
            {s.overdueCount > 0 ? `${s.overdueCount} overdue` : `${s.urgentCount} urgent`}
          </span>
        )}
      </div>

      {hasWork ? (
        <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-caption-sm">
          {[
            { label: "Open", value: s.openCount },
            { label: "Due today", value: s.dueTodayCount, warn: s.dueTodayCount > 0 },
            { label: "Overdue", value: s.overdueCount, warn: s.overdueCount > 0 },
            { label: "Pinned", value: s.pinnedCount }
          ].filter(pill => pill.value > 0).map((pill) => (
            <div key={pill.label} className="flex items-baseline gap-1.5">
              <dt className="text-hs-text-tertiary">{pill.label}</dt>
              <dd
                className={cn(
                  "font-semibold tabular-nums",
                  pill.warn ? "text-rose-800" : "text-hs-ink"
                )}
              >
                {pill.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {!hasWork ? (
        <div className="mt-4 rounded-xl border border-dashed border-hs-border/40 bg-hs-cream/30 px-3 py-4 text-center">
          <p className="text-body-sm text-hs-text-secondary">No reminders today.</p>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          {visibleGroups.map((groupKey) => {
            const items = groups[groupKey];
            const meta = GROUP_META[groupKey];
            const limit = expanded ? items.length : PREVIEW_PER_GROUP;
            const hidden = items.length - limit;

            return (
              <details key={groupKey} open={groupKey === "overdue" || groupKey === "today"} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-caption-sm font-semibold marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className={meta.tone}>
                    {meta.label}
                    <span className="ml-1.5 font-normal text-hs-text-tertiary">({items.length})</span>
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-hs-text-tertiary transition group-open:rotate-180" />
                </summary>
                <ul className="mt-1.5 space-y-1.5">
                  {items.slice(0, limit).map((m) => (
                    <li key={m.id}>
                      <DoctorMemoCard memo={m} compact onComplete={complete} />
                    </li>
                  ))}
                </ul>
                {hidden > 0 && !expanded ? (
                  <button
                    type="button"
                    onClick={() => setExpanded(true)}
                    className="mt-1 text-caption-sm font-semibold text-hs-primary hover:underline"
                  >
                    +{hidden} more in this group
                  </button>
                ) : null}
              </details>
            );
          })}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-hs-border/20 pt-3">
        {queue[0]?.patientId ? (
          <Link
            href={`/patients/${encodeURIComponent(queue[0].patientId)}/timeline`}
            className="text-caption-sm font-semibold text-hs-primary hover:underline"
          >
            Patient chart →
          </Link>
        ) : null}
        <Link
          href="/consultation"
          className="inline-flex items-center gap-1 text-caption-sm font-semibold text-hs-text-secondary hover:text-hs-primary"
        >
          <Plus className="h-3 w-3" aria-hidden />
          Add during visit
        </Link>
      </div>
    </section>
  );
}

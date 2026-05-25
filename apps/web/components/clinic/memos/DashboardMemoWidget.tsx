"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import {
  fetchDoctorMemoSummary,
  patchDoctorMemo,
  type DoctorMemoSummary
} from "../../../lib/doctor-api";
import { friendlyLoadError } from "../../../lib/friendly-error";
import { DoctorMemoCard } from "./DoctorMemoCard";

/**
 * Dashboard widget: urgent operational memory at a glance.
 */
export function DashboardMemoWidget(): JSX.Element {
  const [summary, setSummary] = useState<DoctorMemoSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

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

  if (loading) {
    return (
      <section className="ds-card ds-card-pad">
        <p className="flex items-center gap-2 text-caption-sm text-hs-text-tertiary">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Loading operational notes…
        </p>
      </section>
    );
  }

  if (err) {
    return (
      <section className="rounded-2xl border border-rose-200/60 bg-rose-50/80 p-4 text-caption-sm text-rose-900">
        {err}
      </section>
    );
  }

  const s = summary!;
  const hasWork = s.openCount > 0;

  return (
    <section className="ds-card ds-card-pad">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-heading text-body-md font-semibold text-hs-ink">Today&rsquo;s notes</h2>
          <p className="text-caption-sm text-hs-text-tertiary">Reminders and quick tasks</p>
        </div>
        {s.urgentCount > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/70 bg-amber-50 px-2 py-0.5 text-caption-sm font-semibold text-amber-900">
            <AlertCircle className="h-3 w-3" aria-hidden />
            {s.urgentCount} urgent
          </span>
        ) : null}
      </div>

      <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-caption-sm">
        {[
          { label: "Open", value: s.openCount },
          { label: "Due today", value: s.dueTodayCount },
          { label: "Overdue", value: s.overdueCount, warn: s.overdueCount > 0 },
          { label: "Pinned", value: s.pinnedCount }
        ].map((pill) => (
          <div key={pill.label} className="flex items-baseline gap-1.5">
            <dt className="text-hs-text-tertiary">{pill.label}</dt>
            <dd
              className={
                "font-semibold tabular-nums " + (pill.warn ? "text-rose-800" : "text-hs-ink")
              }
            >
              {pill.value}
            </dd>
          </div>
        ))}
      </dl>

      {!hasWork ? (
        <p className="mt-4 rounded-xl border border-dashed border-hs-border/40 bg-hs-cream/30 px-3 py-3 text-body-sm text-hs-text-tertiary">
          Your operational queue is clear. Add a note from any patient visit or the command palette.
        </p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {s.topUrgent.slice(0, 4).map((m) => (
            <li key={m.id}>
              <DoctorMemoCard
                memo={m}
                compact
                onComplete={async (id) => {
                  await patchDoctorMemo(id, { status: "done" });
                  void load();
                }}
              />
            </li>
          ))}
        </ul>
      )}

      {hasWork && s.topUrgent[0]?.patientId ? (
        <Link
          href={`/patients/${encodeURIComponent(s.topUrgent[0]!.patientId!)}/timeline`}
          className="mt-3 block text-center text-caption-sm font-semibold text-hs-primary hover:underline"
        >
          Open patient record →
        </Link>
      ) : null}
    </section>
  );
}

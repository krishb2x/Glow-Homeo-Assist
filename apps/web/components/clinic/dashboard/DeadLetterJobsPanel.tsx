"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchDeadLetterJobs, retryDeadLetterJob, type DeadLetterJob } from "../../../lib/doctor-api";

type Props = {
  className?: string;
};

/** Ops visibility for failed WhatsApp / notification jobs. */
export function DeadLetterJobsPanel({ className }: Props): JSX.Element | null {
  const [jobs, setJobs] = useState<DeadLetterJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchDeadLetterJobs();
      setJobs(rows);
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (loading) return null;
  if (jobs.length === 0) return null;

  return (
    <section
      className={`rounded-xl border border-rose-200/70 bg-rose-50/50 px-4 py-3 ${className ?? ""}`}
      aria-label="Failed message deliveries"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-caption-sm font-semibold uppercase tracking-wide text-rose-900/80">
          Failed deliveries ({jobs.length})
        </p>
        <button
          type="button"
          onClick={() => void reload()}
          className="text-caption-sm font-semibold text-rose-800 hover:underline"
        >
          Refresh
        </button>
      </div>
      <ul className="mt-2 space-y-2">
        {jobs.slice(0, 5).map((j) => (
          <li key={j.id} className="rounded-lg border border-rose-100 bg-white/80 px-3 py-2 text-body-sm">
            <p className="font-medium text-slate-900">{j.topic.replace(/_/g, " ")}</p>
            <p className="mt-0.5 text-caption-sm text-slate-600 line-clamp-2">
              {j.last_error ?? "Delivery failed"}
            </p>
            <button
              type="button"
              disabled={busyId === j.id}
              onClick={() => {
                setBusyId(j.id);
                void retryDeadLetterJob(j.id)
                  .then(() => reload())
                  .finally(() => setBusyId(null));
              }}
              className="mt-2 text-caption-sm font-semibold text-hs-primary hover:underline disabled:opacity-50"
            >
              {busyId === j.id ? "Retrying…" : "Retry"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

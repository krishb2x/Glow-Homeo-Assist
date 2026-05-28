"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Calendar, Pill, Stethoscope } from "lucide-react";
import {
  fetchPatientTimeline,
  type CaseOutcomeValue,
  type TimelineEvent
} from "../../../lib/doctor-api";
import { cn } from "../../../lib/cn";

const OUTCOME_LABEL: Record<CaseOutcomeValue, string> = {
  CURE: "Cure",
  IMPROVEMENT: "Better",
  PALLIATION: "Palliation",
  NO_CHANGE: "No change",
  WORSE: "Worse"
};

type VisitCard = {
  id: string;
  at: string;
  visitType: string;
  remedySummary: string | null;
  outcome: CaseOutcomeValue | null;
  consultationId: string | null;
};

function buildVisitCards(events: TimelineEvent[], currentConsultId: string): VisitCard[] {
  const outcomesByConsult = new Map<string, CaseOutcomeValue>();
  for (const e of events) {
    if (e.kind === "case_outcome") outcomesByConsult.set(e.consultationId, e.outcome);
  }

  const rxByConsult = new Map<string, string>();
  for (const e of events) {
    if (e.kind === "prescription" && e.consultationId) {
      const names = e.items.map((i) => i.remedy).filter(Boolean).slice(0, 2).join(", ");
      if (names) rxByConsult.set(e.consultationId, names);
    }
  }

  const consults = events.filter(
    (e): e is Extract<TimelineEvent, { kind: "consultation" }> =>
      e.kind === "consultation" && e.consultationId !== currentConsultId && Boolean(e.endedAt)
  );

  return consults.slice(0, 3).map((c) => ({
    id: c.id,
    at: c.at,
    visitType: c.visitType,
    remedySummary: rxByConsult.get(c.consultationId) ?? null,
    outcome: outcomesByConsult.get(c.consultationId) ?? null,
    consultationId: c.consultationId
  }));
}

type Props = {
  patientId: string;
  currentConsultationId: string;
  className?: string;
};

export function ConsultationPastVisitsPanel({
  patientId,
  currentConsultationId,
  className
}: Props): JSX.Element {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) return;
    setLoading(true);
    void fetchPatientTimeline(patientId, { limit: 24, offset: 0, includeNotes: false })
      .then((r) => setEvents(r.events))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [patientId]);

  const visits = useMemo(
    () => buildVisitCards(events, currentConsultationId),
    [events, currentConsultationId]
  );

  return (
    <section
      className={cn("shrink-0 border-b border-hs-border/20 bg-hs-cream/10 px-4 py-4", className)}
      aria-label="Recent visits"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-heading text-[10.5px] font-bold uppercase tracking-wider text-hs-text-secondary">
          Recent visits
        </h2>
        <Link
          href={`/patients/${encodeURIComponent(patientId)}/timeline`}
          className="text-[10px] font-bold text-hs-primary hover:text-hs-primary-light transition"
        >
          Full chart →
        </Link>
      </div>

      {loading ? (
        <p className="text-caption-sm text-hs-text-tertiary">Loading history…</p>
      ) : visits.length === 0 ? (
        <p className="rounded-xl border border-dashed border-hs-border/30 bg-hs-paper/40 px-3 py-4 text-caption-sm text-hs-text-tertiary">
          First visit — no prior consultations on chart.
        </p>
      ) : (
        <div className="relative border-l border-hs-border/40 pl-4 ml-2.5 my-2 space-y-4">
          {visits.map((v) => (
            <div key={v.id} className="relative">
              {/* Connected node dot */}
              <span
                className={cn(
                  "absolute -left-[calc(1rem+4.5px)] top-1 flex h-2 w-2 rounded-full border border-white shadow-sm transition-colors",
                  v.outcome === "CURE" || v.outcome === "IMPROVEMENT" ? "bg-emerald-500" : "bg-hs-primary"
                )}
                aria-hidden
              />
              <div
                className="rounded-xl border border-hs-border/20 bg-hs-paper p-3 shadow-sm hover:border-hs-primary/20 transition-all duration-200"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-caption-sm font-bold text-hs-ink">
                      {new Date(v.at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric"
                      })}
                    </p>
                    <span className="text-[9px] font-semibold text-hs-text-tertiary uppercase tracking-wider">
                      {v.visitType === "INITIAL" ? "New" : "Follow-up"}
                    </span>
                  </div>
                  {v.remedySummary ? (
                    <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-hs-text-secondary">
                      <Pill className="h-3.5 w-3.5 text-hs-primary/65 shrink-0" aria-hidden />
                      <span className="truncate" title={v.remedySummary}>{v.remedySummary}</span>
                    </p>
                  ) : null}
                  {v.outcome ? (
                    <div className="mt-2 flex">
                      <span className="inline-flex rounded-full border border-hs-border/30 bg-hs-cream/40 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-hs-text-secondary">
                        {OUTCOME_LABEL[v.outcome]}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 flex items-center gap-1.5 text-[9px] font-semibold text-hs-text-tertiary uppercase tracking-wider">
        <Calendar className="h-3.5 w-3.5" aria-hidden />
        Last 3 finalized visits
      </p>
    </section>
  );
}

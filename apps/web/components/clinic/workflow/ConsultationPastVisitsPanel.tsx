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
      className={cn("shrink-0 border-b border-hs-border/30 bg-hs-cream/20 px-3 py-3", className)}
      aria-label="Recent visits"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="font-heading text-caption-sm font-bold uppercase tracking-wide text-hs-text-tertiary">
          Recent visits
        </h2>
        <Link
          href={`/patients/${encodeURIComponent(patientId)}/timeline`}
          className="text-[10px] font-semibold text-hs-primary hover:underline"
        >
          Full chart
        </Link>
      </div>

      {loading ? (
        <p className="text-caption-sm text-hs-text-tertiary">Loading…</p>
      ) : visits.length === 0 ? (
        <p className="rounded-lg border border-dashed border-hs-border/40 bg-hs-paper/60 px-2.5 py-3 text-caption-sm text-hs-text-tertiary">
          First visit — no prior consultations on chart.
        </p>
      ) : (
        <ul className="space-y-2">
          {visits.map((v) => (
            <li
              key={v.id}
              className="rounded-xl border border-hs-border/30 bg-hs-paper/90 px-2.5 py-2 shadow-sm"
            >
              <div className="flex items-start gap-2">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-hs-primary-very-light text-hs-primary">
                  <Stethoscope className="h-3.5 w-3.5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-caption-sm font-semibold text-hs-ink">
                    {new Date(v.at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric"
                    })}
                  </p>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-hs-text-tertiary">
                    {v.visitType === "INITIAL" ? "New case" : "Follow-up"}
                  </p>
                  {v.remedySummary ? (
                    <p className="mt-0.5 flex items-center gap-1 text-caption-sm text-hs-text-secondary">
                      <Pill className="h-3 w-3 shrink-0" aria-hidden />
                      <span className="truncate">{v.remedySummary}</span>
                    </p>
                  ) : null}
                  {v.outcome ? (
                    <span className="mt-1 inline-flex rounded-full border border-hs-border/40 bg-hs-cream px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-hs-ink">
                      {OUTCOME_LABEL[v.outcome]}
                    </span>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-2 flex items-center gap-1 text-[10px] text-hs-text-tertiary">
        <Calendar className="h-3 w-3" aria-hidden />
        Last 3 finalized visits
      </p>
    </section>
  );
}

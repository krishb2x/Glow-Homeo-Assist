"use client";

import Link from "next/link";
import { ConsultationLink } from "../ConsultationLink";
import { liveConsultationHref } from "../../../lib/consultation-navigation";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  Stethoscope,
  Video
} from "lucide-react";
import type { MyDayResponse } from "../../../lib/doctor-api";
import {
  dedupeActiveVisits,
  formatVisitAge,
  type ActiveVisitRow
} from "../../../lib/operational-queue";
import { cn } from "../../../lib/cn";

type Filter = "all" | "in_clinic" | "online" | "stale";

const PREVIEW = 4;

type Props = {
  myDay: MyDayResponse | null;
  className?: string;
};

function VisitRow({ visit }: { visit: ActiveVisitRow }): JSX.Element {
  const ageDays = Math.floor(visit.ageMinutes / (60 * 24));
  let staleColor = "bg-slate-50 border-slate-200/30 text-slate-700";
  if (ageDays >= 30) staleColor = "bg-rose-50 border-rose-200/30 text-rose-800";
  else if (ageDays >= 7) staleColor = "bg-amber-50 border-amber-200/30 text-amber-800";

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-hs-border/20 bg-hs-paper px-4 py-3 text-body-sm transition-all duration-300 hover:border-hs-primary/30 hover:bg-hs-primary-very-light/20 hover:shadow-ds-sm hover:translate-x-1">
      <ConsultationLink
        href={liveConsultationHref(visit.id)}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        {visit.mode === "ONLINE" ? (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600 ring-1 ring-sky-200/50">
            <Video className="h-4 w-4" aria-hidden />
          </span>
        ) : (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-hs-primary-very-light text-hs-primary ring-1 ring-hs-primary/10">
            <Stethoscope className="h-4 w-4" aria-hidden />
          </span>
        )}
        <span className="min-w-0">
          <span className="block truncate font-bold text-hs-ink">{visit.patientName}</span>
          <span className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-hs-text-secondary mt-0.5">
            <Clock className="h-3 w-3 text-hs-text-tertiary" />
            <span>{formatVisitAge(visit.ageMinutes)}</span>
            {visit.mode === "ONLINE" ? (
              <span className="shrink-0 rounded-full bg-sky-50 px-2 py-0.2 border border-sky-200/30 text-[9px] font-bold uppercase tracking-wider text-sky-700">
                Video
              </span>
            ) : null}
            {visit.mode === "ONLINE" && visit.patientWaitingSince ? (
              <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.2 border border-amber-200/30 text-[9px] font-bold uppercase tracking-wider text-amber-800">
                Waiting
              </span>
            ) : null}
            {visit.stale ? (
              <span className={`rounded-full px-2 py-0.2 border text-[9px] font-bold uppercase tracking-wider ${staleColor}`}>
                Stale {ageDays > 0 ? `(${ageDays}d)` : ''}
              </span>
            ) : null}
            {visit.duplicateCount > 0 ? (
              <span className="text-hs-text-tertiary">+{visit.duplicateCount} older</span>
            ) : null}
          </span>
        </span>
      </ConsultationLink>
      
      <div className="flex shrink-0 items-center gap-2">
        <ConsultationLink
          href={liveConsultationHref(visit.id)}
          className="text-caption-sm font-bold text-hs-primary hover:text-hs-primary-light transition-colors px-3 py-1.5 rounded-lg border border-hs-primary/20 hover:bg-hs-primary/5 bg-white shadow-sm"
        >
          Resume
        </ConsultationLink>
        {ageDays > 7 ? (
          <button 
            type="button" 
            onClick={() => {
              // Archive action goes here
              console.log('Archive visit', visit.id);
            }}
            className="text-caption-sm font-bold text-rose-600 hover:text-rose-700 transition-colors px-3 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 bg-white shadow-sm"
          >
            Archive
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function OperationalQueuePanel({ myDay, className }: Props): JSX.Element | null {
  const [filter, setFilter] = useState<Filter>("all");
  const [expanded, setExpanded] = useState(false);

  const activeVisits = useMemo(
    () =>
      dedupeActiveVisits(
        myDay?.activeConsultations?.inClinic ?? [],
        myDay?.activeConsultations?.online ?? []
      ),
    [myDay]
  );

  const draftNotes = myDay?.needsNoteFinalization ?? [];
  const pendingOutcomes = myDay?.pendingOutcomes ?? [];

  const filtered = useMemo(() => {
    if (filter === "in_clinic") return activeVisits.filter((v) => v.mode === "IN_CLINIC");
    if (filter === "online") return activeVisits.filter((v) => v.mode === "ONLINE");
    if (filter === "stale") return activeVisits.filter((v) => v.stale);
    return activeVisits;
  }, [activeVisits, filter]);

  const staleCount = activeVisits.filter((v) => v.stale).length;
  const hasActions = draftNotes.length > 0 || pendingOutcomes.length > 0;
  const hasVisits = activeVisits.length > 0;

  if (!hasVisits && !hasActions) return null;

  const preview = expanded ? filtered : filtered.slice(0, PREVIEW);
  const hidden = filtered.length - preview.length;

  const filters: { id: Filter; label: string; count?: number }[] = [
    { id: "all", label: "All", count: activeVisits.length },
    {
      id: "in_clinic",
      label: "In-clinic",
      count: activeVisits.filter((v) => v.mode === "IN_CLINIC").length
    },
    {
      id: "online",
      label: "Online",
      count: activeVisits.filter((v) => v.mode === "ONLINE").length
    }
  ];
  if (staleCount > 0) filters.push({ id: "stale", label: "Stale", count: staleCount });

  return (
    <section
      className={cn("ds-card overflow-hidden border-hs-primary/20", className)}
      aria-label="Operational queue"
    >
      {/* Pending actions moved to Needs Attention Card in HomeOverview */}

      {hasVisits ? (
        <div className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-hs-primary" aria-hidden />
              <h2 className="font-heading text-body-md font-semibold text-hs-ink">
                {activeVisits.length === 1
                  ? "1 visit in progress"
                  : `${activeVisits.length} visits in progress`}
              </h2>
              {staleCount > 0 ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                  {staleCount} stale
                </span>
              ) : null}
            </div>
            <Link
              href="/consultation"
              className="text-caption-sm font-semibold text-hs-primary hover:underline"
            >
              Consultation hub →
            </Link>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Filter active visits">
            {filters.map((f) => {
              if (f.count === 0 && f.id !== "all") return null;
              const on = filter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => {
                    setFilter(f.id);
                    setExpanded(false);
                  }}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-caption-sm font-medium transition",
                    on
                      ? "bg-hs-primary text-white shadow-ds-sm"
                      : "border border-hs-border/40 bg-hs-cream/50 text-hs-text-secondary hover:border-hs-primary/30"
                  )}
                >
                  {f.label}
                  {f.count != null && f.count > 0 ? (
                    <span className="ml-1 tabular-nums opacity-80">{f.count}</span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {filtered.length === 0 ? (
            <p className="mt-3 text-caption-sm text-hs-text-tertiary">No visits match this filter.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {preview.map((v) => (
                <li key={v.id}>
                  <VisitRow visit={v} />
                </li>
              ))}
            </ul>
          )}

          {hidden > 0 ? (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg py-2 text-caption-sm font-semibold text-hs-primary transition hover:bg-hs-cream/60"
            >
              Show {hidden} more
              <ChevronDown className="h-3.5 w-3.5" aria-hidden />
            </button>
          ) : null}

          {expanded && filtered.length > PREVIEW ? (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg py-2 text-caption-sm font-semibold text-hs-text-secondary transition hover:bg-hs-cream/60"
            >
              Show less
              <ChevronRight className="h-3.5 w-3.5 rotate-[-90deg]" aria-hidden />
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

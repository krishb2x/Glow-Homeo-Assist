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
  return (
    <ConsultationLink
      href={liveConsultationHref(visit.id)}
      className="flex items-center justify-between gap-3 rounded-2xl border border-hs-border/20 bg-hs-paper px-4 py-3 text-body-sm transition-all duration-300 hover:border-hs-primary/30 hover:bg-hs-primary-very-light/20 hover:shadow-ds-sm hover:translate-x-1"
    >
      <span className="flex min-w-0 items-center gap-3">
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
              <span className="rounded-full bg-rose-50 px-2 py-0.2 border border-rose-200/30 text-[9px] font-bold uppercase tracking-wider text-rose-800">
                Stale
              </span>
            ) : null}
            {visit.duplicateCount > 0 ? (
              <span className="text-hs-text-tertiary">+{visit.duplicateCount} older</span>
            ) : null}
          </span>
        </span>
      </span>
      <span className="shrink-0 text-caption-sm font-bold text-hs-primary hover:text-hs-primary-light transition-colors">Resume →</span>
    </ConsultationLink>
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
      {/* Pending actions — draft notes & outcomes */}
      {hasActions ? (
        <div className="border-b border-hs-border/20 bg-amber-50/20 p-4 border-l-4 border-amber-500">
          <p className="text-caption-sm font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Needs attention
          </p>
          <ul className="mt-3 space-y-2">
            {draftNotes.slice(0, 3).map((n) => (
              <li key={n.consultationId}>
                <ConsultationLink
                  href={liveConsultationHref(n.consultationId, "notes")}
                  className="flex items-center justify-between gap-3 rounded-xl bg-hs-paper/90 px-3.5 py-2.5 text-caption-sm border border-amber-200/50 shadow-sm transition hover:border-hs-primary/20 hover:bg-hs-paper hover:translate-x-0.5"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
                    <span className="truncate">
                      <span className="font-bold text-hs-ink">{n.patientName}</span>
                      <span className="text-hs-text-secondary ml-1">— finalize notes</span>
                    </span>
                  </span>
                  <span className="shrink-0 font-bold text-hs-primary text-[11px]">Open →</span>
                </ConsultationLink>
              </li>
            ))}
            {pendingOutcomes.slice(0, 2).map((o) => (
              <li key={o.consultationId}>
                <ConsultationLink
                  href={liveConsultationHref(o.consultationId, "finalize")}
                  className="flex items-center justify-between gap-3 rounded-xl bg-hs-paper/90 px-3.5 py-2.5 text-caption-sm border border-amber-200/50 shadow-sm transition hover:border-hs-primary/20 hover:bg-hs-paper hover:translate-x-0.5"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
                    <span className="truncate">
                      <span className="font-bold text-hs-ink">{o.patientName}</span>
                      <span className="text-hs-text-secondary ml-1">— record outcome</span>
                    </span>
                  </span>
                  <span className="shrink-0 font-bold text-hs-primary text-[11px]">Open →</span>
                </ConsultationLink>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

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

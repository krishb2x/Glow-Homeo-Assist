"use client";

import Link from "next/link";
import { ConsultationLink } from "../ConsultationLink";
import { liveConsultationHref } from "../../../lib/consultation-navigation";
import { ChevronRight, Phone, Stethoscope } from "lucide-react";
import type { PatientListItem } from "../../../lib/doctor-api";
import { DS_BTN_PRIMARY } from "../../../lib/ds-classes";
import { PatientTagBadges } from "../PatientTagBadges";
import { cn } from "../../../lib/cn";

type Props = {
  patient: PatientListItem;
  onStart: () => void;
  /** When set, patient already has an open visit — offer resume. */
  openVisitId?: string;
  onStartNew?: () => void;
  starting?: boolean;
  disabled?: boolean;
  showDateHint?: boolean;
  highlight?: boolean;
};

export function PatientVisitCard({
  patient,
  onStart,
  openVisitId,
  onStartNew,
  starting = false,
  disabled = false,
  showDateHint = false,
  highlight = false
}: Props): JSX.Element {
  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-hs-paper p-4 shadow-ds-sm transition hover:shadow-md sm:p-5",
        highlight ? "border-hs-primary/35 ring-1 ring-hs-primary/10" : "border-hs-border/50 hover:border-hs-primary/25"
      )}
    >
      <div className="absolute left-0 top-0 h-full w-1 bg-hs-primary/0 transition group-hover:bg-hs-primary/70" aria-hidden />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-heading truncate text-body-md font-bold text-hs-ink">{patient.name}</h2>
            <PatientTagBadges tags={patient.tags} />
          </div>

          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-hs-text-secondary">
            {patient.age != null ? <span>{patient.age} years</span> : null}
            {patient.phone ? (
              <a
                href={`tel:${patient.phone.replace(/\s/g, "")}`}
                className="inline-flex items-center gap-1 text-hs-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                <Phone className="h-3.5 w-3.5" aria-hidden />
                {patient.phone}
              </a>
            ) : (
              <span className="text-hs-text-tertiary">No phone on file</span>
            )}
            {showDateHint ? (
              <span className="text-caption-sm text-hs-text-tertiary">
                Added {new Date(patient.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>
            ) : null}
          </p>

          {patient.initialChiefComplaint ? (
            <p className="mt-2 line-clamp-2 rounded-xl border border-hs-border/30 bg-hs-cream/50 px-3 py-2 text-body-sm text-hs-ink/90">
              {patient.initialChiefComplaint}
            </p>
          ) : (
            <p className="mt-2 text-caption-sm italic text-hs-text-tertiary">No chief complaint recorded</p>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          {openVisitId ? (
            <>
              <ConsultationLink
                href={liveConsultationHref(openVisitId)}
                className={cn(DS_BTN_PRIMARY, "min-w-[10.5rem] gap-2 text-center")}
              >
                <Stethoscope className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                Resume visit
              </ConsultationLink>
              {onStartNew ? (
                <button
                  type="button"
                  onClick={onStartNew}
                  disabled={disabled || starting}
                  className="text-caption-sm font-semibold text-hs-text-secondary hover:text-hs-primary disabled:opacity-60"
                >
                  {starting ? "Opening…" : "Start new visit instead"}
                </button>
              ) : null}
            </>
          ) : (
            <button
              type="button"
              onClick={onStart}
              disabled={disabled || starting}
              className={cn(DS_BTN_PRIMARY, "min-w-[10.5rem] gap-2 disabled:opacity-70")}
            >
              <Stethoscope className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              {starting ? "Opening…" : "Start visit"}
            </button>
          )}
          <Link
            href={`/patients/${encodeURIComponent(patient.id)}/timeline`}
            className="inline-flex items-center gap-0.5 text-caption-sm font-semibold text-hs-primary hover:underline"
          >
            View chart
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </div>
    </article>
  );
}

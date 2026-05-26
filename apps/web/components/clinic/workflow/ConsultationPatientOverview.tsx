"use client";

import { Calendar, Phone, User } from "lucide-react";
import type { PatientSnapshot } from "./steps/Step01Patient";
import { cn } from "../../../lib/cn";

function InfoCell({ label, value, className }: { label: string; value: string; className?: string }): JSX.Element {
  return (
    <div className={cn("rounded-lg bg-black/[0.02] px-3 py-2.5 ring-1 ring-black/[0.04]", className)}>
      <p className="text-[0.625rem] font-medium uppercase tracking-[0.1em] text-neutral-400">{label}</p>
      <p className="mt-0.5 text-[0.8125rem] font-medium text-neutral-800">{value}</p>
    </div>
  );
}

type Props = {
  patient: PatientSnapshot;
  chartNotes?: string | null;
  className?: string;
};

/** Read-only patient context shown on intake step and in context drawer. */
export function ConsultationPatientOverview({ patient, chartNotes, className }: Props): JSX.Element {
  const visitLabel = patient.visitType === "FOLLOW_UP" ? "Follow-up" : "Initial visit";
  const lastVisit = patient.lastVisitAt
    ? new Date(patient.lastVisitAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : null;

  return (
    <section className={cn("space-y-4", className)} aria-label="Patient overview">
      <div className="flex items-start gap-3 rounded-xl bg-white px-4 py-3.5 ring-1 ring-black/[0.06]">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-hs-primary/10 text-hs-primary">
          <User className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.9375rem] font-semibold text-neutral-900">{patient.name || "Patient"}</p>
          <p className="mt-0.5 text-[0.75rem] text-neutral-500">
            {[
              patient.patientCode,
              patient.age != null ? `${patient.age} yrs` : null,
              patient.gender,
              visitLabel
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {patient.phone ? (
            <a
              href={`tel:${patient.phone.replace(/\s/g, "")}`}
              className="mt-1.5 inline-flex items-center gap-1 text-[0.75rem] font-medium text-hs-primary hover:underline"
            >
              <Phone className="h-3 w-3" aria-hidden />
              {patient.phone}
            </a>
          ) : null}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <InfoCell label="Visit type" value={visitLabel} />
        {lastVisit ? (
          <InfoCell label="Last visit" value={lastVisit} />
        ) : (
          <InfoCell label="Last visit" value="First visit on file" />
        )}
        {patient.chiefComplaint?.trim() ? (
          <InfoCell label="Initial complaint on file" value={patient.chiefComplaint.trim()} className="sm:col-span-2" />
        ) : null}
        {chartNotes?.trim() ? (
          <InfoCell label="Chart notes" value={chartNotes.trim()} className="sm:col-span-2" />
        ) : null}
      </div>

      {lastVisit ? (
        <p className="flex items-center gap-1.5 text-[0.6875rem] text-neutral-400">
          <Calendar className="h-3 w-3" aria-hidden />
          Prior visits available in context panel →
        </p>
      ) : null}
    </section>
  );
}

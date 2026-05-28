"use client";

import { Calendar, Phone, User, ShieldAlert } from "lucide-react";
import type { PatientSnapshot } from "./steps/Step01Patient";
import { cn } from "../../../lib/cn";

function InfoBlock({ label, value, className }: { label: string; value: string; className?: string }): JSX.Element {
  return (
    <div className={cn("rounded-xl border border-hs-border/20 bg-hs-cream/15 p-3.5", className)}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-hs-text-tertiary">{label}</p>
      <p className="mt-1 text-body-sm font-semibold text-hs-ink leading-relaxed">{value}</p>
    </div>
  );
}

type Props = {
  patient: PatientSnapshot;
  chartNotes?: string | null;
  className?: string;
};

export function ConsultationPatientOverview({ patient, chartNotes, className }: Props): JSX.Element {
  const visitLabel = patient.visitType === "FOLLOW_UP" ? "Follow-up Visit" : "Initial Visit";
  const lastVisit = patient.lastVisitAt
    ? new Date(patient.lastVisitAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : null;
  const hasAllergies = Boolean(patient.allergies?.trim());

  return (
    <section className={cn("space-y-4", className)} aria-label="Patient overview">
      <div className="rounded-2xl border border-hs-border/30 bg-hs-paper p-5 shadow-ds-sm hover:border-hs-primary/20 transition-all duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-hs-border/20 pb-4">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-hs-primary/10 text-hs-primary border border-hs-primary/10">
              <User className="h-5.5 w-5.5" aria-hidden />
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-body-lg font-bold text-hs-ink">{patient.name || "Patient"}</h3>
              <div className="mt-1.5 flex flex-wrap gap-1.5 items-center">
                {patient.patientCode && (
                  <span className="font-mono text-[10px] font-bold uppercase bg-hs-cream border border-hs-border/30 text-hs-text-secondary px-2 py-0.5 rounded-md">
                    {patient.patientCode}
                  </span>
                )}
                {patient.age != null && (
                  <span className="text-[10px] font-bold bg-hs-cream border border-hs-border/30 text-hs-text-secondary px-2 py-0.5 rounded-md">
                    {patient.age} yrs
                  </span>
                )}
                {patient.gender && (
                  <span className="text-[10px] font-bold bg-hs-cream border border-hs-border/30 text-hs-text-secondary px-2 py-0.5 rounded-md">
                    {patient.gender}
                  </span>
                )}
                <span className="text-[10px] font-bold bg-hs-primary-very-light text-hs-primary border border-hs-primary/10 px-2 py-0.5 rounded-md">
                  {visitLabel}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {patient.phone ? (
              <a
                href={`tel:${patient.phone.replace(/\s/g, "")}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-hs-border/40 bg-hs-paper px-3 py-2 text-caption-sm font-semibold text-hs-text-secondary hover:text-hs-primary hover:border-hs-primary/30 transition-all shadow-sm"
              >
                <Phone className="h-3.5 w-3.5 text-hs-text-tertiary" aria-hidden />
                {patient.phone}
              </a>
            ) : null}
          </div>
        </div>

        {/* Vitals/Allergy Alerts banner if allergies exist */}
        {hasAllergies && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-rose-50/70 border border-rose-200/50 px-4 py-3 text-caption-sm text-rose-950 ring-1 ring-rose-500/5 animate-pulse">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden />
            <div>
              <span className="font-extrabold text-rose-900">Critical Allergy Alert:</span>{" "}
              <span className="font-medium text-rose-950">{patient.allergies}</span>
            </div>
          </div>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <InfoBlock label="Visit context" value={visitLabel} />
          {lastVisit ? (
            <InfoBlock label="Last consultation date" value={lastVisit} />
          ) : (
            <InfoBlock label="Last consultation date" value="First visit on file" />
          )}
          {patient.chiefComplaint?.trim() ? (
            <InfoBlock label="Primary intake complaint" value={patient.chiefComplaint.trim()} className="sm:col-span-2 lg:col-span-1" />
          ) : null}
          {chartNotes?.trim() ? (
            <InfoBlock label="Historical chart notes" value={chartNotes.trim()} className="sm:col-span-2 lg:col-span-3" />
          ) : null}
        </div>

        {lastVisit && (
          <p className="mt-4 flex items-center gap-1.5 text-[10px] font-medium text-hs-text-tertiary">
            <Calendar className="h-3.5 w-3.5" aria-hidden />
            Prior patient history and timelines are accessible in the right side context panel.
          </p>
        )}
      </div>
    </section>
  );
}

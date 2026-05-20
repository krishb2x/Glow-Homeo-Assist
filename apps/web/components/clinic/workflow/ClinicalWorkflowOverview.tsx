"use client";

import Link from "next/link";
import { ArrowRight, Calendar, FileSignature, Stethoscope } from "lucide-react";
import { CLINICAL_PHASES } from "../../../lib/clinical-workflow-config";

const PHASE_ICONS = {
  arrival: Stethoscope,
  treatment: FileSignature,
  continuity: Calendar
} as const;

/** Compact overview of the nine-step rhythm — orients doctors on the dashboard. */
export function ClinicalWorkflowOverview(): JSX.Element {
  const phases = ["arrival", "treatment", "continuity"] as const;

  return (
    <section
      className="rounded-2xl border border-hs-border/30 bg-hs-paper/95 p-5 shadow-card sm:p-6"
      aria-label="Clinical workflow overview"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-heading-sm font-semibold text-hs-ink">Clinical workflow</h2>
          <p className="mt-1 max-w-xl text-body-sm text-hs-text-secondary">
            Every visit follows the same three phases — arrival, treatment, and continuity — in nine steps.
          </p>
        </div>
        <Link
          href="/consultation"
          className="inline-flex items-center gap-1 text-body-sm font-semibold text-hs-primary hover:underline"
        >
          Start a visit
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>

      <ol className="mt-5 grid gap-3 sm:grid-cols-3" role="list">
        {phases.map((phase, i) => {
          const meta = CLINICAL_PHASES[phase];
          const Icon = PHASE_ICONS[phase];
          return (
            <li
              key={phase}
              className="relative rounded-xl border border-hs-border/35 bg-gradient-to-br from-hs-cream/80 to-hs-paper px-4 py-3.5"
            >
              <span className="absolute right-3 top-3 text-[10px] font-bold tabular-nums text-hs-text-tertiary">
                {i + 1}/3
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-hs-primary/20 bg-hs-primary-very-light/80 text-hs-primary">
                <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
              </span>
              <p className="mt-2 text-body-sm font-bold text-hs-ink">{meta.label}</p>
              <p className="mt-0.5 text-caption-sm leading-snug text-hs-text-secondary">{meta.subtitle}</p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

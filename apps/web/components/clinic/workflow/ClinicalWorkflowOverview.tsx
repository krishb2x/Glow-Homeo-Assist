"use client";

import Link from "next/link";
import { ArrowRight, Calendar, FileSignature, Stethoscope } from "lucide-react";
import { CLINICAL_PHASES } from "../../../lib/clinical-workflow-config";

const PHASE_ICONS = {
  arrival: Stethoscope,
  treatment: FileSignature,
  continuity: Calendar
} as const;

/** Quiet orientation line — full step rail lives on the consultation page. */
export function ClinicalWorkflowOverview(): JSX.Element {
  const phases = ["arrival", "treatment", "continuity"] as const;

  return (
    <p
      className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-hs-border/30 bg-hs-paper/90 px-4 py-2.5 text-caption-sm text-hs-text-secondary"
      aria-label="Visit flow"
    >
      <span className="font-medium text-hs-ink">Visit flow:</span>
      {phases.map((phase, i) => {
        const meta = CLINICAL_PHASES[phase];
        const Icon = PHASE_ICONS[phase];
        return (
          <span key={phase} className="inline-flex items-center gap-1">
            {i > 0 ? <span className="text-hs-text-tertiary" aria-hidden>·</span> : null}
            <Icon className="h-3.5 w-3.5 text-hs-primary/80" aria-hidden />
            <span>{meta.label}</span>
          </span>
        );
      })}
      <Link
        href="/consultation"
        className="ml-auto inline-flex items-center gap-0.5 font-semibold text-hs-primary hover:underline"
      >
        Start visit
        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </p>
  );
}

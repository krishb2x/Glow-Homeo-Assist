"use client";

import { Check, ChevronRight } from "lucide-react";
import { stepMeta, type ConsultationStep } from "../../../lib/clinical-workflow-config";
import type { StepValidation } from "../../../lib/consultation-validation";
import { cn } from "../../../lib/cn";

type Props = {
  stepId: ConsultationStep;
  stepNumber: number;
  validation?: StepValidation;
  onSelect: () => void;
};

/**
 * Compact collapsed row for inactive consultation steps.
 * Keeps the feed scannable — only the active step renders full form fields.
 */
export function ConsultationStepSummary({
  stepId,
  stepNumber,
  validation,
  onSelect
}: Props): JSX.Element {
  const meta = stepMeta(stepId);
  const Icon = meta.icon;
  const isDone = validation?.done;
  const missing = validation?.missing ?? [];
  const hasWarn = (validation?.warnings.length ?? 0) > 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border border-hs-border/30 bg-hs-paper/80 px-3.5 py-2.5 text-left transition",
        "hover:border-hs-primary/25 hover:bg-hs-cream/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hs-primary/25"
      )}
      data-workflow-step={stepId}
      aria-label={`Go to step ${stepNumber}: ${meta.label}`}
    >
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-caption-sm font-bold",
          isDone
            ? "border-emerald-300/60 bg-emerald-50 text-emerald-700"
            : "border-hs-border/40 bg-hs-cream/60 text-hs-text-secondary"
        )}
        aria-hidden
      >
        {isDone ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : stepNumber}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 shrink-0 text-hs-text-tertiary" aria-hidden />
          <span className="truncate font-medium text-hs-ink">{meta.label}</span>
        </span>
        {missing.length > 0 ? (
          <span className="mt-0.5 block truncate text-caption-sm text-hs-text-tertiary">
            Missing: {missing.slice(0, 2).join(", ")}
            {missing.length > 2 ? "…" : ""}
          </span>
        ) : hasWarn ? (
          <span className="mt-0.5 block text-caption-sm text-amber-800">Review warnings</span>
        ) : isDone ? (
          <span className="mt-0.5 block text-caption-sm text-emerald-700">Complete</span>
        ) : (
          <span className="mt-0.5 block text-caption-sm text-hs-text-tertiary">{meta.description}</span>
        )}
      </span>

      <ChevronRight className="h-4 w-4 shrink-0 text-hs-text-tertiary" aria-hidden />
    </button>
  );
}

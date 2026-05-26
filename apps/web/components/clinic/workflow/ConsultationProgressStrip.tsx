"use client";

import { memo } from "react";
import { AlertTriangle, Check, CheckCircle2, Loader2 } from "lucide-react";
import {
  CLINICAL_WORKFLOW_STEPS,
  stepIndex,
  type ConsultationStep
} from "../../../lib/clinical-workflow-config";
import type { StepValidation } from "../../../lib/consultation-validation";
import { cn } from "../../../lib/cn";

type Props = {
  activeStep: ConsultationStep;
  validations: Record<ConsultationStep, StepValidation>;
  onSelectStep: (step: ConsultationStep) => void;
  autosave?: "idle" | "saving" | "saved" | "error";
  autosaveLabel?: string;
};

/**
 * Sticky top progress strip shown above the consultation feed.
 *
 * - Each step is a numbered dot; current is filled, completed has a check,
 *   steps with warnings get an amber dot.
 * - Click jumps to the step.
 * - On the right edge it surfaces the autosave indicator and any missing
 *   fields for the current step (advisory, never blocking).
 */
export const ConsultationProgressStrip = memo(function ConsultationProgressStrip({
  activeStep,
  validations,
  onSelectStep,
  autosave,
  autosaveLabel
}: Props): JSX.Element {
  const currentIdx = stepIndex(activeStep);
  const totalSteps = CLINICAL_WORKFLOW_STEPS.length;
  const completed = CLINICAL_WORKFLOW_STEPS.filter((s) => validations[s.id]?.done).length;
  const percent = Math.round((completed / totalSteps) * 100);
  const current = validations[activeStep];
  const missingItems = current?.missing ?? [];
  const warnings = current?.warnings ?? [];

  return (
    <div className="border-b border-hs-border/30 bg-hs-paper/95 backdrop-blur supports-[backdrop-filter]:bg-hs-paper/90">
      <div className="mx-auto flex w-full flex-col gap-1.5 px-4 py-2 sm:px-6">
        <div className="flex items-center gap-2">
          <ol
            className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto"
            aria-label="Consultation progress"
          >
            {CLINICAL_WORKFLOW_STEPS.map((s, i) => {
              const v = validations[s.id];
              const isCurrent = s.id === activeStep;
              const isDone = v?.done;
              const hasWarn = (v?.warnings.length ?? 0) > 0;
              return (
                <li key={s.id} className="flex shrink-0 items-center">
                  <button
                    type="button"
                    onClick={() => onSelectStep(s.id)}
                    aria-current={isCurrent ? "step" : undefined}
                    title={`${i + 1}. ${s.label}${v?.missing.length ? ` — missing: ${v.missing.join(", ")}` : ""}`}
                    className={cn(
                      "group inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-caption-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hs-primary/30",
                      isCurrent
                        ? "bg-hs-primary text-white shadow-ds-sm"
                        : isDone
                          ? "text-emerald-700 hover:bg-emerald-50"
                          : hasWarn
                            ? "text-amber-800 hover:bg-amber-50"
                            : "text-hs-text-secondary hover:bg-hs-cream/70 hover:text-hs-ink"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold tabular-nums transition",
                        isCurrent
                          ? "border-white/40 bg-white/15 text-white"
                          : isDone
                            ? "border-emerald-300/70 bg-emerald-100/70 text-emerald-800"
                            : hasWarn
                              ? "border-amber-300 bg-amber-50 text-amber-900"
                              : "border-hs-border/50 bg-hs-paper text-hs-text-tertiary group-hover:border-hs-primary/30"
                      )}
                      aria-hidden
                    >
                      {isDone && !isCurrent ? (
                        <Check className="h-3 w-3" strokeWidth={3} />
                      ) : (
                        i + 1
                      )}
                    </span>
                    <span className="hidden lg:inline">{s.shortLabel}</span>
                  </button>
                  {i < CLINICAL_WORKFLOW_STEPS.length - 1 ? (
                    <span
                      className={cn(
                        "mx-0.5 h-px w-3 shrink-0",
                        i < currentIdx ? "bg-hs-primary/40" : "bg-hs-border/40"
                      )}
                      aria-hidden
                    />
                  ) : null}
                </li>
              );
            })}
          </ol>

          {autosaveLabel ? (
            <span
              className={cn(
                "ml-2 inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-caption-sm font-medium",
                autosave === "error"
                  ? "bg-rose-50 text-rose-800"
                  : "bg-hs-cream/70 text-hs-text-tertiary"
              )}
              role="status"
              aria-live="polite"
            >
              {autosave === "saving" ? (
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              ) : autosave === "error" ? (
                <AlertTriangle className="h-3 w-3" aria-hidden />
              ) : (
                <CheckCircle2 className="h-3 w-3 text-emerald-600" aria-hidden />
              )}
              <span className="hidden md:inline">{autosaveLabel}</span>
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-3 text-caption-sm">
          <div className="flex items-center gap-2">
            <div
              className="h-1.5 w-32 overflow-hidden rounded-full bg-hs-border/30"
              aria-hidden
            >
              <div
                className="h-full rounded-full bg-hs-primary transition-[width] duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="text-hs-text-tertiary tabular-nums">
              {completed} / {totalSteps} steps · {percent}%
            </span>
          </div>

          {missingItems.length > 0 ? (
            <p className="min-w-0 truncate text-hs-text-tertiary">
              <span className="font-medium text-hs-text-secondary">Missing:</span>{" "}
              {missingItems.join(", ")}
            </p>
          ) : warnings.length > 0 ? (
            <p className="flex min-w-0 items-center gap-1.5 truncate text-amber-800">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {warnings.join(" · ")}
            </p>
          ) : (
            <p className="text-emerald-700">Step complete.</p>
          )}
        </div>
      </div>
    </div>
  );
});

"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  CLINICAL_WORKFLOW_STEPS,
  stepIndex,
  workflowProgress,
  type ConsultationStep
} from "../../../lib/clinical-workflow-config";
import { DS_BTN_PRIMARY, DS_BTN_SECONDARY } from "../../../lib/ds-classes";
import { cn } from "../../../lib/cn";

type Props = {
  activeStep: ConsultationStep;
  onPrev: () => void;
  onNext: () => void;
  nextLabel?: string;
  disablePrev?: boolean;
  disableNext?: boolean;
  sessionEnded?: boolean;
};

export function ConsultationWorkflowFooter({
  activeStep,
  onPrev,
  onNext,
  nextLabel,
  disablePrev = false,
  disableNext = false,
  sessionEnded = false
}: Props): JSX.Element {
  const idx = stepIndex(activeStep);
  const progress = workflowProgress(activeStep);
  const isLast = idx === CLINICAL_WORKFLOW_STEPS.length - 1;
  const showNext = !sessionEnded && !isLast;

  return (
    <footer
      className="shrink-0 border-t border-hs-border/50 bg-hs-paper/95 px-4 py-2.5 sm:px-6"
      aria-label="Workflow navigation"
    >
      <div className="mx-auto flex max-w-3xl items-center gap-4">
        <button
          type="button"
          onClick={onPrev}
          disabled={disablePrev || idx <= 0}
          className={cn(DS_BTN_SECONDARY, "gap-1.5 disabled:opacity-40")}
          aria-label="Previous step"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Previous</span>
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-caption-sm font-semibold text-hs-ink">
              Step {idx + 1} of {CLINICAL_WORKFLOW_STEPS.length}
            </p>
            <span className="text-caption-sm tabular-nums text-hs-text-tertiary">{progress}%</span>
          </div>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-hs-cream">
            <div
              className="h-full rounded-full bg-hs-primary transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Consultation progress"
            />
          </div>
        </div>

        {showNext ? (
          <button
            type="button"
            onClick={onNext}
            disabled={disableNext}
            className={cn(DS_BTN_PRIMARY, "gap-1.5")}
          >
            {nextLabel ?? "Continue"}
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </div>
    </footer>
  );
}

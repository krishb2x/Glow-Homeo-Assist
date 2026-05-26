"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { primaryStepIndex, PRIMARY_WORKFLOW_STEPS, type ConsultationStep } from "../../../lib/clinical-workflow-config";
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

/** Minimal navigation — no progress bars or step counters. */
export function ConsultationWorkflowFooter({
  activeStep,
  onPrev,
  onNext,
  nextLabel,
  disablePrev = false,
  disableNext = false,
  sessionEnded = false
}: Props): JSX.Element {
  const primaryIdx = primaryStepIndex(activeStep);
  const isLast = primaryIdx === PRIMARY_WORKFLOW_STEPS.length - 1;
  const showNext = !sessionEnded && !isLast;

  return (
    <footer
      className="cw-panel cw-panel-blur shrink-0 border-t border-black/[0.06] px-4 py-2.5 sm:px-6"
      aria-label="Workflow navigation"
    >
      <div className="mx-auto flex max-w-[42rem] items-center justify-between gap-4">
        <button
          type="button"
          onClick={onPrev}
          disabled={disablePrev || primaryIdx <= 0}
          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-[0.8125rem] font-medium text-neutral-600 transition duration-200 hover:bg-black/[0.04] hover:text-neutral-900 disabled:pointer-events-none disabled:opacity-30"
          aria-label="Previous section"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Back</span>
        </button>

        {showNext ? (
          <button
            type="button"
            onClick={onNext}
            disabled={disableNext}
            className={cn(
              "inline-flex items-center gap-1 rounded-lg px-3.5 py-2 text-[0.8125rem] font-semibold transition duration-200",
              "bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-40"
            )}
          >
            {nextLabel ?? "Continue"}
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        ) : (
          <span className="text-[0.6875rem] text-neutral-400" aria-hidden />
        )}
      </div>
    </footer>
  );
}

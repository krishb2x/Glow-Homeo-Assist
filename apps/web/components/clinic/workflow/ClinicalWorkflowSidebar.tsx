"use client";

import { Check } from "lucide-react";
import {
  CLINICAL_PHASES,
  CLINICAL_WORKFLOW_STEPS,
  type ClinicalPhase,
  type ClinicalWorkflowStep,
  type ConsultationStep
} from "../../../lib/clinical-workflow-config";
import type { StepValidation } from "../../../lib/consultation-validation";
import { cn } from "../../../lib/cn";

type Props = {
  activeStep: ConsultationStep;
  stepDone: Record<ConsultationStep, boolean>;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onSelectStep: (step: ConsultationStep) => void;
  steps?: ClinicalWorkflowStep[];
  variant?: "default" | "column" | "workspace";
  className?: string;
  hideCollapse?: boolean;
  stepValidations?: Record<ConsultationStep, StepValidation>;
};

const PHASE_ORDER: ClinicalPhase[] = ["arrival", "treatment", "continuity"];

export function ClinicalWorkflowSidebar({
  activeStep,
  stepDone,
  collapsed,
  onToggleCollapse,
  onSelectStep,
  steps = CLINICAL_WORKFLOW_STEPS,
  variant = "default",
  className,
  hideCollapse = false,
  stepValidations
}: Props): JSX.Element {
  const normalizedActive = activeStep === "ai" ? "notes" : activeStep;
  const isWorkspace = variant === "workspace" || variant === "column";

  if (isWorkspace) {
    return (
      <aside className={cn("flex min-h-0 flex-col", className)} aria-label="Consultation sections">
        <nav className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-3 py-6" aria-label="Consultation sections">
          <ul className="space-y-1">
            {steps.map((step) => {
              const active = normalizedActive === step.id;
              const validation = stepValidations?.[step.id];
              const done = validation ? validation.done : stepDone[step.id];
              const hasWarnings = validation ? validation.warnings.length > 0 : false;
              const hasMissing = validation ? validation.missing.length > 0 : !done;

              return (
                <li key={step.id}>
                  <button
                    type="button"
                    onClick={() => onSelectStep(step.id)}
                    title={step.description}
                    aria-current={active ? "step" : undefined}
                    className={cn(
                      "relative w-full rounded-xl px-3.5 py-2.5 text-left text-[0.8125rem] transition-all duration-200 flex items-center justify-between gap-2",
                      active
                        ? "bg-white font-bold text-neutral-900 shadow-sm border border-hs-border/40"
                        : "font-medium text-neutral-500 hover:bg-white/50 hover:text-neutral-800 border border-transparent"
                    )}
                  >
                    {active && (
                      <span
                        className="absolute left-0 top-1/2 h-5 w-0.75 -translate-y-1/2 rounded-r-md bg-hs-primary"
                        aria-hidden
                      />
                    )}
                    <span className="truncate">{step.shortLabel}</span>
                    
                    {/* Visual state indicator */}
                    {done ? (
                      hasWarnings ? (
                        <span 
                          className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-50 text-amber-600 border border-amber-200/50 text-[10px] shrink-0 font-bold" 
                          title={`Warning: ${validation?.warnings.join(", ")}`}
                        >
                          !
                        </span>
                      ) : (
                        <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200/50 text-[10px] shrink-0 font-bold">
                          ✓
                        </span>
                      )
                    ) : hasMissing && step.id !== "ai" && step.id !== "finalize" ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500/80 shrink-0" title="Missing required info" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-hs-border-dark/30 shrink-0" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    );
  }

  let stepCounter = 0;

  return (
    <aside
      className={cn(
        "flex flex-col bg-hs-paper/95 transition-[width] duration-200",
        collapsed ? "w-[3.25rem]" : "w-56 shrink-0 border-r border-hs-border/40 lg:w-60",
        className
      )}
      aria-label="Consultation workflow"
    >
      {!collapsed && (
        <div className="border-b border-hs-border/30 px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-hs-text-tertiary">Workflow</p>
          <p className="mt-0.5 text-caption-sm font-medium text-hs-text-secondary">8-step clinical workflow</p>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto py-2" aria-label="Consultation steps">
        {PHASE_ORDER.map((phase) => {
          const phaseSteps = steps.filter((s) => s.phase === phase);
          if (phaseSteps.length === 0) return null;

          return (
            <div key={phase} className="mb-1">
              {!collapsed && (
                <p className="px-4 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-hs-text-tertiary">
                  {CLINICAL_PHASES[phase].label}
                </p>
              )}

              <ul className="space-y-0.5">
                {phaseSteps.map((step) => {
                  stepCounter += 1;
                  const idx = stepCounter;
                  const validation = stepValidations?.[step.id];
                  const done = validation ? validation.done : stepDone[step.id];
                  const hasWarnings = validation ? validation.warnings.length > 0 : false;
                  const hasMissing = validation ? validation.missing.length > 0 : !done;
                  const active = normalizedActive === step.id;

                  return (
                    <li key={step.id}>
                      <button
                        type="button"
                        onClick={() => onSelectStep(step.id)}
                        aria-current={active ? "step" : undefined}
                        className={cn(
                          "group flex w-full items-center gap-2.5 px-2 py-2 text-left transition",
                          active
                            ? "bg-hs-primary-very-light/90 text-hs-primary"
                            : "text-hs-text-secondary hover:bg-hs-cream/80 hover:text-hs-ink"
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-caption-sm font-bold relative",
                            active
                              ? "border-hs-primary bg-hs-primary text-white"
                              : done
                                ? hasWarnings
                                  ? "border-amber-200 bg-amber-50 text-amber-800"
                                  : "border-emerald-200/80 bg-emerald-50 text-emerald-800"
                                : "border-hs-border/40 bg-hs-paper text-hs-text-tertiary"
                          )}
                        >
                          {done && !active ? (
                            hasWarnings ? (
                              <span title={`Warning: ${validation?.warnings.join(", ")}`}>!</span>
                            ) : (
                              <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                            )
                          ) : (
                            <span className="tabular-nums">{String(idx).padStart(2, "0")}</span>
                          )}

                          {/* Subtle missing accent dot on top-right of step circle */}
                          {!done && hasMissing && step.id !== "ai" && step.id !== "finalize" && (
                            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-white" title="Missing required info" />
                          )}
                        </span>

                        {!collapsed && (
                          <span className={cn(
                            "truncate text-caption-sm font-medium",
                            active && "font-semibold"
                          )}>
                            {step.label}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {!hideCollapse && (
        <button
          type="button"
          onClick={onToggleCollapse}
          className="border-t border-hs-border/30 py-2.5 text-caption-sm text-hs-text-tertiary hover:bg-hs-cream/60"
        >
          {collapsed ? "Expand" : "Collapse"}
        </button>
      )}
    </aside>
  );
}

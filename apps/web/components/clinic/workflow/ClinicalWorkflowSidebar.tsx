"use client";

import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import {
  CLINICAL_PHASES,
  CLINICAL_WORKFLOW_STEPS,
  type ClinicalPhase,
  type ConsultationStep
} from "../../../lib/clinical-workflow-config";
import { cn } from "../../../lib/cn";

type Props = {
  activeStep: ConsultationStep;
  stepDone: Record<ConsultationStep, boolean>;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onSelectStep: (step: ConsultationStep) => void;
  /** `column` = embedded in the 320px left workspace column. */
  variant?: "default" | "column";
};

const PHASE_ORDER: ClinicalPhase[] = ["arrival", "treatment", "continuity"];

export function ClinicalWorkflowSidebar({
  activeStep,
  stepDone,
  collapsed,
  onToggleCollapse,
  onSelectStep,
  variant = "default"
}: Props): JSX.Element {
  let stepCounter = 0;

  return (
    <aside
      className={cn(
        "flex flex-col bg-hs-paper/95 transition-[width] duration-200",
        variant === "column"
          ? "min-h-0 flex-1 shadow-none"
          : cn(
              "shrink-0 border-r border-hs-border/40 shadow-[inset_-1px_0_0_rgba(0,0,0,0.02)]",
              collapsed ? "w-[3.25rem]" : "w-56 lg:w-60"
            )
      )}
      aria-label="Consultation workflow"
    >
      {!collapsed ? (
        <div className={cn("border-b border-hs-border/30 px-4 py-3", variant === "column" && "px-3 py-2")}>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-hs-text-tertiary">
            {variant === "column" ? "Steps" : "Workflow"}
          </p>
          {variant === "default" ? (
            <p className="mt-0.5 text-caption-sm font-medium text-hs-text-secondary">9-step clinical rhythm</p>
          ) : null}
        </div>
      ) : null}

      <nav className="flex-1 overflow-y-auto py-2" aria-label="Consultation steps">
        {PHASE_ORDER.map((phase) => {
          const steps = CLINICAL_WORKFLOW_STEPS.filter((s) => s.phase === phase);
          return (
            <div key={phase} className="mb-1">
              {!collapsed ? (
                <p className="px-4 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-hs-text-tertiary">
                  {CLINICAL_PHASES[phase].label}
                </p>
              ) : collapsed && steps.some((s) => s.id === activeStep) ? (
                <div className="mx-auto my-2 h-px w-6 bg-hs-border/50" aria-hidden />
              ) : null}
              <ul className="space-y-0.5">
                {steps.map((step) => {
                  stepCounter += 1;
                  const idx = stepCounter;
                  const Icon = step.icon;
                  const done = stepDone[step.id];
                  const active = activeStep === step.id;
                  return (
                    <li key={step.id}>
                      <button
                        type="button"
                        onClick={() => onSelectStep(step.id)}
                        title={collapsed ? step.label : step.description}
                        aria-current={active ? "step" : undefined}
                        className={cn(
                          "group flex w-full items-center gap-2.5 px-2 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-hs-primary/30",
                          active
                            ? "bg-hs-primary-very-light/90 text-hs-primary"
                            : "text-hs-text-secondary hover:bg-hs-cream/80 hover:text-hs-ink"
                        )}
                      >
                        <span
                          className={cn(
                            "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-caption-sm font-bold transition",
                            active
                              ? "border-hs-primary bg-hs-primary text-white shadow-ds-sm"
                              : done
                                ? "border-emerald-200/80 bg-emerald-50 text-emerald-800"
                                : "border-hs-border/40 bg-hs-paper text-hs-text-tertiary group-hover:border-hs-primary/25"
                          )}
                        >
                          {done && !active ? (
                            <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                          ) : collapsed ? (
                            <Icon className="h-4 w-4" aria-hidden />
                          ) : (
                            <span className="tabular-nums">{String(idx).padStart(2, "0")}</span>
                          )}
                        </span>
                        {!collapsed ? (
                          <span className="min-w-0 flex-1">
                            <span
                              className={cn(
                                "block truncate text-caption-sm leading-tight",
                                active ? "font-semibold" : "font-medium"
                              )}
                            >
                              {step.label}
                            </span>
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={onToggleCollapse}
        className="flex items-center justify-center gap-1 border-t border-hs-border/30 py-2.5 text-caption-sm text-hs-text-tertiary transition hover:bg-hs-cream/60 hover:text-hs-ink"
        aria-label={collapsed ? "Expand workflow panel" : "Collapse workflow panel"}
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" aria-hidden />
        ) : (
          <>
            <ChevronLeft className="h-4 w-4" aria-hidden />
            <span>Collapse</span>
          </>
        )}
      </button>
    </aside>
  );
}

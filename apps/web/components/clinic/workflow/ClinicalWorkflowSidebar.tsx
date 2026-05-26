"use client";



import { Check } from "lucide-react";

import {

  CLINICAL_PHASES,

  CLINICAL_WORKFLOW_STEPS,

  type ClinicalPhase,

  type ClinicalWorkflowStep,

  type ConsultationStep

} from "../../../lib/clinical-workflow-config";

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

  hideCollapse = false

}: Props): JSX.Element {

  const normalizedActive = activeStep === "ai" ? "notes" : activeStep;

  const isWorkspace = variant === "workspace" || variant === "column";



  if (isWorkspace) {
    return (
      <aside className={cn("flex min-h-0 flex-col", className)} aria-label="Consultation sections">
        <nav className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-2 py-5" aria-label="Consultation sections">
          <ul className="space-y-0.5">
            {steps.map((step) => {
              const active = normalizedActive === step.id;
              return (
                <li key={step.id}>
                  <button
                    type="button"
                    onClick={() => onSelectStep(step.id)}
                    title={step.description}
                    aria-current={active ? "step" : undefined}
                    className={cn(
                      "relative w-full rounded-lg px-3 py-2 text-left text-[0.8125rem] transition duration-200",
                      active
                        ? "bg-white font-medium text-neutral-900 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                        : "font-normal text-neutral-500 hover:bg-white/50 hover:text-neutral-800"
                    )}
                  >
                    {active ? (
                      <span
                        className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-hs-primary"
                        aria-hidden
                      />
                    ) : null}
                    {step.shortLabel}
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

      {!collapsed ? (

        <div className="border-b border-hs-border/30 px-4 py-3">

          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-hs-text-tertiary">Workflow</p>

          <p className="mt-0.5 text-caption-sm font-medium text-hs-text-secondary">8-step clinical workflow</p>

        </div>

      ) : null}



      <nav className="flex-1 overflow-y-auto py-2" aria-label="Consultation steps">

        {PHASE_ORDER.map((phase) => {

          const phaseSteps = steps.filter((s) => s.phase === phase);

          if (phaseSteps.length === 0) return null;

          return (

            <div key={phase} className="mb-1">

              {!collapsed ? (

                <p className="px-4 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-hs-text-tertiary">

                  {CLINICAL_PHASES[phase].label}

                </p>

              ) : null}

              <ul className="space-y-0.5">

                {phaseSteps.map((step) => {

                  stepCounter += 1;

                  const idx = stepCounter;

                  const done = stepDone[step.id];

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

                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-caption-sm font-bold",

                            active

                              ? "border-hs-primary bg-hs-primary text-white"

                              : done

                                ? "border-emerald-200/80 bg-emerald-50 text-emerald-800"

                                : "border-hs-border/40 bg-hs-paper text-hs-text-tertiary"

                          )}

                        >

                          {done && !active ? (

                            <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden />

                          ) : (

                            <span className="tabular-nums">{String(idx).padStart(2, "0")}</span>

                          )}

                        </span>

                        {!collapsed ? (

                          <span className="truncate text-caption-sm font-medium">{step.label}</span>

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



      {!hideCollapse ? (

        <button

          type="button"

          onClick={onToggleCollapse}

          className="border-t border-hs-border/30 py-2.5 text-caption-sm text-hs-text-tertiary hover:bg-hs-cream/60"

        >

          {collapsed ? "Expand" : "Collapse"}

        </button>

      ) : null}

    </aside>

  );

}



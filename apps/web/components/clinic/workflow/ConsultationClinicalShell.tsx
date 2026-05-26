"use client";

import type { ReactNode } from "react";
import { Loader2, PanelRight, X } from "lucide-react";
import type { ConsultationStep } from "../../../lib/clinical-workflow-config";
import { PRIMARY_WORKFLOW_STEPS } from "../../../lib/clinical-workflow-config";
import { ClinicalWorkflowSidebar } from "./ClinicalWorkflowSidebar";
import { cn } from "../../../lib/cn";

type AutosaveState = "idle" | "saving" | "saved" | "error";

type Props = {
  activeStep: ConsultationStep;
  stepDone: Record<ConsultationStep, boolean>;
  onSelectStep: (step: ConsultationStep) => void;
  patientLine: ReactNode;
  safetyBadge?: ReactNode;
  autosave?: AutosaveState;
  autosaveLabel?: string;
  contextOpen: boolean;
  scheduleDrawerOpen: boolean;
  onToggleContext: () => void;
  onCloseDrawer: () => void;
  stepPanel: ReactNode;
  footer: ReactNode;
  contextDrawer: ReactNode;
  scheduleDrawer: ReactNode;
  /** Pinned video strip for online consultations (visible while charting). */
  videoRail?: ReactNode;
};

export function ConsultationClinicalShell({
  activeStep,
  stepDone,
  onSelectStep,
  patientLine,
  safetyBadge,
  autosave,
  autosaveLabel,
  contextOpen,
  scheduleDrawerOpen,
  onToggleContext,
  onCloseDrawer,
  stepPanel,
  footer,
  contextDrawer,
  scheduleDrawer,
  videoRail
}: Props): JSX.Element {
  const drawerOpen = contextOpen || scheduleDrawerOpen;
  const normalizedStep = activeStep === "ai" ? "notes" : activeStep;

  const drawerTitle = scheduleDrawerOpen ? "Schedule follow-up" : "Context";

  const openContext = (): void => {
    if (contextOpen) onCloseDrawer();
    else onToggleContext();
  };

  return (
    <div className="cw-shell flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <header className="cw-panel cw-panel-blur flex shrink-0 items-center gap-4 border-b px-4 py-2.5 sm:px-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">{patientLine}</div>
          {safetyBadge ? <div className="mt-1.5">{safetyBadge}</div> : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {autosaveLabel ? (
            <span
              className={cn(
                "hidden text-[11px] font-medium sm:inline",
                autosave === "error" ? "text-rose-600" : "text-neutral-400"
              )}
              title={autosaveLabel}
            >
              {autosaveLabel}
            </span>
          ) : null}
          {autosave === "saving" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-neutral-400" aria-label="Saving" />
          ) : autosave === "error" ? (
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" title="Save error" aria-label="Save error" />
          ) : null}
          <button
            type="button"
            onClick={openContext}
            aria-pressed={contextOpen}
            title="Patient context"
            className={cn("cw-ghost-btn", contextOpen && "cw-ghost-btn-active")}
          >
            <PanelRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </header>

      {videoRail ? (
        <div className="shrink-0 border-b border-black/[0.06] bg-slate-950/95 px-3 py-2 sm:px-4">
          {videoRail}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="border-b border-black/[0.06] bg-[#f3f3f1]/90 px-4 py-2 md:hidden">
          <label className="sr-only" htmlFor="cw-mobile-step">
            Consultation step
          </label>
          <select
            id="cw-mobile-step"
            value={normalizedStep}
            onChange={(e) => onSelectStep(e.target.value as ConsultationStep)}
            className="w-full rounded-lg border border-black/[0.08] bg-white px-3 py-2 text-[0.8125rem] font-medium text-neutral-800"
          >
            {PRIMARY_WORKFLOW_STEPS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.shortLabel}
              </option>
            ))}
          </select>
        </div>

        <div className="flex min-h-0 flex-1 overflow-hidden">
        <ClinicalWorkflowSidebar
          variant="workspace"
          steps={PRIMARY_WORKFLOW_STEPS}
          activeStep={normalizedStep}
          stepDone={stepDone}
          collapsed={false}
          onToggleCollapse={() => {}}
          onSelectStep={onSelectStep}
          hideCollapse
          className="hidden w-[11.5rem] shrink-0 border-r border-black/[0.06] bg-[#f3f3f1]/80 md:flex lg:w-40"
        />

        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#fafaf8]">
          <div
            className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain scroll-smooth"
            data-consultation-scroll
          >
            <div className="mx-auto w-full max-w-[42rem] px-5 py-8 pb-28 sm:px-8 sm:py-10 lg:py-12">
              {stepPanel}
            </div>
          </div>
          <div className="shrink-0">{footer}</div>
        </main>

        <aside
          className={cn(
            "cw-panel flex shrink-0 flex-col overflow-hidden border-l transition-[width] duration-300 ease-out",
            drawerOpen ? "w-[min(22rem,88vw)]" : "w-0 border-l-0"
          )}
          aria-hidden={!drawerOpen}
        >
          {drawerOpen ? (
            <>
              <div className="flex shrink-0 items-center justify-between border-b border-black/[0.06] px-4 py-3">
                <h2 className="text-[0.8125rem] font-semibold tracking-tight text-neutral-800">{drawerTitle}</h2>
                <button
                  type="button"
                  onClick={onCloseDrawer}
                  className="cw-ghost-btn h-7 w-7"
                  aria-label="Close panel"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
                {scheduleDrawerOpen ? scheduleDrawer : contextDrawer}
              </div>
            </>
          ) : null}
        </aside>
        </div>
      </div>
    </div>
  );
}

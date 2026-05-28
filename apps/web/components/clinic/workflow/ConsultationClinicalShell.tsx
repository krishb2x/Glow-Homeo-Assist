"use client";

import type { ReactNode } from "react";
import { Loader2, PanelRight, X } from "lucide-react";
import type { ConsultationStep } from "../../../lib/clinical-workflow-config";
import { PRIMARY_WORKFLOW_STEPS } from "../../../lib/clinical-workflow-config";
import { ClinicalWorkflowSidebar } from "./ClinicalWorkflowSidebar";
import type { StepValidation } from "../../../lib/consultation-validation";
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
  stepValidations?: Record<ConsultationStep, StepValidation>;
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
  videoRail,
  stepValidations
}: Props): JSX.Element {
  const drawerOpen = contextOpen || scheduleDrawerOpen;
  const normalizedStep = activeStep === "ai" ? "notes" : activeStep;

  const drawerTitle = scheduleDrawerOpen ? "Schedule follow-up" : "Context";

  const openContext = (): void => {
    if (contextOpen) onCloseDrawer();
    else onToggleContext();
  };

  return (
    <div className="cw-shell flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-hs-cream/40">
      <header className="cw-panel cw-panel-blur flex shrink-0 items-center justify-between gap-4 border-b border-hs-border/40 px-4 py-3 sm:px-6 shadow-sm z-10">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-hs-ink">{patientLine}</div>
          {safetyBadge ? <div className="mt-1.5">{safetyBadge}</div> : null}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {/* Enhanced Google-Docs-style autosave indicator */}
          <div className="flex items-center gap-1.5 rounded-full border border-hs-border/40 bg-hs-cream/60 px-3 py-1 text-[11px] font-semibold">
            {autosave === "saving" ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin text-hs-primary" aria-label="Saving" />
                <span className="text-hs-text-secondary sm:inline hidden">Syncing changes…</span>
              </>
            ) : autosave === "error" ? (
              <>
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" title="Save error" aria-label="Save error" />
                <span className="text-rose-600 sm:inline hidden font-bold">Sync failed</span>
              </>
            ) : autosave === "saved" || autosave === "idle" ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" aria-hidden />
                <span className="text-emerald-800 sm:inline hidden">Saved to cloud</span>
              </>
            ) : null}
          </div>

          <button
            type="button"
            onClick={openContext}
            aria-pressed={contextOpen}
            title="Patient context"
            className={cn(
              "cw-ghost-btn h-9 w-9 rounded-xl border border-hs-border/30 bg-hs-paper/85 transition-all shadow-sm",
              contextOpen && "cw-ghost-btn-active border-hs-primary/30 text-hs-primary"
            )}
          >
            <PanelRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </header>

      {videoRail ? (
        <div className="shrink-0 border-b border-black/[0.04] bg-[#0c1a16] px-3 py-2 sm:px-5">
          {videoRail}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="border-b border-hs-border/40 bg-[#f3f3f1]/90 px-4 py-2.5 md:hidden">
          <label className="sr-only" htmlFor="cw-mobile-step">
            Consultation step
          </label>
          <select
            id="cw-mobile-step"
            value={normalizedStep}
            onChange={(e) => onSelectStep(e.target.value as ConsultationStep)}
            className="w-full rounded-xl border border-hs-border/40 bg-white px-3 py-2 text-[0.8125rem] font-bold text-neutral-800 focus:outline-none focus:ring-2 focus:ring-hs-primary/10"
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
          stepValidations={stepValidations}
          className="hidden w-[12rem] shrink-0 border-r border-hs-border/30 bg-hs-cream/10 md:flex lg:w-48"
        />

        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-hs-cream/10">
          <div
            className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain scroll-smooth"
            data-consultation-scroll
          >
            <div className="mx-auto w-full max-w-7xl px-6 py-8 pb-32 sm:px-10 sm:py-10 lg:py-12">
              {stepPanel}
            </div>
          </div>
          <div className="shrink-0">{footer}</div>
        </main>

        <aside
          className={cn(
            "cw-panel flex shrink-0 flex-col overflow-hidden border-l border-hs-border/30 transition-[width] duration-300 ease-out",
            drawerOpen ? "w-[min(24rem,90vw)] bg-hs-paper/95 shadow-ds-md" : "w-0 border-l-0"
          )}
          aria-hidden={!drawerOpen}
        >
          {drawerOpen ? (
            <>
              <div className="flex shrink-0 items-center justify-between border-b border-hs-border/20 px-4 py-3 bg-hs-cream/10">
                <h2 className="text-[0.75rem] font-bold uppercase tracking-wider text-hs-text-secondary">{drawerTitle}</h2>
                <button
                  type="button"
                  onClick={onCloseDrawer}
                  className="cw-ghost-btn h-7 w-7 rounded-lg hover:bg-hs-cream/80"
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

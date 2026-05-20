"use client";

import type { ReactNode } from "react";
import type { ConsultationStep } from "../../../lib/clinical-workflow-config";
import { ConsultationLeftColumn } from "./ConsultationLeftColumn";
import {
  ConsultationWorkspaceRail,
  type WorkspaceDrawer
} from "./ConsultationWorkspaceRail";
import { cn } from "../../../lib/cn";

type Props = {
  mode: "IN_CLINIC" | "ONLINE";
  patientId: string;
  consultationId: string;
  activeStep: ConsultationStep;
  stepDone: Record<ConsultationStep, boolean>;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onSelectStep: (step: ConsultationStep) => void;
  activeDrawer: WorkspaceDrawer;
  onActiveDrawerChange: (drawer: WorkspaceDrawer) => void;
  aiEnabled: boolean;
  center: ReactNode;
  footer: ReactNode;
  aiDrawer: ReactNode;
  scheduleDrawer: ReactNode;
  className?: string;
};

/**
 * 3-column consult workspace shell (architecture §4):
 * Left 320px (context + step rail) | Center feed | Right rail + drawer 360px
 */
export function ConsultationWorkspaceShell({
  mode,
  patientId,
  consultationId,
  activeStep,
  stepDone,
  sidebarCollapsed,
  onToggleSidebar,
  onSelectStep,
  activeDrawer,
  onActiveDrawerChange,
  aiEnabled,
  center,
  footer,
  aiDrawer,
  scheduleDrawer,
  className
}: Props): JSX.Element {
  const openAi = (): void => onActiveDrawerChange(activeDrawer === "ai" ? "none" : "ai");
  const openSchedule = (): void =>
    onActiveDrawerChange(activeDrawer === "schedule" ? "none" : "schedule");
  const closeDrawer = (): void => onActiveDrawerChange("none");

  return (
    <div className={cn("flex min-h-0 flex-1 overflow-hidden", className)}>
      <ConsultationLeftColumn
        mode={mode}
        patientId={patientId}
        consultationId={consultationId}
        activeStep={activeStep}
        stepDone={stepDone}
        collapsed={sidebarCollapsed}
        onToggleCollapse={onToggleSidebar}
        onSelectStep={onSelectStep}
      />

      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-hs-surface">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[760px] px-4 py-6 sm:px-6">{center}</div>
        </div>
        {footer}
      </main>

      <div className="flex shrink-0">
        <ConsultationWorkspaceRail
          activeDrawer={activeDrawer}
          aiEnabled={aiEnabled}
          onOpenAi={openAi}
          onOpenSchedule={openSchedule}
          onClose={closeDrawer}
        />
        {aiDrawer}
        {scheduleDrawer}
      </div>
    </div>
  );
}

export type { WorkspaceDrawer };

"use client";

import { ConsultationMemoStrip } from "../memos/ConsultationMemoStrip";
import { ClinicalWorkflowSidebar } from "./ClinicalWorkflowSidebar";
import { ConsultationPastVisitsPanel } from "./ConsultationPastVisitsPanel";
import { DailyConsultationVideo as ConsultationVideoTile } from "../video/DailyConsultationVideo";
import type { ConsultationStep } from "../../../lib/clinical-workflow-config";
import type { StepValidation } from "../../../lib/consultation-validation";
import { cn } from "../../../lib/cn";

type Props = {
  mode: "IN_CLINIC" | "ONLINE";
  patientId: string;
  consultationId: string;
  activeStep: ConsultationStep;
  stepDone: Record<ConsultationStep, boolean>;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onSelectStep: (step: ConsultationStep) => void;
  className?: string;
  stepValidations?: Record<ConsultationStep, StepValidation>;
};

export function ConsultationLeftColumn({
  mode,
  patientId,
  consultationId,
  activeStep,
  stepDone,
  collapsed,
  onToggleCollapse,
  onSelectStep,
  className,
  stepValidations
}: Props): JSX.Element {
  return (
    <aside
      className={cn(
        "hidden min-h-0 shrink-0 flex-col overflow-hidden border-r border-hs-border/40 bg-hs-paper/95 transition-[width] duration-200 md:flex",
        collapsed ? "w-[4.5rem]" : "w-[280px]",
        className
      )}
      aria-label="Visit context and workflow"
    >
      {!collapsed ? (
        <>
          <ConsultationMemoStrip patientId={patientId} consultationId={consultationId} />
          <div className="min-h-0 max-h-[38%] shrink-0 overflow-y-auto border-b border-hs-border/25">
            {mode === "ONLINE" ? (
              <ConsultationVideoTile consultationId={consultationId} />
            ) : (
              <ConsultationPastVisitsPanel
                patientId={patientId}
                currentConsultationId={consultationId}
              />
            )}
          </div>
        </>
      ) : null}

      <ClinicalWorkflowSidebar
        variant="column"
        activeStep={activeStep}
        stepDone={stepDone}
        collapsed={collapsed}
        onToggleCollapse={onToggleCollapse}
        onSelectStep={onSelectStep}
        stepValidations={stepValidations}
      />
    </aside>
  );
}

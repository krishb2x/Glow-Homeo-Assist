"use client";

import { ClinicalWorkflowSidebar } from "./ClinicalWorkflowSidebar";
import { ConsultationPastVisitsPanel } from "./ConsultationPastVisitsPanel";
import { ConsultationVideoTile } from "../video/ConsultationVideoTile";
import type { ConsultationStep } from "../../../lib/clinical-workflow-config";
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
  className
}: Props): JSX.Element {
  return (
    <aside
      className={cn(
        "hidden w-[320px] shrink-0 flex-col overflow-hidden border-r border-hs-border/40 bg-hs-paper/95 lg:flex",
        className
      )}
      aria-label="Visit context and workflow"
    >
      {mode === "ONLINE" ? (
        <ConsultationVideoTile />
      ) : (
        <ConsultationPastVisitsPanel patientId={patientId} currentConsultationId={consultationId} />
      )}

      <ClinicalWorkflowSidebar
        variant="column"
        activeStep={activeStep}
        stepDone={stepDone}
        collapsed={collapsed}
        onToggleCollapse={onToggleCollapse}
        onSelectStep={onSelectStep}
      />
    </aside>
  );
}

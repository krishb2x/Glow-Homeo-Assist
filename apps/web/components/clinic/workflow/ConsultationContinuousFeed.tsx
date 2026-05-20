"use client";

/**
 * Continuous-scroll feed for the 9-step consult workflow.
 * Optional `stepExtras` render clinic-specific panels (templates, AI draft, etc.)
 * below each step shell without bloating the step components themselves.
 */
import { forwardRef, type ReactNode } from "react";
import type { ConsultationStep } from "../../../lib/clinical-workflow-config";
import { stepIndex } from "../../../lib/clinical-workflow-config";
import {
  Step01Patient,
  Step02History,
  Step03Examination,
  Step04Notes,
  Step05AI,
  Step06Prescription,
  Step07Advice,
  Step08FollowUp,
  Step09Finalize,
  type AdviceCard,
  type AIStepStatus,
  type FinalizeSummaryItem,
  type FollowUpStepValue,
  type HistoryStepValue,
  type NotesStepValue,
  type PatientSnapshot,
  type PatientStepValue,
  type PrescriptionEntry,
  type ExaminationStepValue
} from "./steps";
import { cn } from "../../../lib/cn";

export type ConsultationContinuousFeedProps = {
  activeStep: ConsultationStep;
  readOnly?: boolean;
  stepExtras?: Partial<Record<ConsultationStep, ReactNode>>;

  patient: PatientSnapshot;
  patientStep: PatientStepValue;
  onPatientStepChange: (v: PatientStepValue) => void;

  historyStep: HistoryStepValue;
  onHistoryStepChange: (v: HistoryStepValue) => void;

  examinationStep: ExaminationStepValue;
  onExaminationStepChange: (v: ExaminationStepValue) => void;

  notesStep: NotesStepValue;
  onNotesStepChange: (v: NotesStepValue) => void;

  aiEnabled: boolean;
  aiStatus: AIStepStatus;
  aiTranscript: string;
  aiDurationSec: number;
  aiIsMock: boolean;
  aiDrawerSlot?: ReactNode;
  onAiStart: () => void;
  onAiPause: () => void;
  onAiStop: () => void;
  onAiResume: () => void;
  onAiTranscriptChange: (v: string) => void;

  prescriptionEntries: PrescriptionEntry[];
  onPrescriptionChange: (v: PrescriptionEntry[]) => void;

  adviceCards: AdviceCard[];
  onAdviceChange: (v: AdviceCard[]) => void;

  followUpStep: FollowUpStepValue;
  onFollowUpChange: (v: FollowUpStepValue) => void;

  finalizeItems: FinalizeSummaryItem[];
  alreadyFinalized: boolean;
  finalizeBlockedReason?: string;
  outcomeSlot?: ReactNode;
};

function stepHighlight(active: ConsultationStep, step: ConsultationStep): "active" | "idle" {
  return active === step ? "active" : "idle";
}

function StepBlock({
  stepId,
  activeStep,
  children,
  extra
}: {
  stepId: ConsultationStep;
  activeStep: ConsultationStep;
  children: ReactNode;
  extra?: ReactNode;
}): JSX.Element {
  const on = activeStep === stepId;
  return (
    <div
      className={cn(
        "scroll-mt-4 rounded-2xl transition",
        on && "ring-2 ring-hs-primary/20 ring-offset-2 ring-offset-hs-surface"
      )}
      data-workflow-step={stepId}
    >
      {children}
      {extra ? <div className="mt-3 space-y-3 px-1">{extra}</div> : null}
    </div>
  );
}

export const ConsultationContinuousFeed = forwardRef<HTMLDivElement, ConsultationContinuousFeedProps>(
  function ConsultationContinuousFeed(props, ref) {
    const {
      activeStep,
      readOnly = false,
      stepExtras,
      patient,
      patientStep,
      onPatientStepChange,
      historyStep,
      onHistoryStepChange,
      examinationStep,
      onExaminationStepChange,
      notesStep,
      onNotesStepChange,
      aiEnabled,
      aiStatus,
      aiTranscript,
      aiDurationSec,
      aiIsMock,
      aiDrawerSlot,
      onAiStart,
      onAiPause,
      onAiStop,
      onAiResume,
      onAiTranscriptChange,
      prescriptionEntries,
      onPrescriptionChange,
      adviceCards,
      onAdviceChange,
      followUpStep,
      onFollowUpChange,
      finalizeItems,
      alreadyFinalized,
      finalizeBlockedReason,
      outcomeSlot
    } = props;

    const activeIdx = stepIndex(activeStep);

    return (
      <div ref={ref} className="space-y-6 pb-8">
        <StepBlock stepId="patient" activeStep={activeStep} extra={stepExtras?.patient}>
          <Step01Patient
            stepNumber={1}
            patient={patient}
            value={patientStep}
            onChange={onPatientStepChange}
            readOnly={readOnly}
            status={stepHighlight(activeStep, "patient")}
            after={undefined}
          />
        </StepBlock>

        <StepBlock stepId="history" activeStep={activeStep} extra={stepExtras?.history}>
          <Step02History
            stepNumber={2}
            value={historyStep}
            onChange={onHistoryStepChange}
            readOnly={readOnly}
          />
        </StepBlock>

        <StepBlock stepId="examination" activeStep={activeStep} extra={stepExtras?.examination}>
          <Step03Examination
            stepNumber={3}
            value={examinationStep}
            onChange={onExaminationStepChange}
            readOnly={readOnly}
          />
        </StepBlock>

        <StepBlock stepId="notes" activeStep={activeStep} extra={stepExtras?.notes}>
          <Step04Notes stepNumber={4} value={notesStep} onChange={onNotesStepChange} readOnly={readOnly} />
        </StepBlock>

        <StepBlock stepId="ai" activeStep={activeStep} extra={stepExtras?.ai}>
          <Step05AI
            stepNumber={5}
            enabled={aiEnabled}
            status={aiStatus}
            transcript={aiTranscript}
            durationSec={aiDurationSec}
            isMock={aiIsMock}
            drawerSlot={aiDrawerSlot}
            onStart={onAiStart}
            onPause={onAiPause}
            onStop={onAiStop}
            onResume={onAiResume}
            onTranscriptChange={onAiTranscriptChange}
          />
        </StepBlock>

        <StepBlock stepId="prescription" activeStep={activeStep} extra={stepExtras?.prescription}>
          <Step06Prescription
            stepNumber={6}
            entries={prescriptionEntries}
            onChange={onPrescriptionChange}
            readOnly={readOnly}
          />
        </StepBlock>

        <StepBlock stepId="advice" activeStep={activeStep} extra={stepExtras?.advice}>
          <Step07Advice stepNumber={7} cards={adviceCards} onChange={onAdviceChange} readOnly={readOnly} />
        </StepBlock>

        <StepBlock stepId="followup" activeStep={activeStep} extra={stepExtras?.followup}>
          <Step08FollowUp stepNumber={8} value={followUpStep} onChange={onFollowUpChange} readOnly={readOnly} />
        </StepBlock>

        <StepBlock stepId="finalize" activeStep={activeStep} extra={stepExtras?.finalize}>
          <Step09Finalize
            stepNumber={9}
            items={finalizeItems}
            alreadyFinalized={alreadyFinalized}
            finalizing={false}
            blockedReason={finalizeBlockedReason}
            outcomeSlot={outcomeSlot}
          />
        </StepBlock>

        <span className="sr-only" data-active-step-index={activeIdx} />
      </div>
    );
  }
);

/** Scroll the feed container to the numbered step (1–9). */
export function scrollFeedToStep(feedEl: HTMLElement | null, stepNumber: number): void {
  feedEl?.querySelector(`[data-step-number="${stepNumber}"]`)?.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

/** Scroll by workflow step id (uses stepIndex + 1). */
export function scrollFeedToWorkflowStep(
  feedEl: HTMLElement | null,
  step: ConsultationStep
): void {
  scrollFeedToStep(feedEl, stepIndex(step) + 1);
}

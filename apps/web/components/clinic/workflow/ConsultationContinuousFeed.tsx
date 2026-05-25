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
import type { StepValidation } from "../../../lib/consultation-validation";
import { cn } from "../../../lib/cn";
import { StepInlineValidation } from "./StepInlineValidation";

export type ConsultationContinuousFeedProps = {
  activeStep: ConsultationStep;
  readOnly?: boolean;
  stepValidations?: Partial<Record<ConsultationStep, StepValidation>>;
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
  aiError?: string | null;
  onAiDismissError?: () => void;
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
  extra,
  validation
}: {
  stepId: ConsultationStep;
  activeStep: ConsultationStep;
  children: ReactNode;
  extra?: ReactNode;
  validation?: StepValidation;
}): JSX.Element {
  const on = activeStep === stepId;
  return (
    <div
      // scroll-mt clears the sticky progress strip (~5rem on mobile, ~6rem with chip row on lg)
      className={cn(
        "scroll-mt-24 rounded-xl transition lg:scroll-mt-28",
        on && "ring-2 ring-hs-primary/15 ring-offset-2 ring-offset-hs-surface"
      )}
      data-workflow-step={stepId}
    >
      {children}
      <StepInlineValidation
        active={on}
        validation={validation}
        className="mx-4 mb-3 lg:mx-5"
      />
      {extra ? <div className="mt-3 space-y-3 px-1">{extra}</div> : null}
    </div>
  );
}

export const ConsultationContinuousFeed = forwardRef<HTMLDivElement, ConsultationContinuousFeedProps>(
  function ConsultationContinuousFeed(props, ref) {
    const {
      activeStep,
      readOnly = false,
      stepValidations,
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
      aiError,
      onAiDismissError,
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
      <div ref={ref} className="space-y-5 pb-6">
        <StepBlock
          stepId="patient"
          activeStep={activeStep}
          validation={stepValidations?.patient}
          extra={stepExtras?.patient}
        >
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

        <StepBlock
          stepId="history"
          activeStep={activeStep}
          validation={stepValidations?.history}
          extra={stepExtras?.history}
        >
          <Step02History
            stepNumber={2}
            value={historyStep}
            onChange={onHistoryStepChange}
            readOnly={readOnly}
          />
        </StepBlock>

        <StepBlock
          stepId="examination"
          activeStep={activeStep}
          validation={stepValidations?.examination}
          extra={stepExtras?.examination}
        >
          <Step03Examination
            stepNumber={3}
            value={examinationStep}
            onChange={onExaminationStepChange}
            readOnly={readOnly}
          />
        </StepBlock>

        <StepBlock
          stepId="notes"
          activeStep={activeStep}
          validation={stepValidations?.notes}
          extra={stepExtras?.notes}
        >
          <Step04Notes stepNumber={4} value={notesStep} onChange={onNotesStepChange} readOnly={readOnly} />
        </StepBlock>

        <StepBlock stepId="ai" activeStep={activeStep} validation={stepValidations?.ai} extra={stepExtras?.ai}>
          <Step05AI
            stepNumber={5}
            enabled={aiEnabled}
            status={aiStatus}
            transcript={aiTranscript}
            durationSec={aiDurationSec}
            isMock={aiIsMock}
            error={aiError ?? null}
            onDismissError={onAiDismissError}
            drawerSlot={aiDrawerSlot}
            onStart={onAiStart}
            onPause={onAiPause}
            onStop={onAiStop}
            onResume={onAiResume}
            onTranscriptChange={onAiTranscriptChange}
          />
        </StepBlock>

        <StepBlock
          stepId="prescription"
          activeStep={activeStep}
          validation={stepValidations?.prescription}
          extra={stepExtras?.prescription}
        >
          <Step06Prescription
            stepNumber={6}
            entries={prescriptionEntries}
            onChange={onPrescriptionChange}
            readOnly={readOnly}
          />
        </StepBlock>

        <StepBlock
          stepId="advice"
          activeStep={activeStep}
          validation={stepValidations?.advice}
          extra={stepExtras?.advice}
        >
          <Step07Advice stepNumber={7} cards={adviceCards} onChange={onAdviceChange} readOnly={readOnly} />
        </StepBlock>

        <StepBlock
          stepId="followup"
          activeStep={activeStep}
          validation={stepValidations?.followup}
          extra={stepExtras?.followup}
        >
          <Step08FollowUp stepNumber={8} value={followUpStep} onChange={onFollowUpChange} readOnly={readOnly} />
        </StepBlock>

        <StepBlock
          stepId="finalize"
          activeStep={activeStep}
          validation={stepValidations?.finalize}
          extra={stepExtras?.finalize}
        >
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
  const idx = Math.max(0, Math.min(stepNumber - 1, 8));
  scrollFeedToWorkflowStep(feedEl, [
    "patient",
    "history",
    "examination",
    "notes",
    "ai",
    "prescription",
    "advice",
    "followup",
    "finalize"
  ][idx] as ConsultationStep);
}

/**
 * Scroll the feed container so the targeted step's outer block sits just below the
 * sticky progress strip. We select the outer `[data-workflow-step]` (not the inner
 * StepShell number badge) so the ring + extras stay visually anchored.
 */
export function scrollFeedToWorkflowStep(
  feedEl: HTMLElement | null,
  step: ConsultationStep
): void {
  const node = feedEl?.querySelector<HTMLElement>(`[data-workflow-step="${step}"]`);
  if (!node) return;
  // `scroll-mt-24/lg:scroll-mt-28` on the block tells the browser to add top
  // padding so the heading isn't hidden under the sticky strip.
  node.scrollIntoView({ behavior: "smooth", block: "start" });
}

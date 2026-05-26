"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import type { ConsultationStep } from "../../../lib/clinical-workflow-config";
import { primaryStepIndex } from "../../../lib/clinical-workflow-config";
import type { StepValidation } from "../../../lib/consultation-validation";
import {
  Step01Patient,
  Step02History,
  Step03Examination,
  Step04Notes,
  Step06Prescription,
  Step07Advice,
  Step08FollowUp,
  Step09Finalize,
  type AdviceCard,
  type FinalizeSummaryItem,
  type FollowUpStepValue,
  type HistoryStepValue,
  type NotesStepValue,
  type PatientSnapshot,
  type PatientStepValue,
  type PrescriptionEntry,
  type ExaminationStepValue
} from "./steps";
import { ConsultationPatientOverview } from "./ConsultationPatientOverview";
import { StepLayoutProvider } from "./steps/StepLayoutContext";
import { StepInlineValidation } from "./StepInlineValidation";

export type ConsultationStepPanelProps = {
  activeStep: ConsultationStep;
  readOnly?: boolean;
  validation?: StepValidation;
  extra?: ReactNode;

  patient: PatientSnapshot;
  patientStep: PatientStepValue;
  onPatientStepChange: (v: PatientStepValue) => void;

  historyStep: HistoryStepValue;
  onHistoryStepChange: (v: HistoryStepValue) => void;

  examinationStep: ExaminationStepValue;
  onExaminationStepChange: (v: ExaminationStepValue) => void;

  notesStep: NotesStepValue;
  onNotesStepChange: (v: NotesStepValue) => void;

  prescriptionEntries: PrescriptionEntry[];
  onPrescriptionChange: (v: PrescriptionEntry[]) => void;

  adviceCards: AdviceCard[];
  onAdviceChange: (v: AdviceCard[]) => void;

  followUpStep: FollowUpStepValue;
  onFollowUpChange: (v: FollowUpStepValue) => void;

  finalizeItems: FinalizeSummaryItem[];
  alreadyFinalized: boolean;
  finalizeBlockedReason?: string;
  onFinalizeGoToStep?: (step: ConsultationStep) => void;
  outcomeSlot?: ReactNode;
  chartNotes?: string | null;
};

/**
 * Renders exactly one workflow step — the core of the focused clinical workspace.
 */
export function ConsultationStepPanel(props: ConsultationStepPanelProps): JSX.Element {
  const {
    activeStep,
    readOnly = false,
    validation,
    extra,
    patient,
    patientStep,
    onPatientStepChange,
    historyStep,
    onHistoryStepChange,
    examinationStep,
    onExaminationStepChange,
    notesStep,
    onNotesStepChange,
    prescriptionEntries,
    onPrescriptionChange,
    adviceCards,
    onAdviceChange,
    followUpStep,
    onFollowUpChange,
    finalizeItems,
    alreadyFinalized,
    finalizeBlockedReason,
    onFinalizeGoToStep,
    outcomeSlot,
    chartNotes
  } = props;

  const step = activeStep === "ai" ? "notes" : activeStep;
  const stepNumber = primaryStepIndex(step) + 1;

  let body: ReactNode = null;

  switch (step) {
    case "patient":
      body = (
        <>
          <ConsultationPatientOverview patient={patient} chartNotes={chartNotes} className="mb-8" />
          <Step01Patient
            stepNumber={stepNumber}
            patient={patient}
            value={patientStep}
            onChange={onPatientStepChange}
            readOnly={readOnly}
            status="active"
            after={undefined}
          />
        </>
      );
      break;
    case "history":
      body = (
        <Step02History stepNumber={stepNumber} value={historyStep} onChange={onHistoryStepChange} readOnly={readOnly} />
      );
      break;
    case "examination":
      body = (
        <Step03Examination
          stepNumber={stepNumber}
          value={examinationStep}
          onChange={onExaminationStepChange}
          readOnly={readOnly}
        />
      );
      break;
    case "notes":
      body = (
        <Step04Notes stepNumber={stepNumber} value={notesStep} onChange={onNotesStepChange} readOnly={readOnly} />
      );
      break;
    case "prescription":
      body = (
        <Step06Prescription
          stepNumber={stepNumber}
          entries={prescriptionEntries}
          onChange={onPrescriptionChange}
          readOnly={readOnly}
        />
      );
      break;
    case "advice":
      body = (
        <Step07Advice stepNumber={stepNumber} cards={adviceCards} onChange={onAdviceChange} readOnly={readOnly} />
      );
      break;
    case "followup":
      body = (
        <Step08FollowUp stepNumber={stepNumber} value={followUpStep} onChange={onFollowUpChange} readOnly={readOnly} />
      );
      break;
    case "finalize":
      body = (
        <Step09Finalize
          stepNumber={stepNumber}
          items={finalizeItems}
          alreadyFinalized={alreadyFinalized}
          finalizing={false}
          blockedReason={finalizeBlockedReason}
          outcomeSlot={outcomeSlot}
          onGoToStep={onFinalizeGoToStep}
        />
      );
      break;
    default:
      body = null;
  }

  return (
    <StepLayoutProvider bare>
      <motion.article
        key={step}
        data-workflow-step={step}
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {body}
        <StepInlineValidation active validation={validation} className="mt-6" />
        {extra ? <div className="mt-8 space-y-4 border-t border-black/[0.06] pt-8">{extra}</div> : null}
      </motion.article>
    </StepLayoutProvider>
  );
}

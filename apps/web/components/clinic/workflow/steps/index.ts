// Step kit for the 9-step consult workflow.
//
// Each Step0X file is a presentational component that takes a typed slice
// of state plus an `onChange` callback. Wire-up lives in
// `components/clinic/LiveConsultationClient.tsx`, which holds the master
// `clinical_record` state and persists it through `patchConsultation`.
//
// See docs/architecture/03_SCHEMA.md §6 for the JSON contract.
export { StepShell, FieldRow, STEP_INPUT_CLS, STEP_TEXTAREA_CLS } from "./StepShell";

export { Step01Patient } from "./Step01Patient";
export type { PatientSnapshot, PatientStepValue } from "./Step01Patient";

export { Step02History } from "./Step02History";
export type { HistoryStepValue } from "./Step02History";

export { Step03Examination } from "./Step03Examination";
export type { ExaminationStepValue, LabEntry } from "./Step03Examination";

export { Step04Notes } from "./Step04Notes";
export type { NotesStepValue } from "./Step04Notes";

export { Step05AI } from "./Step05AI";
export type { AIStepStatus } from "./Step05AI";

export { Step06Prescription } from "./Step06Prescription";
export type {
  PrescriptionEntry,
  TimingSlot as PrescriptionTimingSlot
} from "./Step06Prescription";

export { Step07Advice } from "./Step07Advice";
export type { AdviceCard, AdviceCategory } from "./Step07Advice";

export { Step08FollowUp } from "./Step08FollowUp";
export type { FollowUpStepValue } from "./Step08FollowUp";

export { Step09Finalize } from "./Step09Finalize";
export type { FinalizeSummaryItem } from "./Step09Finalize";

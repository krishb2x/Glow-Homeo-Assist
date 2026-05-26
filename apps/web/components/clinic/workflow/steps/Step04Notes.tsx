"use client";

import { FileText } from "lucide-react";
import { StepShell, FieldRow, STEP_TEXTAREA_CLS } from "./StepShell";

/** Mirrors the NoteDraft + ClinicalNotes shape used by the legacy client. */
export type NotesStepValue = {
  chiefComplaints: string;
  emotionalState: string;
  physicalSymptoms: string;
  modalities: string;
  timeline: string;
  observations: string;
  diagnosisThinking: string;
};

type Props = {
  stepNumber: number;
  value: NotesStepValue;
  onChange: (next: NotesStepValue) => void;
  readOnly?: boolean;
};

export function Step04Notes({ stepNumber, value, onChange, readOnly = false }: Props): JSX.Element {
  const set = <K extends keyof NotesStepValue>(key: K, v: NotesStepValue[K]): void =>
    onChange({ ...value, [key]: v });

  return (
    <StepShell
      stepNumber={stepNumber}
      icon={FileText}
      title="Clinical assessment"
      description="Document your clinical impression and structured case record."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldRow label="Chief complaints" hint="Patient's own words — what brought them in today.">
          <textarea
            rows={4}
            value={value.chiefComplaints}
            onChange={(e) => set("chiefComplaints", e.target.value)}
            disabled={readOnly}
            placeholder="e.g. Throbbing headache, right side, 6/10 since 3 weeks…"
            className={STEP_TEXTAREA_CLS}
          />
        </FieldRow>
        <FieldRow label="Timeline" hint="When did it start? Better, worse, or unchanged?">
          <textarea
            rows={4}
            value={value.timeline}
            onChange={(e) => set("timeline", e.target.value)}
            disabled={readOnly}
            placeholder="e.g. Started post-Diwali; worse last two weeks…"
            className={STEP_TEXTAREA_CLS}
          />
        </FieldRow>
        <FieldRow label="Mental / emotional state" hint="Mood, anxiety, dreams, fears, recent stressors.">
          <textarea
            rows={4}
            value={value.emotionalState}
            onChange={(e) => set("emotionalState", e.target.value)}
            disabled={readOnly}
            placeholder="e.g. Anxious, irritable, fear of failure at work…"
            className={STEP_TEXTAREA_CLS}
          />
        </FieldRow>
        <FieldRow label="Physical symptoms" hint="Sleep, appetite, thirst, perspiration, stool, urine.">
          <textarea
            rows={4}
            value={value.physicalSymptoms}
            onChange={(e) => set("physicalSymptoms", e.target.value)}
            disabled={readOnly}
            placeholder="e.g. Sleep — restless, dreams of falling; appetite — reduced…"
            className={STEP_TEXTAREA_CLS}
          />
        </FieldRow>
        <FieldRow
          label="Modalities"
          hint="What makes the complaint better or worse — heat, cold, motion, food, time of day."
          className="sm:col-span-2"
        >
          <textarea
            rows={3}
            value={value.modalities}
            onChange={(e) => set("modalities", e.target.value)}
            disabled={readOnly}
            placeholder="e.g. < cold drinks, > pressure, < night, > lying on right side…"
            className={STEP_TEXTAREA_CLS}
          />
        </FieldRow>
        <FieldRow
          label="Doctor's observations"
          hint="What you noticed during the consult that the patient did not say."
        >
          <textarea
            rows={4}
            value={value.observations}
            onChange={(e) => set("observations", e.target.value)}
            disabled={readOnly}
            placeholder="e.g. Patient sighs frequently, avoids eye contact…"
            className={STEP_TEXTAREA_CLS}
          />
        </FieldRow>
        <FieldRow
          label="Differential thinking"
          hint="Working diagnoses, miasms, key rubrics, remedies under consideration."
        >
          <textarea
            rows={4}
            value={value.diagnosisThinking}
            onChange={(e) => set("diagnosisThinking", e.target.value)}
            disabled={readOnly}
            placeholder="e.g. Suspect tension headache; Natrum mur vs Sepia; psoric…"
            className={STEP_TEXTAREA_CLS}
          />
        </FieldRow>
      </div>
    </StepShell>
  );
}

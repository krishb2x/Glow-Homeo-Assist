"use client";

import { ClipboardList } from "lucide-react";
import { StepShell, FieldRow, STEP_TEXTAREA_CLS } from "./StepShell";

/** v1 shape lives at clinical_record.history.{pastDiseases,medications}. */
export type HistoryStepValue = {
  pastDiseases: string;
  medications: string;
  familyHistory: string;
  drugAllergies: string;
};

type Props = {
  stepNumber: number;
  value: HistoryStepValue;
  onChange: (next: HistoryStepValue) => void;
  readOnly?: boolean;
};

export function Step02History({ stepNumber, value, onChange, readOnly = false }: Props): JSX.Element {
  return (
    <StepShell
      stepNumber={stepNumber}
      icon={ClipboardList}
      title="Clinical history"
      description="Past illnesses, current medications, allergies, and family history."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldRow
          label="Past illnesses & surgeries"
          hint="Diabetes, asthma, surgeries, hospitalizations, significant childhood illnesses…"
        >
          <textarea
            rows={5}
            value={value.pastDiseases}
            onChange={(e) => onChange({ ...value, pastDiseases: e.target.value })}
            disabled={readOnly}
            placeholder="e.g. Asthma since childhood; appendectomy 2018…"
            className={STEP_TEXTAREA_CLS}
          />
        </FieldRow>

        <FieldRow
          label="Current medications"
          hint="Include OTC, supplements, and homeopathic remedies from other practitioners."
        >
          <textarea
            rows={5}
            value={value.medications}
            onChange={(e) => onChange({ ...value, medications: e.target.value })}
            disabled={readOnly}
            placeholder="e.g. Metformin 500 mg BD; Vit D3 60K weekly…"
            className={STEP_TEXTAREA_CLS}
          />
        </FieldRow>

        <FieldRow
          label="Family history"
          hint="Hereditary tendencies — diabetes, hypertension, cancer, mental health."
        >
          <textarea
            rows={4}
            value={value.familyHistory}
            onChange={(e) => onChange({ ...value, familyHistory: e.target.value })}
            disabled={readOnly}
            placeholder="e.g. Father — Type 2 DM; Mother — Hypertension…"
            className={STEP_TEXTAREA_CLS}
          />
        </FieldRow>

        <FieldRow
          label="Drug allergies & sensitivities"
          hint="Free-text. Critical alerts also appear on the patient bar."
        >
          <textarea
            rows={4}
            value={value.drugAllergies}
            onChange={(e) => onChange({ ...value, drugAllergies: e.target.value })}
            disabled={readOnly}
            placeholder="e.g. Sulfa drugs — rash; Penicillin — anaphylaxis…"
            className={STEP_TEXTAREA_CLS}
          />
        </FieldRow>
      </div>
    </StepShell>
  );
}

"use client";

import { AlertTriangle, User } from "lucide-react";
import type { ReactNode } from "react";
import { StepShell, FieldRow, STEP_TEXTAREA_CLS } from "./StepShell";

export type PatientSnapshot = {
  name: string;
  age?: number | null;
  gender?: string | null;
  phone?: string | null;
  email?: string | null;
  allergies?: string | null;
  visitType?: "INITIAL" | "FOLLOW_UP";
  lastVisitAt?: string | null;
  chiefComplaint?: string | null;
};

export type PatientStepValue = {
  chiefComplaint: string;
};

type Props = {
  stepNumber: number;
  patient: PatientSnapshot;
  value: PatientStepValue;
  onChange: (next: PatientStepValue) => void;
  readOnly?: boolean;
  status?: "active" | "done" | "idle";
  after?: ReactNode;
};

export function Step01Patient({
  stepNumber,
  patient,
  value,
  onChange,
  readOnly = false,
  status = "idle",
  after
}: Props): JSX.Element {
  const hasAllergies = Boolean(patient.allergies?.trim());

  return (
    <StepShell
      stepNumber={stepNumber}
      icon={User}
      title="Today's complaint"
      description="One line the doctor enters before history-taking begins."
      status={status}
    >
      {hasAllergies ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-300/60 bg-amber-50/70 px-3 py-2 text-caption-sm text-amber-950">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            <span className="font-semibold">Allergy on file:</span> {patient.allergies}
          </span>
        </div>
      ) : null}

      <FieldRow
        label="Chief complaint for this visit"
        hint="Short and specific — you'll elaborate in History (Step 2)."
      >
        <textarea
          rows={3}
          value={value.chiefComplaint}
          onChange={(e) => onChange({ chiefComplaint: e.target.value })}
          disabled={readOnly}
          placeholder={patient.chiefComplaint ?? "e.g. recurrent migraines, worse mornings…"}
          className={STEP_TEXTAREA_CLS}
        />
      </FieldRow>

      {after ? <div className="mt-4 space-y-3 border-t border-hs-border/25 pt-4">{after}</div> : null}
    </StepShell>
  );
}

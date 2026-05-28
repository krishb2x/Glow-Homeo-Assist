"use client";

import { AlertTriangle, User } from "lucide-react";
import type { ReactNode } from "react";
import { StepShell, FieldRow, STEP_TEXTAREA_CLS } from "./StepShell";
import { cn } from "../../../../lib/cn";

export type PatientSnapshot = {
  name: string;
  patientCode?: string | null;
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
      title="Patient overview"
      description="Document today's presenting complaint and confirm details."
      status={status}
    >
      {hasAllergies && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl bg-amber-50/90 px-4 py-3 text-caption-sm text-amber-950 ring-1 ring-amber-200/50">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
          <span>
            <span className="font-extrabold">Allergies on file:</span> {patient.allergies}
          </span>
        </div>
      )}

      <div className="rounded-2xl border border-hs-border/20 bg-hs-paper p-5 shadow-sm space-y-4 hover:border-hs-primary/10 transition-all duration-200">
        <FieldRow
          label="Chief complaint for this visit"
          hint="Briefly describe the presenting symptoms — you'll elaborate on chronology, modalities, and constitutional history in subsequent steps."
        >
          <textarea
            rows={4}
            value={value.chiefComplaint}
            onChange={(e) => onChange({ chiefComplaint: e.target.value })}
            disabled={readOnly}
            placeholder={patient.chiefComplaint ?? "e.g. recurrent migraines, worse mornings, throbbing pain…"}
            className={cn(STEP_TEXTAREA_CLS, "min-h-[8rem] text-sm leading-relaxed")}
          />
        </FieldRow>
      </div>

      {after ? <div className="mt-5 space-y-3 border-t border-hs-border/25 pt-5">{after}</div> : null}
    </StepShell>
  );
}

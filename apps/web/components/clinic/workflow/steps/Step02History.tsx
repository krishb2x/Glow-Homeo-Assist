"use client";

import { ClipboardList } from "lucide-react";
import { StepShell, FieldRow, STEP_TEXTAREA_CLS } from "./StepShell";
import { cn } from "../../../../lib/cn";

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
      description="Document chronic conditions, active drug regimens, and genetic predispositions."
    >
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Left Column: Medical Background */}
        <div className="space-y-5">
          <div className="rounded-2xl border border-hs-border/20 bg-hs-paper p-5 shadow-sm hover:border-hs-primary/10 transition-all duration-200 space-y-4">
            <h3 className="text-body-sm font-bold text-hs-ink flex items-center gap-2 border-b border-hs-border/10 pb-2 select-none">
              <span className="h-1.5 w-1.5 rounded-full bg-hs-primary" />
              Past Illnesses & Surgeries
            </h3>
            <FieldRow
              label="Chronology of chronic illnesses & past surgeries"
              hint="List major diagnoses, surgeries, hospitalizations, or severe childhood events."
            >
              <textarea
                rows={5}
                value={value.pastDiseases}
                onChange={(e) => onChange({ ...value, pastDiseases: e.target.value })}
                disabled={readOnly}
                placeholder="e.g. Asthma since childhood; appendectomy 2018; hypertension diagnosed 2021..."
                className={cn(STEP_TEXTAREA_CLS, "text-sm min-h-[9rem] leading-relaxed")}
              />
            </FieldRow>
          </div>

          <div className="rounded-2xl border border-hs-border/20 bg-hs-paper p-5 shadow-sm hover:border-hs-primary/10 transition-all duration-200 space-y-4">
            <h3 className="text-body-sm font-bold text-hs-ink flex items-center gap-2 border-b border-hs-border/10 pb-2 select-none">
              <span className="h-1.5 w-1.5 rounded-full bg-hs-primary" />
              Current Medications
            </h3>
            <FieldRow
              label="Active pharmaceutical & homeopathic regimens"
              hint="Include allopathic medications, OTC supplements, vitamins, and previous remedies."
            >
              <textarea
                rows={5}
                value={value.medications}
                onChange={(e) => onChange({ ...value, medications: e.target.value })}
                disabled={readOnly}
                placeholder="e.g. Metformin 500 mg BD; Atorvastatin 10 mg QD; Vit D3 60K weekly..."
                className={cn(STEP_TEXTAREA_CLS, "text-sm min-h-[9rem] leading-relaxed")}
              />
            </FieldRow>
          </div>
        </div>

        {/* Right Column: Sensitivities & Family */}
        <div className="space-y-5">
          <div className="rounded-2xl border border-hs-border/20 bg-hs-paper p-5 shadow-sm hover:border-hs-primary/10 transition-all duration-200 space-y-4">
            <h3 className="text-body-sm font-bold text-hs-ink flex items-center gap-2 border-b border-hs-border/10 pb-2 select-none">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              Drug Allergies & Sensitivities
            </h3>
            <FieldRow
              label="Allergen records & sensitivity notices"
              hint="Critical warning alerts flagged here will also surface dynamically on the main patient bar."
            >
              <textarea
                rows={5}
                value={value.drugAllergies}
                onChange={(e) => onChange({ ...value, drugAllergies: e.target.value })}
                disabled={readOnly}
                placeholder="e.g. Sulfa drugs — rash; Penicillin — anaphylaxis; lactose intolerant..."
                className={cn(STEP_TEXTAREA_CLS, "text-sm min-h-[9rem] leading-relaxed")}
              />
            </FieldRow>
          </div>

          <div className="rounded-2xl border border-hs-border/20 bg-hs-paper p-5 shadow-sm hover:border-hs-primary/10 transition-all duration-200 space-y-4">
            <h3 className="text-body-sm font-bold text-hs-ink flex items-center gap-2 border-b border-hs-border/10 pb-2 select-none">
              <span className="h-1.5 w-1.5 rounded-full bg-hs-primary" />
              Family History
            </h3>
            <FieldRow
              label="Genetic tendencies & hereditary family diseases"
              hint="Document history of diabetes, hypertension, cardiovascular events, cancers, or mental health."
            >
              <textarea
                rows={5}
                value={value.familyHistory}
                onChange={(e) => onChange({ ...value, familyHistory: e.target.value })}
                disabled={readOnly}
                placeholder="e.g. Father — Type 2 Diabetes & CAD; Mother — Hypertension & Osteoarthritis..."
                className={cn(STEP_TEXTAREA_CLS, "text-sm min-h-[9rem] leading-relaxed")}
              />
            </FieldRow>
          </div>
        </div>
      </div>
    </StepShell>
  );
}

"use client";

import { FlaskConical, Plus, Trash2 } from "lucide-react";
import { StepShell, FieldRow, STEP_INPUT_CLS, STEP_TEXTAREA_CLS } from "./StepShell";
import { cn } from "../../../../lib/cn";

export type LabEntry = {
  id: string;
  testName: string;
  result: string;
  notes: string;
};

export type ExaminationStepValue = {
  labs: LabEntry[];
  bp: string;
  pulse: string;
  temperature: string;
  spO2: string;
  general: string;
};

type Props = {
  stepNumber: number;
  value: ExaminationStepValue;
  onChange: (next: ExaminationStepValue) => void;
  readOnly?: boolean;
};

function randomId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function Step03Examination({
  stepNumber,
  value,
  onChange,
  readOnly = false
}: Props): JSX.Element {
  const updateLab = (id: string, patch: Partial<LabEntry>): void => {
    onChange({
      ...value,
      labs: value.labs.map((l) => (l.id === id ? { ...l, ...patch } : l))
    });
  };

  const addLab = (): void => {
    onChange({
      ...value,
      labs: [...value.labs, { id: randomId(), testName: "", result: "", notes: "" }]
    });
  };

  const removeLab = (id: string): void => {
    onChange({ ...value, labs: value.labs.filter((l) => l.id !== id) });
  };

  return (
    <StepShell
      stepNumber={stepNumber}
      icon={FlaskConical}
      title="Examination"
      description="Vitals, general look, and lab results."
      actions={
        readOnly ? null : (
          <button
            type="button"
            onClick={addLab}
            className="inline-flex items-center gap-1.5 rounded-xl border border-hs-border/40 bg-hs-paper px-3 py-1.5 text-caption-sm font-bold text-hs-text-secondary transition hover:border-hs-primary/30 hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:text-hs-primary"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add lab
          </button>
        )
      }
    >
      <div className="space-y-5">
        {/* Top Section: Vitals & General Observations side-by-side on desktop */}
        <div className="grid gap-5 lg:grid-cols-2 lg:items-stretch">
          {/* Vitals Card */}
          <div className="rounded-2xl border border-hs-border/20 bg-hs-paper p-5 shadow-sm hover:border-hs-primary/10 transition-all duration-200 flex flex-col justify-between">
            <div>
              <h3 className="text-body-sm font-bold text-hs-ink flex items-center gap-2 border-b border-hs-border/10 pb-2 mb-4 select-none">
                <span className="h-1.5 w-1.5 rounded-full bg-hs-primary" />
                Patient Vitals
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {(
                  [
                    {
                      key: "bp",
                      label: "Blood pressure",
                      unit: "mmHg",
                      placeholder: "120/80",
                      inputMode: "text" as const,
                      autoComplete: "off"
                    },
                    {
                      key: "pulse",
                      label: "Pulse rate",
                      unit: "bpm",
                      placeholder: "72",
                      inputMode: "numeric" as const,
                      pattern: "[0-9]*"
                    },
                    {
                      key: "temperature",
                      label: "Temperature",
                      unit: "°F",
                      placeholder: "98.6",
                      inputMode: "decimal" as const,
                      pattern: "[0-9.]*"
                    },
                    {
                      key: "spO2",
                      label: "SpO₂ level",
                      unit: "%",
                      placeholder: "99",
                      inputMode: "numeric" as const,
                      pattern: "[0-9]*"
                    }
                  ] as const
                ).map((f) => {
                  const id = `vitals-${f.key}`;
                  return (
                    <FieldRow key={f.key} label={f.label} htmlFor={id}>
                      <div className="relative">
                        <input
                          id={id}
                          name={id}
                          type="text"
                          inputMode={f.inputMode}
                          pattern={"pattern" in f ? (f as { pattern?: string }).pattern : undefined}
                          autoComplete={
                            "autoComplete" in f ? (f as { autoComplete?: string }).autoComplete : "off"
                          }
                          value={value[f.key]}
                          onChange={(e) => onChange({ ...value, [f.key]: e.target.value })}
                          placeholder={f.placeholder}
                          disabled={readOnly}
                          className={cn(STEP_INPUT_CLS, "pr-14 font-mono text-sm tabular-nums")}
                          aria-describedby={`${id}-unit`}
                        />
                        <span
                          id={`${id}-unit`}
                          className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-[10px] font-bold text-hs-text-tertiary select-none"
                        >
                          {f.unit}
                        </span>
                      </div>
                    </FieldRow>
                  );
                })}
              </div>
            </div>
          </div>

          {/* General Observations Card */}
          <div className="rounded-2xl border border-hs-border/20 bg-hs-paper p-5 shadow-sm hover:border-hs-primary/10 transition-all duration-200 flex flex-col justify-between">
            <div className="flex-1 flex flex-col">
              <h3 className="text-body-sm font-bold text-hs-ink flex items-center gap-2 border-b border-hs-border/10 pb-2 mb-4 select-none">
                <span className="h-1.5 w-1.5 rounded-full bg-hs-primary" />
                General Observations
              </h3>
              <FieldRow
                label="Physical constitution & demeanour"
                hint="Document details about constitution, posture, gait, affect, skin/hair tone, or behaviors."
                className="flex-1 flex flex-col justify-between"
              >
                <textarea
                  rows={5}
                  value={value.general}
                  onChange={(e) => onChange({ ...value, general: e.target.value })}
                  disabled={readOnly}
                  placeholder="e.g. Moderate build, anxious affect, restless hands, avoids eye contact…"
                  className={cn(STEP_TEXTAREA_CLS, "text-sm flex-1 min-h-[9rem] leading-relaxed resize-none")}
                />
              </FieldRow>
            </div>
          </div>
        </div>

        {/* Bottom Section: Labs Card */}
        <div className="rounded-2xl border border-hs-border/20 bg-hs-paper p-5 shadow-sm hover:border-hs-primary/10 transition-all duration-200 space-y-4">
          <h3 className="text-body-sm font-bold text-hs-ink flex items-center gap-2 border-b border-hs-border/10 pb-2 select-none">
            <span className="h-1.5 w-1.5 rounded-full bg-hs-primary" />
            Labs & Investigations
          </h3>
          
          {value.labs.length === 0 ? (
            <p className="rounded-xl border border-dashed border-hs-border/40 bg-hs-cream/30 px-3 py-6 text-center text-body-sm text-hs-text-tertiary">
              No laboratory reports or investigations added. Click 'Add lab' above if needed.
            </p>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <div className="min-w-[650px] space-y-1.5 pb-1">
                {/* Header row */}
                <div className="grid gap-2 grid-cols-[1.5fr_1fr_2fr_28px] text-[10px] font-bold uppercase tracking-wider text-hs-text-tertiary select-none border-b border-hs-border/20 pb-1.5 px-1">
                  <div>Test name</div>
                  <div>Result</div>
                  <div>Notes</div>
                  <div className="text-center">Action</div>
                </div>
                <ul className="space-y-1.5">
                  {value.labs.map((lab) => {
                    const COMPACT_INPUT_CLS = "w-full rounded-lg border border-hs-border/30 bg-hs-cream/5 px-2 py-1.5 text-xs text-neutral-900 placeholder:text-hs-text-tertiary/60 transition-all duration-150 focus:bg-white focus:border-hs-primary/45 focus:outline-none focus:ring-2 focus:ring-hs-primary/10 disabled:opacity-50 h-8";
                    return (
                      <li
                        key={lab.id}
                        className="grid gap-2 grid-cols-[1.5fr_1fr_2fr_28px] items-center rounded-xl border border-hs-border/15 bg-hs-paper px-1.5 py-1.5 hover:border-hs-primary/20 hover:shadow-ds-sm transition duration-200"
                      >
                        <input
                          type="text"
                          value={lab.testName}
                          onChange={(e) => updateLab(lab.id, { testName: e.target.value })}
                          placeholder="e.g. HbA1c"
                          disabled={readOnly}
                          aria-label="Test name"
                          className={COMPACT_INPUT_CLS}
                        />
                        <input
                          type="text"
                          value={lab.result}
                          onChange={(e) => updateLab(lab.id, { result: e.target.value })}
                          placeholder="e.g. 5.7%"
                          disabled={readOnly}
                          aria-label="Result"
                          className={COMPACT_INPUT_CLS}
                        />
                        <input
                          type="text"
                          value={lab.notes}
                          onChange={(e) => updateLab(lab.id, { notes: e.target.value })}
                          placeholder="Notes..."
                          disabled={readOnly}
                          aria-label="Notes"
                          className={COMPACT_INPUT_CLS}
                        />
                        {readOnly ? (
                          <div />
                        ) : (
                          <div className="flex justify-center">
                            <button
                              type="button"
                              onClick={() => removeLab(lab.id)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-hs-text-tertiary/70 hover:border-rose-100 hover:bg-rose-50 hover:text-rose-600 transition"
                              aria-label="Remove lab row"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden />
                            </button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </StepShell>
  );
}

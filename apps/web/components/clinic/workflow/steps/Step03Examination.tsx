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
            className="inline-flex items-center gap-1.5 rounded-lg border border-hs-border/50 bg-hs-paper px-2.5 py-1.5 text-caption-sm font-semibold text-hs-ink transition hover:border-hs-primary/30"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Add lab
          </button>
        )
      }
    >
      <div className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
          <div>
            <p className="mb-3 text-caption-sm font-semibold text-hs-text-secondary">Vitals</p>
            <div className="grid grid-cols-2 gap-3">
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
                    label: "Pulse",
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
                    label: "SpO₂",
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
                        className={cn(STEP_INPUT_CLS, "pr-12 font-mono tabular-nums")}
                        aria-describedby={`${id}-unit`}
                      />
                      <span
                        id={`${id}-unit`}
                        className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-caption-sm font-medium text-hs-text-tertiary"
                      >
                        {f.unit}
                      </span>
                    </div>
                  </FieldRow>
                );
              })}
            </div>
          </div>

          <FieldRow
            label="General observations"
            hint="Build, demeanour, skin tone, posture, behaviour during consult."
          >
            <textarea
              rows={6}
              value={value.general}
              onChange={(e) => onChange({ ...value, general: e.target.value })}
              disabled={readOnly}
              placeholder="e.g. Moderate build, anxious affect, restless hands…"
              className={cn(STEP_TEXTAREA_CLS, "min-h-[10rem] lg:min-h-0 lg:h-full")}
            />
          </FieldRow>
        </div>

        <div className="space-y-2">
          <p className="text-caption-sm font-semibold text-hs-text-secondary">Labs & investigations</p>
          {value.labs.length === 0 ? (
            <p className="rounded-xl border border-dashed border-hs-border/40 bg-hs-cream/30 px-3 py-3 text-caption-sm text-hs-text-tertiary">
              No labs added yet. Use{readOnly ? "" : ' "Add lab"'} above when needed.
            </p>
          ) : (
            <ul className="space-y-2">
              {value.labs.map((lab) => (
                <li
                  key={lab.id}
                  className={cn(
                    "rounded-xl border border-hs-border/30 bg-hs-cream/30 p-3",
                    "grid gap-2 sm:grid-cols-[1fr_1fr_1.5fr_auto]"
                  )}
                >
                  <input
                    type="text"
                    value={lab.testName}
                    onChange={(e) => updateLab(lab.id, { testName: e.target.value })}
                    placeholder="Test name (e.g. HbA1c)"
                    disabled={readOnly}
                    className={STEP_INPUT_CLS}
                  />
                  <input
                    type="text"
                    value={lab.result}
                    onChange={(e) => updateLab(lab.id, { result: e.target.value })}
                    placeholder="Result"
                    disabled={readOnly}
                    className={STEP_INPUT_CLS}
                  />
                  <input
                    type="text"
                    value={lab.notes}
                    onChange={(e) => updateLab(lab.id, { notes: e.target.value })}
                    placeholder="Note"
                    disabled={readOnly}
                    className={STEP_INPUT_CLS}
                  />
                  {readOnly ? null : (
                    <button
                      type="button"
                      onClick={() => removeLab(lab.id)}
                      className="inline-flex h-9 items-center justify-center rounded-lg border border-rose-200/70 bg-rose-50/60 px-2 text-rose-700 transition hover:bg-rose-100"
                      aria-label="Remove lab row"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </StepShell>
  );
}

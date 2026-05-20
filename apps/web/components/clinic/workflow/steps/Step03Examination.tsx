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
        <div className="grid gap-3 sm:grid-cols-4">
          {(
            [
              { key: "bp", label: "BP", placeholder: "120/80" },
              { key: "pulse", label: "Pulse", placeholder: "72 / min" },
              { key: "temperature", label: "Temp", placeholder: "98.6 °F" },
              { key: "spO2", label: "SpO₂", placeholder: "99 %" }
            ] as const
          ).map((f) => (
            <FieldRow key={f.key} label={f.label}>
              <input
                type="text"
                value={value[f.key]}
                onChange={(e) => onChange({ ...value, [f.key]: e.target.value })}
                placeholder={f.placeholder}
                disabled={readOnly}
                className={STEP_INPUT_CLS}
              />
            </FieldRow>
          ))}
        </div>

        <FieldRow
          label="General observations"
          hint="Build, demeanour, skin tone, posture, behaviour during consult."
        >
          <textarea
            rows={4}
            value={value.general}
            onChange={(e) => onChange({ ...value, general: e.target.value })}
            disabled={readOnly}
            placeholder="e.g. Moderate build, anxious affect, restless hands…"
            className={STEP_TEXTAREA_CLS}
          />
        </FieldRow>

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

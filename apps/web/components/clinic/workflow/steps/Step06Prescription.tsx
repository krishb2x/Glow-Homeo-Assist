"use client";

import { Pill, Plus, Trash2 } from "lucide-react";
import { StepShell, FieldRow, STEP_INPUT_CLS, STEP_TEXTAREA_CLS } from "./StepShell";
import { REMEDY_NAMES } from "../../../../lib/remedy-names";
import { cn } from "../../../../lib/cn";

export type TimingSlot = "morning" | "afternoon" | "evening" | "night";

export type PrescriptionEntry = {
  id: string;
  kind: "remedy" | "medicine";
  name: string;
  potency: string;
  doseCount: string;
  frequency: string;
  customFrequency: string;
  timingSlots: TimingSlot[];
  duration: string;
  instructions: string;
};

type Props = {
  stepNumber: number;
  entries: PrescriptionEntry[];
  onChange: (next: PrescriptionEntry[]) => void;
  readOnly?: boolean;
};

const FREQ_OPTIONS: Array<{ key: string; label: string }> = [
  { key: "once", label: "Once daily" },
  { key: "twice", label: "Twice daily" },
  { key: "thrice", label: "3× daily" },
  { key: "four", label: "4× daily" },
  { key: "sos", label: "SOS" },
  { key: "alt", label: "Alternate days" },
  { key: "weekly", label: "Once weekly" },
  { key: "custom", label: "Custom…" }
];

const SLOT_LABELS: Record<TimingSlot, string> = {
  morning: "Mor",
  afternoon: "Aft",
  evening: "Eve",
  night: "Night"
};

const POTENCY_OPTS = ["6C", "12C", "30C", "200C", "1M", "10M", "CM", "6X", "12X", "30X", "LM1", "LM2", "Q"];
const DURATION_OPTS = ["3 days", "5 days", "7 days", "10 days", "2 weeks", "1 month", "Until review"];

function randomId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function emptyEntry(kind: "remedy" | "medicine" = "remedy"): PrescriptionEntry {
  return {
    id: randomId(),
    kind,
    name: "",
    potency: "",
    doseCount: "",
    frequency: "twice",
    customFrequency: "",
    timingSlots: ["morning", "night"],
    duration: "",
    instructions: ""
  };
}

export function Step06Prescription({
  stepNumber,
  entries,
  onChange,
  readOnly = false
}: Props): JSX.Element {
  const update = (id: string, patch: Partial<PrescriptionEntry>): void =>
    onChange(entries.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  const remove = (id: string): void => onChange(entries.filter((e) => e.id !== id));

  const add = (kind: "remedy" | "medicine"): void => onChange([...entries, emptyEntry(kind)]);

  const toggleSlot = (id: string, slot: TimingSlot): void => {
    const target = entries.find((e) => e.id === id);
    if (!target) return;
    const next = target.timingSlots.includes(slot)
      ? target.timingSlots.filter((s) => s !== slot)
      : [...target.timingSlots, slot];
    update(id, { timingSlots: next });
  };

  return (
    <StepShell
      stepNumber={stepNumber}
      icon={Pill}
      title="Prescription"
      description="Remedies, supplements, potency, dose, and timing."
      actions={
        readOnly ? null : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => add("remedy")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-hs-primary px-2.5 py-1.5 text-caption-sm font-semibold text-white transition hover:bg-hs-primary-light"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Remedy
            </button>
            <button
              type="button"
              onClick={() => add("medicine")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-hs-border/50 bg-hs-paper px-2.5 py-1.5 text-caption-sm font-semibold text-hs-ink transition hover:border-hs-primary/30"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Supplement
            </button>
          </div>
        )
      }
    >
      {entries.length === 0 ? (
        <p className="rounded-xl border border-dashed border-hs-border/40 bg-hs-cream/30 px-3 py-4 text-body-sm text-hs-text-tertiary">
          No prescription items yet. {readOnly ? null : "Use the buttons above to add one."}
        </p>
      ) : (
        <ul className="space-y-4">
          {entries.map((entry, idx) => (
            <li
              key={entry.id}
              className="rounded-2xl border border-hs-border/30 bg-hs-cream/20 p-4"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="font-heading text-body-sm font-semibold text-hs-ink">
                  {entry.kind === "remedy" ? "Remedy" : "Supplement"} #{idx + 1}
                </p>
                {readOnly ? null : (
                  <button
                    type="button"
                    onClick={() => remove(entry.id)}
                    className="inline-flex items-center gap-1 rounded-md border border-rose-200/70 bg-rose-50/60 px-2 py-1 text-caption-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                  >
                    <Trash2 className="h-3 w-3" aria-hidden />
                    Remove
                  </button>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr]">
                <FieldRow label="Name" htmlFor={`p-name-${entry.id}`}>
                  <input
                    id={`p-name-${entry.id}`}
                    list={entry.kind === "remedy" ? "ha-remedy-list" : undefined}
                    type="text"
                    value={entry.name}
                    onChange={(e) => update(entry.id, { name: e.target.value })}
                    disabled={readOnly}
                    placeholder={entry.kind === "remedy" ? "Belladonna" : "Vit D3 60K"}
                    className={STEP_INPUT_CLS}
                  />
                </FieldRow>
                {entry.kind === "remedy" ? (
                  <FieldRow label="Potency" htmlFor={`p-potency-${entry.id}`}>
                    <select
                      id={`p-potency-${entry.id}`}
                      value={entry.potency}
                      onChange={(e) => update(entry.id, { potency: e.target.value })}
                      disabled={readOnly}
                      className={STEP_INPUT_CLS}
                    >
                      <option value="">—</option>
                      {POTENCY_OPTS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </FieldRow>
                ) : (
                  <FieldRow label="Strength" htmlFor={`p-strength-${entry.id}`}>
                    <input
                      id={`p-strength-${entry.id}`}
                      type="text"
                      value={entry.potency}
                      onChange={(e) => update(entry.id, { potency: e.target.value })}
                      disabled={readOnly}
                      placeholder="e.g. 60 000 IU"
                      className={STEP_INPUT_CLS}
                    />
                  </FieldRow>
                )}
                <FieldRow label="Dose" htmlFor={`p-dose-${entry.id}`}>
                  <input
                    id={`p-dose-${entry.id}`}
                    type="text"
                    value={entry.doseCount}
                    onChange={(e) => update(entry.id, { doseCount: e.target.value })}
                    disabled={readOnly}
                    placeholder={entry.kind === "remedy" ? "4 pills" : "1 capsule"}
                    className={STEP_INPUT_CLS}
                  />
                </FieldRow>
                <FieldRow label="Duration" htmlFor={`p-duration-${entry.id}`}>
                  <input
                    id={`p-duration-${entry.id}`}
                    type="text"
                    list={`p-duration-list-${entry.id}`}
                    value={entry.duration}
                    onChange={(e) => update(entry.id, { duration: e.target.value })}
                    disabled={readOnly}
                    placeholder="7 days"
                    className={STEP_INPUT_CLS}
                  />
                  <datalist id={`p-duration-list-${entry.id}`}>
                    {DURATION_OPTS.map((d) => (
                      <option key={d} value={d} />
                    ))}
                  </datalist>
                </FieldRow>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-[0.9fr_1.1fr_1fr]">
                <FieldRow label="Frequency" htmlFor={`p-freq-${entry.id}`}>
                  <select
                    id={`p-freq-${entry.id}`}
                    value={entry.frequency}
                    onChange={(e) => update(entry.id, { frequency: e.target.value })}
                    disabled={readOnly}
                    className={STEP_INPUT_CLS}
                  >
                    {FREQ_OPTIONS.map((f) => (
                      <option key={f.key} value={f.key}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                  {entry.frequency === "custom" ? (
                    <input
                      type="text"
                      value={entry.customFrequency}
                      onChange={(e) => update(entry.id, { customFrequency: e.target.value })}
                      placeholder="Custom schedule"
                      disabled={readOnly}
                      className={cn(STEP_INPUT_CLS, "mt-2")}
                    />
                  ) : null}
                </FieldRow>
                <FieldRow label="Timing" hint="Select one or more.">
                  <div className="flex flex-wrap gap-1.5">
                    {(["morning", "afternoon", "evening", "night"] as TimingSlot[]).map((slot) => {
                      const on = entry.timingSlots.includes(slot);
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => toggleSlot(entry.id, slot)}
                          disabled={readOnly}
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-caption-sm font-semibold transition",
                            on
                              ? "border-hs-primary/35 bg-hs-primary text-white"
                              : "border-hs-border/50 bg-hs-paper text-hs-text-secondary hover:border-hs-primary/30"
                          )}
                          aria-pressed={on}
                        >
                          {SLOT_LABELS[slot]}
                        </button>
                      );
                    })}
                  </div>
                </FieldRow>
                <FieldRow label="Instructions" htmlFor={`p-inst-${entry.id}`}>
                  <textarea
                    id={`p-inst-${entry.id}`}
                    rows={2}
                    value={entry.instructions}
                    onChange={(e) => update(entry.id, { instructions: e.target.value })}
                    disabled={readOnly}
                    placeholder="e.g. 30 min before food, dry tongue."
                    className={STEP_TEXTAREA_CLS}
                  />
                </FieldRow>
              </div>
            </li>
          ))}
        </ul>
      )}

      <datalist id="ha-remedy-list">
        {REMEDY_NAMES.map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>
    </StepShell>
  );
}

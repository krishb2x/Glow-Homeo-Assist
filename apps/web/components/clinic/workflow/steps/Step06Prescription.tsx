"use client";

import { useEffect } from "react";
import { Pill, Plus, Trash2 } from "lucide-react";
import { StepShell } from "./StepShell";
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
  morning: "M",
  afternoon: "A",
  evening: "E",
  night: "N"
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

const COMPACT_INPUT_CLS =
  "w-full rounded-lg border border-hs-border/30 bg-hs-cream/5 px-2 py-1.5 text-xs text-neutral-900 placeholder:text-hs-text-tertiary/60 transition-all duration-150 focus:bg-white focus:border-hs-primary/45 focus:outline-none focus:ring-2 focus:ring-hs-primary/10 disabled:opacity-50 h-8";

export function Step06Prescription({
  stepNumber,
  entries,
  onChange,
  readOnly = false
}: Props): JSX.Element {
  const update = (id: string, patch: Partial<PrescriptionEntry>): void =>
    onChange(entries.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  const remove = (id: string): void => onChange(entries.filter((e) => e.id !== id));

  const add = (kind: "remedy" | "medicine"): void => {
    const nextId = randomId();
    onChange([...entries, { ...emptyEntry(kind), id: nextId }]);

    // Auto focus the new row's name input after DOM paint
    setTimeout(() => {
      const input = document.getElementById(`p-name-${nextId}`);
      input?.focus();
    }, 50);
  };

  const toggleSlot = (id: string, slot: TimingSlot): void => {
    const target = entries.find((e) => e.id === id);
    if (!target) return;
    const next = target.timingSlots.includes(slot)
      ? target.timingSlots.filter((s) => s !== slot)
      : [...target.timingSlots, slot];
    update(id, { timingSlots: next });
  };

  // Keyboard shortcut listener within the Prescription component context
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (readOnly) return;
      
      // Alt+R -> Add Remedy
      if (e.altKey && e.key.toLowerCase() === "r") {
        e.preventDefault();
        add("remedy");
      }
      // Alt+S -> Add Supplement
      if (e.altKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        add("medicine");
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [entries, readOnly]);

  const handleInputKeyDown = (e: React.KeyboardEvent, id: string) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      // Find the current item kind to add the same kind
      const entry = entries.find((item) => item.id === id);
      add(entry?.kind || "remedy");
    }
  };

  const GRID_COLS = "grid grid-cols-[48px_2.4fr_1.1fr_1.1fr_1.4fr_98px_1.1fr_2.2fr_28px] gap-1.5 items-center";

  return (
    <StepShell
      stepNumber={stepNumber}
      icon={Pill}
      title="Prescription"
      description="Direct grid entry. Press Tab to jump cells, Ctrl+Enter to clone row down. Hotkeys: Alt+R (remedy), Alt+S (supplement)."
      actions={
        readOnly ? null : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => add("remedy")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-hs-primary px-3 py-1.5 text-caption-sm font-bold text-white transition hover:bg-hs-primary-light hover:scale-[1.02] active:scale-[0.98] shadow-sm"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Add Remedy <kbd className="hidden sm:inline-block ml-1 opacity-70 text-[9px] font-semibold bg-white/20 px-1 rounded">Alt+R</kbd>
            </button>
            <button
              type="button"
              onClick={() => add("medicine")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-hs-border/40 bg-hs-paper px-3 py-1.5 text-caption-sm font-bold text-hs-text-secondary transition hover:border-hs-primary/30 hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:text-hs-primary"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Add Supplement <kbd className="hidden sm:inline-block ml-1 opacity-70 text-[9px] font-semibold bg-hs-cream px-1 rounded">Alt+S</kbd>
            </button>
          </div>
        )
      }
    >
      {entries.length === 0 ? (
        <p className="rounded-xl border border-dashed border-hs-border/40 bg-hs-cream/30 px-3 py-6 text-center text-body-sm text-hs-text-tertiary">
          No prescription items yet. {readOnly ? null : "Click 'Add Remedy' or 'Add Supplement' to start."}
        </p>
      ) : (
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="min-w-[730px] pb-2 space-y-1">
            {/* Clean Column Headers */}
            <div className={cn(GRID_COLS, "border-b border-hs-border/20 pb-2 px-1 text-[10px] font-bold uppercase tracking-wider text-hs-text-tertiary select-none sticky top-0 bg-hs-surface/40 backdrop-blur-sm z-10")}>
              <div>Type</div>
              <div>Name</div>
              <div>Potency/Str</div>
              <div>Dose</div>
              <div>Frequency</div>
              <div>Timing</div>
              <div>Duration</div>
              <div>Instructions</div>
              <div className="text-center">Action</div>
            </div>

            {/* Rows List */}
            <div className="space-y-1.5 mt-1.5">
              {entries.map((entry, idx) => (
                <div
                  key={entry.id}
                  className={cn(
                    GRID_COLS,
                    "rounded-xl border border-hs-border/15 bg-hs-paper px-1.5 py-1.5 transition-all duration-205 hover:border-hs-primary/25 hover:shadow-ds-sm"
                  )}
                >
                  {/* Type Badge */}
                  <div className="flex justify-center">
                    <span
                      title={entry.kind === "remedy" ? "Remedy" : "Supplement"}
                      className={cn(
                        "inline-flex h-5 w-[38px] items-center justify-center rounded text-[9px] font-extrabold uppercase tracking-wider border",
                        entry.kind === "remedy"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200/50"
                          : "bg-indigo-50 text-indigo-800 border-indigo-200/50"
                      )}
                    >
                      {entry.kind === "remedy" ? "Rem" : "Sup"}
                    </span>
                  </div>

                  {/* Name Input */}
                  <div>
                    <input
                      id={`p-name-${entry.id}`}
                      list={entry.kind === "remedy" ? "ha-remedy-list" : undefined}
                      type="text"
                      value={entry.name}
                      onChange={(e) => update(entry.id, { name: e.target.value })}
                      onKeyDown={(e) => handleInputKeyDown(e, entry.id)}
                      disabled={readOnly}
                      placeholder={entry.kind === "remedy" ? "Remedy name..." : "Supplement name..."}
                      aria-label="Name"
                      className={COMPACT_INPUT_CLS}
                    />
                  </div>

                  {/* Potency / Strength */}
                  <div>
                    {entry.kind === "remedy" ? (
                      <select
                        id={`p-potency-${entry.id}`}
                        value={entry.potency}
                        onChange={(e) => update(entry.id, { potency: e.target.value })}
                        disabled={readOnly}
                        aria-label="Potency"
                        className={COMPACT_INPUT_CLS}
                      >
                        <option value="">Potency</option>
                        {POTENCY_OPTS.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id={`p-strength-${entry.id}`}
                        type="text"
                        value={entry.potency}
                        onChange={(e) => update(entry.id, { potency: e.target.value })}
                        onKeyDown={(e) => handleInputKeyDown(e, entry.id)}
                        disabled={readOnly}
                        placeholder="Strength..."
                        aria-label="Strength"
                        className={COMPACT_INPUT_CLS}
                      />
                    )}
                  </div>

                  {/* Dose */}
                  <div>
                    <input
                      id={`p-dose-${entry.id}`}
                      type="text"
                      value={entry.doseCount}
                      onChange={(e) => update(entry.id, { doseCount: e.target.value })}
                      onKeyDown={(e) => handleInputKeyDown(e, entry.id)}
                      disabled={readOnly}
                      placeholder="e.g. 4 pills"
                      aria-label="Dose"
                      className={COMPACT_INPUT_CLS}
                    />
                  </div>

                  {/* Frequency */}
                  <div>
                    {entry.frequency === "custom" ? (
                      <div className="relative">
                        <input
                          type="text"
                          value={entry.customFrequency}
                          onChange={(e) => update(entry.id, { customFrequency: e.target.value })}
                          onKeyDown={(e) => handleInputKeyDown(e, entry.id)}
                          placeholder="Custom frequency"
                          disabled={readOnly}
                          aria-label="Custom Frequency"
                          className={cn(COMPACT_INPUT_CLS, "pr-5")}
                        />
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => update(entry.id, { frequency: "once", customFrequency: "" })}
                            className="absolute right-1 top-1/2 -translate-y-1/2 text-hs-text-tertiary hover:text-hs-ink text-[11px] font-bold h-4 w-4 flex items-center justify-center rounded-full hover:bg-hs-cream"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ) : (
                      <select
                        id={`p-freq-${entry.id}`}
                        value={entry.frequency}
                        onChange={(e) => update(entry.id, { frequency: e.target.value })}
                        disabled={readOnly}
                        aria-label="Frequency"
                        className={COMPACT_INPUT_CLS}
                      >
                        {FREQ_OPTIONS.map((f) => (
                          <option key={f.key} value={f.key}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Timing slots */}
                  <div>
                    <div className="flex gap-0.5 items-center justify-between border border-hs-border/30 rounded-lg p-0.5 bg-hs-cream/10 h-8">
                      {(["morning", "afternoon", "evening", "night"] as TimingSlot[]).map((slot) => {
                        const on = entry.timingSlots.includes(slot);
                        const label = SLOT_LABELS[slot];
                        return (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => toggleSlot(entry.id, slot)}
                            disabled={readOnly}
                            title={slot.charAt(0).toUpperCase() + slot.slice(1)}
                            className={cn(
                              "h-6 w-[21px] rounded text-[9px] font-black transition-all duration-150 flex items-center justify-center select-none",
                              on
                                ? "bg-hs-primary text-white shadow-sm"
                                : "text-hs-text-tertiary hover:bg-hs-cream hover:text-hs-ink"
                            )}
                            aria-pressed={on}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Duration */}
                  <div>
                    <input
                      id={`p-duration-${entry.id}`}
                      type="text"
                      list={`p-duration-list-${entry.id}`}
                      value={entry.duration}
                      onChange={(e) => update(entry.id, { duration: e.target.value })}
                      onKeyDown={(e) => handleInputKeyDown(e, entry.id)}
                      disabled={readOnly}
                      placeholder="Duration"
                      aria-label="Duration"
                      className={COMPACT_INPUT_CLS}
                    />
                    <datalist id={`p-duration-list-${entry.id}`}>
                      {DURATION_OPTS.map((d) => (
                        <option key={d} value={d} />
                      ))}
                    </datalist>
                  </div>

                  {/* Instructions */}
                  <div>
                    <input
                      id={`p-inst-${entry.id}`}
                      type="text"
                      value={entry.instructions}
                      onChange={(e) => update(entry.id, { instructions: e.target.value })}
                      onKeyDown={(e) => handleInputKeyDown(e, entry.id)}
                      disabled={readOnly}
                      placeholder="Instructions..."
                      aria-label="Instructions"
                      className={COMPACT_INPUT_CLS}
                    />
                  </div>

                  {/* Remove Button */}
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => remove(entry.id)}
                      title="Remove row"
                      disabled={readOnly}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-hs-text-tertiary/70 hover:border-rose-100 hover:bg-rose-50 hover:text-rose-600 transition disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <datalist id="ha-remedy-list">
        {REMEDY_NAMES.map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>
    </StepShell>
  );
}

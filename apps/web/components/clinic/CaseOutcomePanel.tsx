"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../../lib/cn";
import type { CaseOutcomeValue } from "../../lib/doctor-api";

export const CASE_OUTCOME_OPTIONS: Array<{ value: CaseOutcomeValue; label: string; hint: string }> = [
  { value: "CURE", label: "Cure", hint: "Symptoms resolved" },
  { value: "IMPROVEMENT", label: "Improvement", hint: "Clear but incomplete relief" },
  { value: "PALLIATION", label: "Palliation", hint: "Temporary or partial relief" },
  { value: "NO_CHANGE", label: "No change", hint: "Little or no response" },
  { value: "WORSE", label: "Worse", hint: "Symptoms aggravated" }
];

type Props = {
  endedAt?: string;
  summary?: string;
  value: CaseOutcomeValue | "";
  assessment: string;
  onChange: (value: CaseOutcomeValue | "") => void;
  onAssessmentChange: (v: string) => void;
  onSave: () => Promise<void>;
  saved?: boolean;
  disabled?: boolean;
  compact?: boolean;
};

export function CaseOutcomePanel({
  endedAt,
  summary,
  value,
  assessment,
  onChange,
  onAssessmentChange,
  onSave,
  saved = false,
  disabled = false,
  compact = false
}: Props): JSX.Element {
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (saved) {
    return (
      <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-4 py-3 text-body-sm text-emerald-900">
        Outcome from the previous visit has been recorded.
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-amber-200/70 bg-amber-50/50",
        compact ? "p-3" : "p-4"
      )}
    >
      <p className="text-body-sm font-semibold text-hs-ink">Outcome from last visit</p>
      <p className="mt-1 text-caption-sm text-hs-text-secondary">
        {endedAt
          ? `Visit ended ${new Date(endedAt).toLocaleDateString(undefined, { dateStyle: "medium" })}.`
          : "Document how the patient responded to the last remedy before continuing."}
        {summary ? ` ${summary}` : ""}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {CASE_OUTCOME_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            disabled={disabled || saving}
            onClick={() => onChange(opt.value)}
            title={opt.hint}
            className={cn(
              "rounded-full border px-3 py-1.5 text-caption-sm font-semibold transition",
              value === opt.value
                ? "border-hs-primary/50 bg-hs-primary-very-light text-hs-primary"
                : "border-hs-border/50 bg-hs-paper text-hs-text-secondary hover:border-hs-primary/30"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <label className="mt-3 block">
        <span className="text-caption-sm font-medium text-hs-text-secondary">Assessment (optional)</span>
        <textarea
          value={assessment}
          onChange={(e) => onAssessmentChange(e.target.value)}
          disabled={disabled || saving}
          rows={2}
          placeholder="Brief note on response, aggravation, or new symptoms…"
          className="mt-1 w-full rounded-xl border border-hs-border/40 bg-hs-paper px-3 py-2 text-body-sm text-hs-ink placeholder:text-hs-text-tertiary/70 focus:border-hs-primary/45 focus:outline-none focus:ring-2 focus:ring-hs-primary/15 disabled:opacity-60"
        />
      </label>
      {err ? <p className="mt-2 text-caption-sm text-rose-700">{err}</p> : null}
      <button
        type="button"
        disabled={disabled || saving || !value}
        onClick={() => {
          setErr(null);
          setSaving(true);
          void onSave()
            .catch((e) => setErr(e instanceof Error ? e.message : "Could not save outcome"))
            .finally(() => setSaving(false));
        }}
        className="mt-3 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-hs-primary px-4 text-body-sm font-bold text-white shadow-sm hover:bg-hs-primary-light disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
        Save outcome
      </button>
    </div>
  );
}

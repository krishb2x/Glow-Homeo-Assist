"use client";

import { Calendar } from "lucide-react";
import { StepShell, FieldRow, STEP_INPUT_CLS, STEP_TEXTAREA_CLS } from "./StepShell";
import { cn } from "../../../../lib/cn";

export type FollowUpStepValue = {
  enabled: boolean;
  /** datetime-local string for the input (`YYYY-MM-DDTHH:mm`). */
  recommendedAt: string;
  reason: string;
  symptomsToMonitor: string;
};

type Props = {
  stepNumber: number;
  value: FollowUpStepValue;
  onChange: (next: FollowUpStepValue) => void;
  readOnly?: boolean;
};

function presetDate(days: number): string {
  const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T10:00`;
}

export function Step08FollowUp({
  stepNumber,
  value,
  onChange,
  readOnly = false
}: Props): JSX.Element {
  return (
    <StepShell
      stepNumber={stepNumber}
      icon={Calendar}
      title="Follow-up"
      description="When should the patient come back, and what should you monitor?"
      actions={
        readOnly ? null : (
          <label className="inline-flex items-center gap-2 text-caption-sm font-semibold text-hs-ink">
            <input
              type="checkbox"
              checked={value.enabled}
              onChange={(e) => onChange({ ...value, enabled: e.target.checked })}
              className="h-4 w-4 rounded border-hs-border accent-hs-primary"
            />
            Schedule a follow-up
          </label>
        )
      }
    >
      {!value.enabled ? (
        <p className="rounded-xl border border-dashed border-hs-border/40 bg-hs-cream/30 px-3 py-4 text-body-sm text-hs-text-secondary">
          No follow-up will be created for this consultation. Toggle "Schedule a follow-up" above to plan one.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <FieldRow label="Recommended date & time" htmlFor="fu-when">
              <input
                id="fu-when"
                type="datetime-local"
                value={value.recommendedAt}
                onChange={(e) => onChange({ ...value, recommendedAt: e.target.value })}
                disabled={readOnly}
                className={STEP_INPUT_CLS}
              />
            </FieldRow>
            <div className="flex flex-wrap items-end gap-1.5">
              {[
                { label: "+1 wk", d: 7 },
                { label: "+2 wks", d: 14 },
                { label: "+4 wks", d: 28 },
                { label: "+3 mo", d: 90 }
              ].map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => onChange({ ...value, recommendedAt: presetDate(p.d) })}
                  disabled={readOnly}
                  className={cn(
                    "rounded-full border border-hs-border/50 bg-hs-paper px-2.5 py-1 text-caption-sm font-semibold text-hs-ink transition hover:border-hs-primary/30",
                    readOnly && "opacity-60"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <FieldRow label="Why follow up?" hint="One line — surfaces on the follow-up dashboard.">
            <input
              type="text"
              value={value.reason}
              onChange={(e) => onChange({ ...value, reason: e.target.value })}
              disabled={readOnly}
              placeholder="e.g. Review headache frequency on Nat-Mur 200"
              className={STEP_INPUT_CLS}
            />
          </FieldRow>

          <FieldRow
            label="Symptoms to monitor"
            hint="Comma-separated list. Shown to the patient on their follow-up checklist."
          >
            <textarea
              rows={3}
              value={value.symptomsToMonitor}
              onChange={(e) => onChange({ ...value, symptomsToMonitor: e.target.value })}
              disabled={readOnly}
              placeholder="e.g. headache frequency, sleep quality, anxiety bouts"
              className={STEP_TEXTAREA_CLS}
            />
          </FieldRow>
        </div>
      )}
    </StepShell>
  );
}

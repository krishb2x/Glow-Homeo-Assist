"use client";

import { Calendar } from "lucide-react";
import { ConsultationWorkspaceDrawer, DrawerHint, DrawerSectionTitle } from "../workflow/ConsultationWorkspaceRail";
import type { FollowUpStepValue } from "../workflow/steps";
import { cn } from "../../../lib/cn";

type Props = {
  open: boolean;
  onClose: () => void;
  embedded?: boolean;
  value: FollowUpStepValue;
  onChange: (next: FollowUpStepValue) => void;
  createTaskOnFinalize: boolean;
  onCreateTaskChange: (v: boolean) => void;
  readOnly?: boolean;
};

function presetDate(days: number): string {
  const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T10:00`;
}

export function ScheduleFollowUpDrawer({
  open,
  onClose,
  embedded = false,
  value,
  onChange,
  createTaskOnFinalize,
  onCreateTaskChange,
  readOnly = false
}: Props): JSX.Element | null {
  if (!embedded && !open) return null;

  const body = (
    <>
      <DrawerHint>
        Optional — set when the patient should return.
      </DrawerHint>

      <label className="mb-4 flex items-center gap-2 text-body-sm font-semibold text-hs-ink">
        <input
          type="checkbox"
          checked={value.enabled}
          onChange={(e) => onChange({ ...value, enabled: e.target.checked })}
          disabled={readOnly}
          className="h-4 w-4 rounded border-hs-border accent-hs-primary"
        />
        Schedule a follow-up visit
      </label>

      {value.enabled ? (
        <div className="space-y-4">
          <div>
            <label className="block text-caption-sm font-semibold text-hs-text-secondary">Date &amp; time</label>
            <input
              type="datetime-local"
              value={value.recommendedAt}
              onChange={(e) => onChange({ ...value, recommendedAt: e.target.value })}
              disabled={readOnly}
              className="mt-1 w-full rounded-xl border border-hs-border/40 bg-hs-cream/40 px-3 py-2 text-body-sm disabled:opacity-60"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[
                { label: "+1 wk", d: 7 },
                { label: "+2 wks", d: 14 },
                { label: "+4 wks", d: 28 }
              ].map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => onChange({ ...value, recommendedAt: presetDate(p.d) })}
                  disabled={readOnly}
                  className="rounded-full border border-hs-border/50 bg-hs-paper px-2.5 py-1 text-caption-sm font-semibold hover:border-hs-primary/30 disabled:opacity-50"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-caption-sm font-semibold text-hs-text-secondary">Reason</label>
            <input
              type="text"
              value={value.reason}
              onChange={(e) => onChange({ ...value, reason: e.target.value })}
              disabled={readOnly}
              placeholder="Review headache frequency on Nat-mur 200"
              className="mt-1 w-full rounded-xl border border-hs-border/40 bg-hs-cream/40 px-3 py-2 text-body-sm disabled:opacity-60"
            />
            <p className="mt-1.5 text-caption-sm text-hs-text-tertiary">
              Use <span className="font-semibold text-hs-ink">Follow-up</span> in the main workflow for the full plan.
            </p>
          </div>

          <label className={cn("flex items-start gap-2 rounded-xl border border-hs-border/30 bg-hs-cream/30 px-3 py-2.5 text-body-sm")}>
            <input
              type="checkbox"
              checked={createTaskOnFinalize}
              onChange={(e) => onCreateTaskChange(e.target.checked)}
              disabled={readOnly}
              className="mt-0.5 h-4 w-4 rounded border-hs-border accent-hs-primary"
            />
            <span>Create follow-up task in queue when consultation is finalized</span>
          </label>
        </div>
      ) : (
        <p className="text-body-sm text-hs-text-secondary">
          Enable scheduling above, or use the Follow-up step in the workflow.
        </p>
      )}

      <DrawerSectionTitle>Quick link</DrawerSectionTitle>
      <p className="text-caption-sm text-hs-text-tertiary">
        Follow-ups also appear on your{" "}
        <a href="/follow-ups" className="font-semibold text-hs-primary hover:underline">
          Follow-ups board
        </a>
        .
      </p>
    </>
  );

  if (embedded) {
    return <div className="px-4 py-4">{body}</div>;
  }

  return (
    <ConsultationWorkspaceDrawer open={open} title="Schedule follow-up" icon={Calendar} onClose={onClose}>
      {body}
    </ConsultationWorkspaceDrawer>
  );
}

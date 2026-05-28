"use client";

import { Heart, Plus, Trash2 } from "lucide-react";
import { CarePlanConsultationPicker } from "../../../care-plans/CarePlanConsultationPicker";
import type { CarePlanTemplateSummary } from "../../../../lib/care-plan-types";
import { StepShell, FieldRow, STEP_INPUT_CLS, STEP_TEXTAREA_CLS } from "./StepShell";
import { cn } from "../../../../lib/cn";

export type AdviceCategory = "diet" | "lifestyle" | "restriction";

export type AdviceCard = {
  id: string;
  category: AdviceCategory;
  title: string;
  detail: string;
};

export type Step07CarePlanProps = {
  plans: CarePlanTemplateSummary[];
  recentPlanIds?: string[];
  search: string;
  onSearchChange: (q: string) => void;
  selectedPlanIds: string[];
  onSelectedPlanIdsChange: (ids: string[]) => void;
  onApplyPlan: (planId: string, mode: "replace" | "append") => void;
  onMergeSelected: () => void;
  applyingPlan?: boolean;
};

type Props = {
  stepNumber: number;
  cards: AdviceCard[];
  onChange: (next: AdviceCard[]) => void;
  readOnly?: boolean;
  carePlan?: Step07CarePlanProps;
};

const CATEGORY_STYLE: Record<AdviceCategory, string> = {
  diet: "border-emerald-200/70 bg-emerald-50/20 text-emerald-900 shadow-[0_1px_2px_rgba(16,185,129,0.03)] hover:border-emerald-300",
  lifestyle: "border-sky-200/70 bg-sky-50/20 text-sky-900 shadow-[0_1px_2px_rgba(56,189,248,0.03)] hover:border-sky-300",
  restriction: "border-amber-200/70 bg-amber-50/20 text-amber-900 shadow-[0_1px_2px_rgba(245,158,11,0.03)] hover:border-amber-300"
};

const CATEGORY_LABEL: Record<AdviceCategory, string> = {
  diet: "Diet Recommendation",
  lifestyle: "Lifestyle Guidance",
  restriction: "Clinical Restriction"
};

const CATEGORY_INDICATOR: Record<AdviceCategory, string> = {
  diet: "bg-emerald-500",
  lifestyle: "bg-sky-500",
  restriction: "bg-amber-500"
};

function randomId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function Step07Advice({
  stepNumber,
  cards,
  onChange,
  readOnly = false,
  carePlan
}: Props): JSX.Element {
  const update = (id: string, patch: Partial<AdviceCard>): void =>
    onChange(cards.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const remove = (id: string): void => onChange(cards.filter((c) => c.id !== id));

  const add = (category: AdviceCategory): void =>
    onChange([...cards, { id: randomId(), category, title: "", detail: "" }]);

  return (
    <div className="space-y-6">
      {carePlan && !readOnly ? (
        <CarePlanConsultationPicker
          plans={carePlan.plans}
          recentPlanIds={carePlan.recentPlanIds}
          search={carePlan.search}
          onSearchChange={carePlan.onSearchChange}
          selectedIds={carePlan.selectedPlanIds}
          onSelectedIdsChange={carePlan.onSelectedPlanIdsChange}
          onApplyPlan={carePlan.onApplyPlan}
          onMergeSelected={carePlan.onMergeSelected}
          disabled={readOnly}
          applying={carePlan.applyingPlan}
        />
      ) : null}

      <StepShell
        stepNumber={stepNumber}
        icon={Heart}
        title="Advice for this visit"
        description="Apply care plans above, then refine each card for this patient. Saved to the chart and prescription."
        actions={
          readOnly ? null : (
            <div className="flex flex-wrap items-center gap-2">
              {(["diet", "lifestyle", "restriction"] as AdviceCategory[]).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => add(cat)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-caption-sm font-semibold transition active:scale-[0.98] shadow-sm bg-white hover:bg-neutral-50 hover:text-hs-primary border-hs-border/40 text-hs-text-secondary"
                  )}
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
          )
        }
      >
        {cards.length === 0 ? (
          <p className="rounded-xl border border-dashed border-hs-border/40 bg-hs-cream/30 px-3 py-6 text-center text-body-sm text-hs-text-tertiary">
            No advice yet. Choose a care plan from the library above, or add a custom card.
          </p>
        ) : (
          <ul className="grid gap-5 md:grid-cols-2">
            {cards.map((c) => (
              <li
                key={c.id}
                className={cn(
                  "rounded-2xl border p-5 transition duration-200 flex flex-col justify-between space-y-4",
                  CATEGORY_STYLE[c.category]
                )}
              >
                <div>
                  <div className="mb-3 flex items-center justify-between gap-2 border-b border-hs-border/10 pb-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 select-none">
                      <span className={cn("h-1.5 w-1.5 rounded-full", CATEGORY_INDICATOR[c.category])} />
                      {CATEGORY_LABEL[c.category]}
                    </span>
                    {readOnly ? null : (
                      <button
                        type="button"
                        onClick={() => remove(c.id)}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-lg text-hs-text-tertiary hover:bg-rose-50 hover:text-rose-600 transition"
                        title="Remove card"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    <FieldRow label="Recommendation Title">
                      <input
                        type="text"
                        value={c.title}
                        onChange={(e) => update(c.id, { title: e.target.value })}
                        disabled={readOnly}
                        placeholder={
                          c.category === "diet"
                            ? "e.g. Light, warm dinners; avoid sour foods"
                            : c.category === "lifestyle"
                              ? "e.g. 20-min walk after dinner; early bedtime"
                              : "e.g. Avoid coffee & strong perfumes during remedy action"
                        }
                        className={cn(STEP_INPUT_CLS, "text-sm bg-white")}
                      />
                    </FieldRow>

                    <FieldRow label="Additional Instructions (Detail)">
                      <textarea
                        rows={3}
                        value={c.detail}
                        onChange={(e) => update(c.id, { detail: e.target.value })}
                        disabled={readOnly}
                        placeholder="e.g. Specific details, timings, or suggestions for the patient."
                        className={cn(STEP_TEXTAREA_CLS, "text-sm bg-white min-h-[5.5rem] leading-relaxed resize-none")}
                      />
                    </FieldRow>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </StepShell>
    </div>
  );
}

"use client";

import { Heart, Plus, Trash2 } from "lucide-react";
import { StepShell, FieldRow, STEP_INPUT_CLS, STEP_TEXTAREA_CLS } from "./StepShell";
import { cn } from "../../../../lib/cn";

export type AdviceCategory = "diet" | "lifestyle" | "restriction";

export type AdviceCard = {
  id: string;
  category: AdviceCategory;
  title: string;
  detail: string;
};

type Props = {
  stepNumber: number;
  cards: AdviceCard[];
  onChange: (next: AdviceCard[]) => void;
  readOnly?: boolean;
};

const CATEGORY_STYLE: Record<AdviceCategory, string> = {
  diet: "border-emerald-200/70 bg-emerald-50/70 text-emerald-900",
  lifestyle: "border-sky-200/70 bg-sky-50/70 text-sky-900",
  restriction: "border-amber-200/70 bg-amber-50/70 text-amber-900"
};

const CATEGORY_LABEL: Record<AdviceCategory, string> = {
  diet: "Diet",
  lifestyle: "Lifestyle",
  restriction: "Restriction"
};

function randomId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function Step07Advice({ stepNumber, cards, onChange, readOnly = false }: Props): JSX.Element {
  const update = (id: string, patch: Partial<AdviceCard>): void =>
    onChange(cards.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const remove = (id: string): void => onChange(cards.filter((c) => c.id !== id));

  const add = (category: AdviceCategory): void =>
    onChange([...cards, { id: randomId(), category, title: "", detail: "" }]);

  return (
    <StepShell
      stepNumber={stepNumber}
      icon={Heart}
      title="Advice"
      description="Diet, lifestyle, and restrictions communicated to the patient."
      actions={
        readOnly ? null : (
          <div className="flex flex-wrap items-center gap-2">
            {(["diet", "lifestyle", "restriction"] as AdviceCategory[]).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => add(cat)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-caption-sm font-semibold transition",
                  CATEGORY_STYLE[cat]
                )}
              >
                <Plus className="h-3 w-3" aria-hidden />
                {CATEGORY_LABEL[cat]}
              </button>
            ))}
          </div>
        )
      }
    >
      {cards.length === 0 ? (
        <p className="rounded-xl border border-dashed border-hs-border/40 bg-hs-cream/30 px-3 py-4 text-body-sm text-hs-text-tertiary">
          No advice cards yet. {readOnly ? null : "Pick a category above to add one."}
        </p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {cards.map((c) => (
            <li
              key={c.id}
              className={cn(
                "rounded-2xl border p-3 transition",
                CATEGORY_STYLE[c.category]
              )}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-caption-sm font-bold uppercase tracking-wide">
                  {CATEGORY_LABEL[c.category]}
                </span>
                {readOnly ? null : (
                  <button
                    type="button"
                    onClick={() => remove(c.id)}
                    className="inline-flex items-center gap-1 rounded-md border border-rose-200/60 bg-rose-50/60 px-1.5 py-0.5 text-caption-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                  >
                    <Trash2 className="h-3 w-3" aria-hidden />
                    Remove
                  </button>
                )}
              </div>
              <FieldRow label="Title">
                <input
                  type="text"
                  value={c.title}
                  onChange={(e) => update(c.id, { title: e.target.value })}
                  disabled={readOnly}
                  placeholder={
                    c.category === "diet"
                      ? "e.g. Light, warm dinners"
                      : c.category === "lifestyle"
                        ? "e.g. 20-min walk after dinner"
                        : "e.g. Avoid coffee & strong perfumes"
                  }
                  className={STEP_INPUT_CLS}
                />
              </FieldRow>
              <FieldRow label="Detail" className="mt-2">
                <textarea
                  rows={3}
                  value={c.detail}
                  onChange={(e) => update(c.id, { detail: e.target.value })}
                  disabled={readOnly}
                  placeholder="Optional — what the patient should do specifically."
                  className={STEP_TEXTAREA_CLS}
                />
              </FieldRow>
            </li>
          ))}
        </ul>
      )}
    </StepShell>
  );
}

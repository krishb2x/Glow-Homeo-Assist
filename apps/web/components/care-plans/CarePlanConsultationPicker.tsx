"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BookHeart, Check, Layers, Plus, Search, Star } from "lucide-react";
import type { CarePlanTemplateSummary } from "../../lib/care-plan-types";
import { CARE_PLAN_CATEGORY_LABELS, type CarePlanPrimaryCategory } from "../../lib/care-plan-types";
import { cn } from "../../lib/cn";
import { DS_BTN_PRIMARY, DS_BTN_SECONDARY, DS_FIELD_SEARCH, DS_SURFACE_PANEL } from "../../lib/ds-classes";

export type CarePlanConsultationPickerProps = {
  plans: CarePlanTemplateSummary[];
  recentPlanIds?: string[];
  search: string;
  onSearchChange: (q: string) => void;
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  onApplyPlan: (planId: string, mode: "replace" | "append") => void;
  onMergeSelected: () => void;
  disabled?: boolean;
  applying?: boolean;
};

export function CarePlanConsultationPicker({
  plans,
  recentPlanIds = [],
  search,
  onSearchChange,
  selectedIds,
  onSelectedIdsChange,
  onApplyPlan,
  onMergeSelected,
  disabled = false,
  applying = false
}: CarePlanConsultationPickerProps): JSX.Element {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return plans.filter((p) => {
      if (categoryFilter !== "all" && p.primaryCategory !== categoryFilter) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        (p.summary ?? "").toLowerCase().includes(q) ||
        p.diseaseTags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [plans, search, categoryFilter]);

  const recentPlans = useMemo(() => {
    const order = new Map(recentPlanIds.map((id, i) => [id, i]));
    return plans
      .filter((p) => order.has(p.id))
      .sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99))
      .slice(0, 6);
  }, [plans, recentPlanIds]);

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectedIdsChange(selectedIds.filter((x) => x !== id));
    } else {
      onSelectedIdsChange([...selectedIds, id]);
    }
  };

  return (
    <div className={cn(DS_SURFACE_PANEL, "overflow-hidden border-hs-primary/15")}>
      <div className="border-b border-hs-border/20 bg-gradient-to-r from-hs-primary-very-light/50 to-hs-paper px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-body-sm font-semibold text-hs-ink flex items-center gap-2">
              <BookHeart className="h-4 w-4 text-hs-primary" aria-hidden />
              Care plan library
            </p>
            <p className="mt-0.5 text-caption-sm text-hs-text-secondary">
              Select one or more plans — applied as structured advice cards below.
            </p>
          </div>
          <Link
            href="/care-plan-library"
            target="_blank"
            className={cn(DS_BTN_SECONDARY, "text-caption-sm py-2")}
          >
            Manage library
          </Link>
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-hs-text-tertiary" aria-hidden />
            <input
              className={cn(DS_FIELD_SEARCH, "py-2")}
              placeholder="Search by name, disease, or symptom…"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              disabled={disabled}
            />
          </div>
          <select
            className="rounded-xl border border-hs-border/40 bg-white px-3 py-2 text-caption-sm text-hs-ink"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            disabled={disabled}
          >
            <option value="all">All types</option>
            {(Object.keys(CARE_PLAN_CATEGORY_LABELS) as CarePlanPrimaryCategory[]).map((k) => (
              <option key={k} value={k}>
                {CARE_PLAN_CATEGORY_LABELS[k]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {recentPlans.length > 0 && !search.trim() ? (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-hs-text-tertiary mb-2">Recent</p>
            <div className="flex flex-wrap gap-2">
              {recentPlans.map((p) => (
                <PlanChip
                  key={`recent-${p.id}`}
                  plan={p}
                  selected={selectedIds.includes(p.id)}
                  disabled={disabled || applying}
                  onSelect={() => toggleSelect(p.id)}
                  onApply={() => onApplyPlan(p.id, "append")}
                />
              ))}
            </div>
          </div>
        ) : null}

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-hs-border/40 bg-hs-cream/30 px-4 py-8 text-center">
            <p className="text-body-sm text-hs-text-secondary">No care plans match your search.</p>
            <Link href="/care-plan-library" className="mt-2 inline-block text-caption-sm font-semibold text-hs-primary hover:underline">
              Create a plan in the library →
            </Link>
          </div>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {filtered.map((p) => (
              <li key={p.id}>
                <PlanRow
                  plan={p}
                  selected={selectedIds.includes(p.id)}
                  disabled={disabled || applying}
                  onSelect={() => toggleSelect(p.id)}
                  onApplyReplace={() => onApplyPlan(p.id, "replace")}
                  onApplyAppend={() => onApplyPlan(p.id, "append")}
                />
              </li>
            ))}
          </ul>
        )}

        {selectedIds.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-hs-primary/25 bg-hs-primary-very-light/40 px-3 py-3">
            <Layers className="h-4 w-4 text-hs-primary shrink-0" aria-hidden />
            <span className="text-caption-sm font-medium text-hs-ink flex-1">
              {selectedIds.length} plan{selectedIds.length > 1 ? "s" : ""} selected
            </span>
            <button
              type="button"
              disabled={disabled || applying}
              onClick={() => onSelectedIdsChange([])}
              className="text-caption-sm text-hs-text-secondary hover:text-hs-ink"
            >
              Clear
            </button>
            <button
              type="button"
              disabled={disabled || applying}
              onClick={onMergeSelected}
              className={cn(DS_BTN_PRIMARY, "py-2 text-caption-sm")}
            >
              Apply merged selection
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PlanChip({
  plan,
  selected,
  disabled,
  onSelect,
  onApply
}: {
  plan: CarePlanTemplateSummary;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
  onApply: () => void;
}): JSX.Element {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border border-hs-border/40 bg-white pr-0.5 shadow-sm">
      <button
        type="button"
        disabled={disabled}
        onClick={onSelect}
        className={cn(
          "rounded-l-full pl-3 pr-2 py-1.5 text-caption-sm font-semibold",
          selected ? "bg-hs-primary text-white" : "text-hs-ink hover:bg-hs-cream"
        )}
      >
        {plan.title}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onApply}
        title="Add to visit"
        className="rounded-full p-1 text-hs-primary hover:bg-hs-primary-very-light disabled:opacity-40"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function PlanRow({
  plan,
  selected,
  disabled,
  onSelect,
  onApplyReplace,
  onApplyAppend
}: {
  plan: CarePlanTemplateSummary;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
  onApplyReplace: () => void;
  onApplyAppend: () => void;
}): JSX.Element {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border p-3 transition",
        selected ? "border-hs-primary/50 bg-hs-primary-very-light/30 ring-1 ring-hs-primary/20" : "border-hs-border/35 bg-white hover:border-hs-primary/25"
      )}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={onSelect}
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
          selected ? "border-hs-primary bg-hs-primary text-white" : "border-hs-border/60 bg-white"
        )}
        aria-label={selected ? "Deselect" : "Select for merge"}
      >
        {selected ? <Check className="h-3 w-3" /> : null}
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-body-sm font-semibold text-hs-ink truncate">{plan.title}</p>
        {plan.summary ? (
          <p className="mt-0.5 text-caption-sm text-hs-text-secondary line-clamp-2">{plan.summary}</p>
        ) : null}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] text-hs-text-tertiary">
          <span>{plan.blockCount} sections</span>
          {plan.isFavorite ? <Star className="h-3 w-3 fill-amber-400 text-amber-500" /> : null}
          {plan.diseaseTags[0] ? <span className="rounded-full bg-hs-cream px-1.5 py-0.5">{plan.diseaseTags[0]}</span> : null}
        </div>
      </div>
      <div className="flex shrink-0 flex-col gap-1">
        <button
          type="button"
          disabled={disabled}
          onClick={onApplyAppend}
          className="rounded-lg bg-hs-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white disabled:opacity-40"
        >
          Add
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onApplyReplace}
          className="rounded-lg border border-hs-border/50 px-2.5 py-1 text-[10px] font-semibold text-hs-text-secondary hover:bg-hs-cream disabled:opacity-40"
        >
          Replace
        </button>
      </div>
    </div>
  );
}

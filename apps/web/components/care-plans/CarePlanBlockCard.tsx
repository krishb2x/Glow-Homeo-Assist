"use client";

import { ChevronDown, ChevronUp, GripVertical, Plus, Trash2 } from "lucide-react";
import type { CarePlanBlock, CarePlanBlockType } from "../../lib/care-plan-types";
import { CARE_PLAN_BLOCK_LABELS, newListItem } from "../../lib/care-plan-types";
import { cn } from "../../lib/cn";
import { DS_FIELD } from "../../lib/ds-classes";

type Props = {
  block: CarePlanBlock;
  expanded: boolean;
  onToggle: () => void;
  onChange: (next: CarePlanBlock) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
};

export function CarePlanBlockCard({
  block,
  expanded,
  onToggle,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown
}: Props): JSX.Element {
  const payload = block.payload ?? {};
  const items = payload.items ?? [];
  const faqs = payload.faqs ?? [];
  const tasks = payload.tasks ?? [];
  const isFaq = block.blockType === "faqs";
  const isTasks = block.blockType === "wellness_tasks";

  return (
    <div className="rounded-2xl border border-hs-border/40 bg-hs-paper shadow-ds-sm overflow-hidden">
      <div className="flex items-center gap-2 border-b border-hs-border/20 bg-hs-cream/30 px-3 py-2.5">
        <GripVertical className="h-4 w-4 shrink-0 text-hs-text-tertiary" aria-hidden />
        <button type="button" onClick={onToggle} className="min-w-0 flex-1 text-left">
          <p className="text-caption-sm font-semibold text-hs-ink truncate">
            {block.title || CARE_PLAN_BLOCK_LABELS[block.blockType as CarePlanBlockType]}
          </p>
          <p className="text-[10px] uppercase tracking-wide text-hs-text-tertiary">
            {CARE_PLAN_BLOCK_LABELS[block.blockType as CarePlanBlockType]}
          </p>
        </button>
        <div className="flex items-center gap-0.5">
          <button type="button" onClick={onMoveUp} disabled={!canMoveUp} className="p-1 text-hs-text-tertiary disabled:opacity-30" title="Move up">
            <ChevronUp className="h-4 w-4" />
          </button>
          <button type="button" onClick={onMoveDown} disabled={!canMoveDown} className="p-1 text-hs-text-tertiary disabled:opacity-30" title="Move down">
            <ChevronDown className="h-4 w-4" />
          </button>
          <button type="button" onClick={onRemove} className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg" title="Remove block">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="space-y-3 p-4">
          <label className="block">
            <span className="text-caption-sm font-medium text-hs-text-secondary">Section title</span>
            <input
              className={cn(DS_FIELD, "mt-1")}
              value={block.title}
              onChange={(e) => onChange({ ...block, title: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="text-caption-sm font-medium text-hs-text-secondary">Introduction</span>
            <textarea
              className={cn(DS_FIELD, "mt-1 min-h-[4rem] resize-y")}
              value={payload.intro ?? ""}
              onChange={(e) => onChange({ ...block, payload: { ...payload, intro: e.target.value } })}
              rows={2}
            />
          </label>

          {isFaq ? (
            <div className="space-y-2">
              <p className="text-caption-sm font-semibold text-hs-ink">Questions</p>
              {faqs.map((f, i) => (
                <div key={f.id} className="rounded-xl border border-hs-border/30 p-3 space-y-2">
                  <input
                    className={DS_FIELD}
                    placeholder="Question"
                    value={f.question}
                    onChange={(e) => {
                      const next = [...faqs];
                      next[i] = { ...f, question: e.target.value };
                      onChange({ ...block, payload: { ...payload, faqs: next } });
                    }}
                  />
                  <textarea
                    className={cn(DS_FIELD, "min-h-[3rem]")}
                    placeholder="Answer"
                    value={f.answer}
                    onChange={(e) => {
                      const next = [...faqs];
                      next[i] = { ...f, answer: e.target.value };
                      onChange({ ...block, payload: { ...payload, faqs: next } });
                    }}
                  />
                  <button
                    type="button"
                    className="text-caption-sm text-rose-600"
                    onClick={() =>
                      onChange({ ...block, payload: { ...payload, faqs: faqs.filter((x) => x.id !== f.id) } })
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="inline-flex items-center gap-1 text-caption-sm font-semibold text-hs-primary"
                onClick={() =>
                  onChange({
                    ...block,
                    payload: {
                      ...payload,
                      faqs: [...faqs, { id: crypto.randomUUID(), question: "", answer: "" }]
                    }
                  })
                }
              >
                <Plus className="h-3.5 w-3.5" /> Add FAQ
              </button>
            </div>
          ) : isTasks ? (
            <div className="space-y-2">
              <p className="text-caption-sm font-semibold text-hs-ink">Tasks</p>
              {tasks.map((t, i) => (
                <div key={t.id} className="rounded-xl border border-hs-border/30 p-3 space-y-2">
                  <input
                    className={DS_FIELD}
                    placeholder="Task title"
                    value={t.title}
                    onChange={(e) => {
                      const next = [...tasks];
                      next[i] = { ...t, title: e.target.value };
                      onChange({ ...block, payload: { ...payload, tasks: next } });
                    }}
                  />
                  <input
                    className={DS_FIELD}
                    placeholder="Frequency (e.g. daily)"
                    value={t.frequency ?? ""}
                    onChange={(e) => {
                      const next = [...tasks];
                      next[i] = { ...t, frequency: e.target.value };
                      onChange({ ...block, payload: { ...payload, tasks: next } });
                    }}
                  />
                  <button
                    type="button"
                    className="text-caption-sm text-rose-600"
                    onClick={() =>
                      onChange({ ...block, payload: { ...payload, tasks: tasks.filter((x) => x.id !== t.id) } })
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="inline-flex items-center gap-1 text-caption-sm font-semibold text-hs-primary"
                onClick={() =>
                  onChange({
                    ...block,
                    payload: {
                      ...payload,
                      tasks: [...tasks, { id: crypto.randomUUID(), title: "" }]
                    }
                  })
                }
              >
                <Plus className="h-3.5 w-3.5" /> Add task
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-caption-sm font-semibold text-hs-ink">Bullet points</p>
              {items.map((it, i) => (
                <div key={it.id} className="flex gap-2">
                  <input
                    className={cn(DS_FIELD, "flex-1")}
                    placeholder="Guidance item"
                    value={it.text}
                    onChange={(e) => {
                      const next = [...items];
                      next[i] = { ...it, text: e.target.value };
                      onChange({ ...block, payload: { ...payload, items: next } });
                    }}
                  />
                  <button
                    type="button"
                    className="shrink-0 px-2 text-rose-600"
                    onClick={() =>
                      onChange({ ...block, payload: { ...payload, items: items.filter((x) => x.id !== it.id) } })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="inline-flex items-center gap-1 text-caption-sm font-semibold text-hs-primary"
                onClick={() =>
                  onChange({ ...block, payload: { ...payload, items: [...items, newListItem()] } })
                }
              >
                <Plus className="h-3.5 w-3.5" /> Add item
              </button>
            </div>
          )}

          <label className="block">
            <span className="text-caption-sm font-medium text-hs-text-secondary">Additional notes</span>
            <textarea
              className={cn(DS_FIELD, "mt-1 min-h-[3rem]")}
              value={payload.body ?? ""}
              onChange={(e) => onChange({ ...block, payload: { ...payload, body: e.target.value } })}
              rows={2}
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}

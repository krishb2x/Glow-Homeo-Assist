"use client";

import { useState } from "react";
import { Plus, X, Search, List } from "lucide-react";
import { StepShell, FieldRow } from "./StepShell";
import { cn } from "../../../../lib/cn";

export type RubricEntry = {
  id: string;
  chapter: string;
  rubric: string;
  intensity: number;
};

type Step05AnalysisProps = {
  consultationId?: string;
  stepNumber: number;
  value?: RubricEntry[];
  onChange: (val: RubricEntry[]) => void;
  onAcceptRemedy?: (name: string) => void;
};

const COMMON_CHAPTERS = ["MIND", "GENERALS", "STOMACH", "HEAD", "ABDOMEN", "SKIN"];

import { Loader2, Sparkles, AlertCircle } from "lucide-react";
import { triggerAiRepertorize, type RepertorizationOutput } from "../../../../lib/scribe-api";

export function Step05Analysis({ consultationId, stepNumber, value = [], onChange, onAcceptRemedy }: Step05AnalysisProps) {
  const [chapterInput, setChapterInput] = useState("");
  const [rubricInput, setRubricInput] = useState("");
  const [intensityInput, setIntensityInput] = useState<number>(1);

  const [repLoading, setRepLoading] = useState(false);
  const [repError, setRepError] = useState<string | null>(null);
  const [repResults, setRepResults] = useState<RepertorizationOutput | null>(null);

  const handleRepertorize = async () => {
    if (!consultationId || value.length === 0) return;
    setRepLoading(true);
    setRepError(null);
    try {
      const res = await triggerAiRepertorize(consultationId, value);
      setRepResults(res);
    } catch (e) {
      setRepError(e instanceof Error ? e.message : "Failed to repertorize");
    } finally {
      setRepLoading(false);
    }
  };

  const handleAdd = () => {
    if (!chapterInput.trim() || !rubricInput.trim()) return;

    const newEntry: RubricEntry = {
      id: crypto.randomUUID(),
      chapter: chapterInput.trim().toUpperCase(),
      rubric: rubricInput.trim(),
      intensity: intensityInput
    };

    onChange([...value, newEntry]);
    setChapterInput("");
    setRubricInput("");
    setIntensityInput(1);
  };

  const handleRemove = (id: string) => {
    onChange(value.filter((r) => r.id !== id));
  };

  return (
    <StepShell
      stepNumber={stepNumber}
      icon={List}
      title="Repertorization Analysis"
      description="Select homeopathic rubrics to build the case foundation"
    >
      {/* Rubric Input Section */}
      <FieldRow label="Add Rubric" hint="Enter the chapter and rubric name, then assign an intensity from 1 (ordinary) to 4 (keynote)">
        <div className="flex flex-col gap-3 rounded-xl border border-hs-border/40 bg-hs-cream/30 p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-semibold text-hs-text-secondary uppercase">Chapter</label>
              <input
                type="text"
                placeholder="e.g. MIND"
                value={chapterInput}
                onChange={(e) => setChapterInput(e.target.value)}
                className="w-full rounded-lg border border-hs-border/60 px-3 py-2 text-sm text-hs-ink shadow-sm focus:border-hs-primary focus:outline-none focus:ring-1 focus:ring-hs-primary"
                list="chapters-list"
              />
              <datalist id="chapters-list">
                {COMMON_CHAPTERS.map(ch => <option key={ch} value={ch} />)}
              </datalist>
            </div>
            <div className="flex-[2]">
              <label className="mb-1 block text-xs font-semibold text-hs-text-secondary uppercase">Rubric</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-hs-text-tertiary" />
                <input
                  type="text"
                  placeholder="e.g. ANXIETY - health, about"
                  value={rubricInput}
                  onChange={(e) => setRubricInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAdd();
                    }
                  }}
                  className="w-full rounded-lg border border-hs-border/60 pl-9 pr-3 py-2 text-sm text-hs-ink shadow-sm focus:border-hs-primary focus:outline-none focus:ring-1 focus:ring-hs-primary"
                />
              </div>
            </div>
            <div className="w-24">
              <label className="mb-1 block text-xs font-semibold text-hs-text-secondary uppercase">Intensity</label>
              <select
                value={intensityInput}
                onChange={(e) => setIntensityInput(Number(e.target.value))}
                className="w-full rounded-lg border border-hs-border/60 px-3 py-2 text-sm text-hs-ink shadow-sm focus:border-hs-primary focus:outline-none focus:ring-1 focus:ring-hs-primary bg-white"
              >
                <option value={1}>1 (Min)</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4 (Max)</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleAdd}
              disabled={!chapterInput.trim() || !rubricInput.trim()}
              className="flex items-center gap-2 rounded-lg bg-hs-primary px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-hs-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4" />
              Add Rubric
            </button>
          </div>
        </div>
      </FieldRow>

      {/* Selected Rubrics List */}
      <FieldRow label="Selected Rubrics" hint="These rubrics will be used for repertorization">
        {value.length === 0 ? (
          <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-hs-border/60 bg-hs-cream/10 text-sm text-hs-text-tertiary">
            No rubrics added yet.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {value.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between rounded-lg border border-hs-border/40 bg-white p-3 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-100 text-sm font-bold text-indigo-700">
                    {entry.intensity}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold uppercase tracking-wide text-hs-text-secondary">
                      {entry.chapter}
                    </span>
                    <span className="text-sm font-medium text-hs-ink">
                      {entry.rubric}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(entry.id)}
                  className="rounded-md p-1.5 text-hs-text-tertiary hover:bg-rose-50 hover:text-rose-600 transition"
                  title="Remove rubric"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </FieldRow>

      {/* AI Repertorization Engine */}
      <FieldRow label="Repertorization Engine" hint="Analyze selected rubrics using AI to find the most indicated remedies">
        <div className="flex flex-col gap-4">
          <div>
            <button
              onClick={handleRepertorize}
              disabled={value.length === 0 || repLoading}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {repLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {repLoading ? "Analyzing Rubrics..." : "AI Repertorize"}
            </button>
          </div>

          {repError && (
            <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
              <p>{repError}</p>
            </div>
          )}

          {repResults && repResults.remedies.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-hs-border/40 bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-hs-cream/30 text-xs uppercase tracking-wider text-hs-text-secondary border-b border-hs-border/40">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Remedy</th>
                    <th className="px-4 py-3 font-semibold">Score</th>
                    <th className="px-4 py-3 font-semibold">Matching Rubrics</th>
                    <th className="px-4 py-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hs-border/20">
                  {repResults.remedies.map((rem, idx) => (
                    <tr key={idx} className="hover:bg-hs-cream/10 transition">
                      <td className="px-4 py-3 font-bold text-hs-ink">{rem.name}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                          {rem.score}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {rem.matchingRubrics.map((r, ri) => (
                            <span key={ri} className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-hs-text-secondary">
                              {r}
                            </span>
                          ))}
                        </div>
                        <p className="mt-1.5 text-xs text-hs-text-tertiary">{rem.rationale}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {onAcceptRemedy && (
                          <button
                            onClick={() => onAcceptRemedy(rem.name)}
                            className="rounded-lg bg-hs-primary/10 px-3 py-1.5 text-xs font-bold text-hs-primary hover:bg-hs-primary/20 transition"
                          >
                            Add to Rx
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </FieldRow>
    </StepShell>
  );
}

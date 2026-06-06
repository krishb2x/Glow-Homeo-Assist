"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Check, X, Edit2, Loader2, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "../../../lib/cn";
import type { ScribeAnalysisOutput, ScribeSection } from "../../../lib/scribe-api";

type AiReviewPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  loading: boolean;
  error: string | null;
  result: ScribeAnalysisOutput | null;
  onAcceptSection: (section: ScribeSection, text: string) => void;
  onAcceptAll: () => void;
  onDiscardAll: () => void;
  onAcceptRemedy?: (name: string) => void;
  onAcceptRubric?: (entry: { chapter: string; rubric: string; intensity: number }) => void;
};

const SECTIONS: { key: ScribeSection; label: string }[] = [
  { key: "chiefComplaints", label: "Chief Complaints" },
  { key: "timeline", label: "Timeline & Progression" },
  { key: "emotionalState", label: "Mental / Emotional State" },
  { key: "physicalSymptoms", label: "Physical Symptoms" },
  { key: "modalities", label: "Modalities" },
  { key: "observations", label: "Doctor's Observations" },
  { key: "diagnosisThinking", label: "Differential Thinking" },
  { key: "followUpAssessment", label: "Follow-Up Assessment" }
];

export function AiReviewPanel({
  isOpen,
  onClose,
  loading,
  error,
  result,
  onAcceptSection,
  onAcceptAll,
  onDiscardAll,
  onAcceptRemedy,
  onAcceptRubric
}: AiReviewPanelProps): JSX.Element {
  const [acceptedSections, setAcceptedSections] = useState<Set<ScribeSection>>(new Set());
  const [editingSection, setEditingSection] = useState<ScribeSection | null>(null);
  const [editValue, setEditValue] = useState("");

  // Reset local state when a new result arrives
  useEffect(() => {
    setAcceptedSections(new Set());
    setEditingSection(null);
  }, [result]);

  const handleAccept = (section: ScribeSection, text: string) => {
    onAcceptSection(section, text);
    setAcceptedSections((prev) => new Set(prev).add(section));
    setEditingSection(null);
  };

  const handleSaveEdit = () => {
    if (editingSection) {
      handleAccept(editingSection, editValue);
    }
  };

  if (!isOpen) return <></>;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 400 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 400 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed inset-y-0 right-0 z-50 w-full max-w-lg border-l border-hs-border/40 bg-hs-paper shadow-2xl sm:w-[500px]"
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-hs-border/20 bg-hs-primary-very-light/30 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-hs-primary/10 text-hs-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-heading text-body-lg font-bold text-hs-ink">AI Analysis</h2>
                <p className="text-caption-sm text-hs-text-secondary">Review and accept suggestions</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-hs-text-secondary hover:bg-hs-cream/60 hover:text-hs-ink"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex h-full flex-col items-center justify-center space-y-4 text-hs-text-secondary">
                <Loader2 className="h-8 w-8 animate-spin text-hs-primary" />
                <p className="text-body-sm font-medium">Analyzing clinical notes...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center space-y-4 rounded-xl border border-rose-200 bg-rose-50 p-6 text-center">
                <AlertCircle className="h-8 w-8 text-rose-600" />
                <p className="text-body-sm font-medium text-rose-900">{error}</p>
                <button
                  onClick={onClose}
                  className="rounded-lg bg-rose-100 px-4 py-2 text-caption-sm font-bold text-rose-700 hover:bg-rose-200"
                >
                  Dismiss
                </button>
              </div>
            ) : result ? (
              <div className="space-y-6">
                {/* Optional context elements */}
                {result.keySymptoms && result.keySymptoms.length > 0 && (
                  <div className="rounded-xl border border-hs-primary/20 bg-hs-primary-very-light/20 p-4">
                    <h3 className="text-caption-sm font-bold uppercase tracking-wider text-hs-primary">Key Symptoms</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {result.keySymptoms.map((sym: string, i: number) => (
                        <span key={i} className="rounded-full border border-hs-primary/20 bg-white px-2.5 py-1 text-xs font-semibold text-hs-ink">
                          {sym}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {result.miasmaticHints && (
                  <div className="rounded-xl border border-hs-border/20 bg-hs-cream/40 p-4">
                    <h3 className="text-caption-sm font-bold uppercase tracking-wider text-hs-text-tertiary">Miasmatic Hints</h3>
                    <p className="mt-1 text-body-sm text-hs-text-secondary">{result.miasmaticHints}</p>
                  </div>
                )}

                {/* Remedy Suggestions */}
                {result.remedySuggestions && result.remedySuggestions.length > 0 && (
                  <div className="space-y-3 rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
                    <h3 className="text-caption-sm font-bold uppercase tracking-wider text-indigo-700">Remedy Suggestions</h3>
                    <div className="space-y-2">
                      {result.remedySuggestions.map((rem: { name: string; rationale: string; confidence: string }, i: number) => (
                        <div key={i} className="rounded-lg border border-indigo-100 bg-white p-3 shadow-sm">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-hs-ink">{rem.name}</span>
                                <span className={cn(
                                  "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                                  rem.confidence === "high" ? "bg-emerald-100 text-emerald-700" :
                                  rem.confidence === "medium" ? "bg-amber-100 text-amber-700" :
                                  "bg-neutral-100 text-neutral-600"
                                )}>
                                  {rem.confidence}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-hs-text-secondary">{rem.rationale}</p>
                            </div>
                            {onAcceptRemedy && (
                              <button
                                onClick={() => onAcceptRemedy(rem.name)}
                                className="shrink-0 rounded-lg bg-indigo-100 px-3 py-1.5 text-caption-sm font-bold text-indigo-700 transition hover:bg-indigo-200"
                              >
                                Add to Rx
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rubric Suggestions */}
                {result.rubricSuggestions && result.rubricSuggestions.length > 0 && (
                  <div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50/40 p-4">
                    <h3 className="text-caption-sm font-bold uppercase tracking-wider text-blue-700">Rubric Suggestions</h3>
                    <div className="space-y-2">
                      {result.rubricSuggestions.map((rubric: { chapter: string; rubric: string; intensity: number }, i: number) => (
                        <div key={i} className="flex items-center justify-between rounded-lg border border-blue-100 bg-white p-3 shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-100 text-sm font-bold text-blue-700">
                              {rubric.intensity}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold uppercase tracking-wide text-hs-text-secondary">
                                {rubric.chapter}
                              </span>
                              <span className="text-sm font-medium text-hs-ink">
                                {rubric.rubric}
                              </span>
                            </div>
                          </div>
                          {onAcceptRubric && (
                            <button
                              onClick={() => onAcceptRubric(rubric)}
                              className="shrink-0 rounded-lg bg-blue-100 px-3 py-1.5 text-caption-sm font-bold text-blue-700 transition hover:bg-blue-200"
                            >
                              Add to Analysis
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Per-section review */}
                <div className="space-y-4">
                  {SECTIONS.map(({ key, label }) => {
                    const aiText = result[key] || "";
                    if (!aiText) return null;
                    const isAccepted = acceptedSections.has(key);

                    return (
                      <div
                        key={key}
                        className={cn(
                          "overflow-hidden rounded-xl border transition-all duration-200",
                          isAccepted
                            ? "border-emerald-200 bg-emerald-50/30"
                            : "border-hs-border/40 bg-white shadow-sm hover:border-hs-primary/30"
                        )}
                      >
                        <div className="border-b border-hs-border/10 bg-hs-cream/20 px-4 py-2.5">
                          <h3 className="text-body-sm font-bold text-hs-ink">{label}</h3>
                        </div>
                        <div className="p-4">
                          {editingSection === key ? (
                            <div className="space-y-3">
                              <textarea
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                rows={5}
                                className="w-full rounded-lg border border-hs-primary/40 bg-white p-3 text-sm text-hs-ink shadow-sm focus:border-hs-primary focus:outline-none focus:ring-1 focus:ring-hs-primary"
                              />
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => setEditingSection(null)}
                                  className="rounded-lg px-3 py-1.5 text-caption-sm font-medium text-hs-text-secondary hover:bg-hs-cream/60"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={handleSaveEdit}
                                  className="rounded-lg bg-hs-primary px-3 py-1.5 text-caption-sm font-bold text-white shadow-sm hover:bg-hs-primary-dark"
                                >
                                  Save & Accept
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <p className="whitespace-pre-wrap text-sm text-hs-text-secondary">
                                {aiText}
                              </p>
                              {!isAccepted && (
                                <div className="flex items-center justify-end gap-2 border-t border-hs-border/10 pt-3">
                                  <button
                                    onClick={() => {
                                      setEditingSection(key);
                                      setEditValue(aiText);
                                    }}
                                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-caption-sm font-semibold text-hs-text-tertiary hover:bg-hs-cream/60 hover:text-hs-ink"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleAccept(key, aiText)}
                                    className="flex items-center gap-1.5 rounded-lg bg-hs-primary/10 px-3 py-1.5 text-caption-sm font-bold text-hs-primary hover:bg-hs-primary/20"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                    Accept
                                  </button>
                                </div>
                              )}
                              {isAccepted && (
                                <div className="flex items-center gap-1.5 border-t border-hs-border/10 pt-3 text-caption-sm font-bold text-emerald-600">
                                  <Check className="h-4 w-4" />
                                  Accepted
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          {/* Footer Actions */}
          {!loading && !error && result && (
            <div className="border-t border-hs-border/20 bg-hs-paper px-6 py-4 shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => {
                    onDiscardAll();
                    onClose();
                  }}
                  className="rounded-xl px-4 py-2.5 text-body-sm font-bold text-hs-text-secondary hover:bg-hs-cream/60 hover:text-hs-ink"
                >
                  Discard All
                </button>
                <button
                  onClick={() => {
                    onAcceptAll();
                    onClose();
                  }}
                  className="flex items-center gap-2 rounded-xl bg-hs-primary px-6 py-2.5 text-body-sm font-bold text-white shadow-sm hover:bg-hs-primary-dark"
                >
                  <Check className="h-4 w-4" />
                  Accept All
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

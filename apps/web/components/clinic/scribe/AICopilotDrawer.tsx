"use client";

import { Loader2, Sparkles } from "lucide-react";
import {
  ConsultationWorkspaceDrawer,
  DrawerHint,
  DrawerLiveBadge,
  DrawerSectionTitle
} from "../workflow/ConsultationWorkspaceRail";
import { cn } from "../../../lib/cn";

type NoteDraft = {
  chiefComplaints: string;
  emotionalState: string;
  physicalSymptoms: string;
  modalities: string;
  timeline: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  isRecording: boolean;
  isMock: boolean;
  transcript: string;
  onTranscriptChange: (v: string) => void;
  aiDraft: NoteDraft;
  aiDraftReady: boolean;
  isGenerating: boolean;
  onGenerate: () => void;
  onInsertIntoNotes: () => void;
  /** Parsed from doctor's differential thinking — suggestion chips only. */
  differentialHints: string[];
  readOnly?: boolean;
};

export function AICopilotDrawer({
  open,
  onClose,
  isRecording,
  isMock,
  transcript,
  onTranscriptChange,
  aiDraft,
  aiDraftReady,
  isGenerating,
  onGenerate,
  onInsertIntoNotes,
  differentialHints,
  readOnly = false
}: Props): JSX.Element {
  const hasDraft =
    aiDraftReady &&
    Boolean(
      aiDraft.chiefComplaints ||
        aiDraft.emotionalState ||
        aiDraft.physicalSymptoms ||
        aiDraft.modalities ||
        aiDraft.timeline
    );

  return (
    <ConsultationWorkspaceDrawer open={open} title="AI co-pilot" icon={Sparkles} onClose={onClose}>
      <DrawerHint>
        Suggestions only — you review and insert. Alt+I toggles this panel. Alt+R starts recording from the top bar.
      </DrawerHint>

      {isMock ? (
        <p className="mb-3 rounded-xl border border-amber-200/80 bg-amber-50 px-3 py-2 text-caption-sm text-amber-950">
          Demo transcription mode — drafts are simulated until live AI is configured.
        </p>
      ) : null}

      {isRecording ? <DrawerLiveBadge label="Recording — transcript updating" /> : null}

      <DrawerSectionTitle>Live transcript</DrawerSectionTitle>
      <textarea
        value={transcript}
        onChange={(e) => onTranscriptChange(e.target.value)}
        rows={6}
        disabled={readOnly}
        placeholder="Transcript appears here while recording…"
        className="mb-4 w-full rounded-xl border border-hs-border/40 bg-hs-cream/30 px-3 py-2.5 font-mono text-caption-sm text-hs-ink focus:border-hs-primary/45 focus:outline-none focus:ring-2 focus:ring-hs-primary/15 disabled:opacity-60"
      />

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={onGenerate}
          disabled={readOnly || isGenerating || !transcript.trim()}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-hs-ink px-3 py-2 text-caption-sm font-semibold text-white disabled:opacity-50"
        >
          {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
          {isGenerating ? "Generating…" : "Draft notes"}
        </button>
      </div>

      {hasDraft ? (
        <div className="mb-4 space-y-2 rounded-xl border border-hs-primary/20 bg-hs-primary-very-light/30 p-3">
          <DrawerSectionTitle>Review draft — insert per section</DrawerSectionTitle>
          {(
            [
              ["chiefComplaints", "Chief complaints"] as const,
              ["emotionalState", "Mind / emotion"] as const,
              ["physicalSymptoms", "Physical"] as const,
              ["modalities", "Modalities"] as const,
              ["timeline", "Timeline"] as const
            ] as const
          ).map(([key, label]) =>
            aiDraft[key]?.trim() ? (
              <div key={key} className="rounded-lg border border-hs-border/30 bg-hs-paper/80 p-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-hs-text-tertiary">{label}</p>
                <p className="mt-0.5 line-clamp-3 text-caption-sm text-hs-ink">{aiDraft[key]}</p>
              </div>
            ) : null
          )}
          <button
            type="button"
            onClick={onInsertIntoNotes}
            disabled={readOnly}
            className="mt-1 w-full rounded-xl bg-hs-primary py-2 text-caption-sm font-semibold text-white disabled:opacity-50"
          >
            Insert all into case notes
          </button>
        </div>
      ) : null}

      {differentialHints.length > 0 ? (
        <>
          <DrawerSectionTitle>Differentials (from your notes)</DrawerSectionTitle>
          <ul className="flex flex-wrap gap-1.5">
            {differentialHints.map((hint) => (
              <li
                key={hint}
                className="rounded-full border border-hs-border/40 bg-hs-cream px-2.5 py-1 text-caption-sm text-hs-text-secondary"
              >
                {hint}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[10px] text-hs-text-tertiary">
            Full repertorisation ships in a later release — these are parsed from your assessment field.
          </p>
        </>
      ) : (
        <p className={cn("text-caption-sm text-hs-text-tertiary")}>
          Add differential thinking in Step 4 — Notes to see remedy hints here.
        </p>
      )}
    </ConsultationWorkspaceDrawer>
  );
}

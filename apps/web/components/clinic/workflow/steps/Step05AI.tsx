"use client";

import { AlertTriangle, Mic, Pause, Square, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { StepShell } from "./StepShell";
import { cn } from "../../../../lib/cn";

export type AIStepStatus = "idle" | "recording" | "paused" | "processing" | "ready";

type Props = {
  stepNumber: number;
  /** When false, the whole panel renders as a coming-soon note. */
  enabled: boolean;
  /** Current recorder status — emitted by `useConsultationLiveAudio`. */
  status: AIStepStatus;
  /** Live, mutable transcript text (rolling). */
  transcript: string;
  /** Number of seconds the mic has been active in this session. */
  durationSec: number;
  /** True when the API is using the deterministic mock pipeline. */
  isMock: boolean;
  /** Right-side AI co-pilot drawer slot — caller passes <AICopilotDrawer />. */
  drawerSlot?: ReactNode;
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
  onResume: () => void;
  onTranscriptChange: (next: string) => void;
};

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.max(0, sec - m * 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function Step05AI({
  stepNumber,
  enabled,
  status,
  transcript,
  durationSec,
  isMock,
  drawerSlot,
  onStart,
  onPause,
  onStop,
  onResume,
  onTranscriptChange
}: Props): JSX.Element {
  if (!enabled) {
    return (
      <StepShell
        stepNumber={stepNumber}
        icon={Zap}
        title="AI notetaker"
        description="Available on the Plus plan. Contact admin to enable."
        status="idle"
      >
        <p className="text-body-sm text-hs-text-secondary">
          The AI notetaker streams live audio to a transcription model and
          drafts structured notes the doctor reviews. Your plan does not
          currently include this feature.
        </p>
      </StepShell>
    );
  }

  const isLive = status === "recording" || status === "paused";

  return (
    <StepShell
      stepNumber={stepNumber}
      icon={Zap}
      title="AI notetaker"
      description="Live transcription — always reviewed and finalized by the doctor."
      status={isLive ? "active" : "idle"}
      actions={
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-caption-sm font-semibold",
            status === "recording"
              ? "bg-rose-100 text-rose-800"
              : status === "paused"
                ? "bg-amber-100 text-amber-900"
                : status === "processing"
                  ? "bg-sky-100 text-sky-900"
                  : status === "ready"
                    ? "bg-emerald-100 text-emerald-900"
                    : "bg-hs-cream text-hs-text-secondary"
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              status === "recording" && "animate-pulse bg-rose-600",
              status === "paused" && "bg-amber-600",
              status === "processing" && "bg-sky-600",
              status === "ready" && "bg-emerald-600",
              status === "idle" && "bg-hs-text-tertiary"
            )}
            aria-hidden
          />
          {status === "recording"
            ? `Recording · ${formatDuration(durationSec)}`
            : status === "paused"
              ? `Paused · ${formatDuration(durationSec)}`
              : status === "processing"
                ? "Processing…"
                : status === "ready"
                  ? "Draft ready"
                  : "Idle"}
        </span>
      }
    >
      {isMock ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200/70 bg-amber-50 px-3 py-2 text-caption-sm text-amber-950">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            AI provider key is not configured — running the deterministic mock pipeline. Transcript
            and drafts are placeholders only.
          </span>
        </div>
      ) : null}

      <div className={drawerSlot ? "grid gap-4 lg:grid-cols-[1fr_320px]" : ""}>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {status === "idle" || status === "ready" ? (
              <button
                type="button"
                onClick={onStart}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-caption-sm font-semibold text-white transition hover:bg-rose-700"
              >
                <Mic className="h-3.5 w-3.5" aria-hidden />
                Start recording
              </button>
            ) : null}
            {status === "recording" ? (
              <>
                <button
                  type="button"
                  onClick={onPause}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-hs-border/50 bg-hs-paper px-3 py-1.5 text-caption-sm font-semibold text-hs-ink transition hover:border-hs-primary/30"
                >
                  <Pause className="h-3.5 w-3.5" aria-hidden />
                  Pause
                </button>
                <button
                  type="button"
                  onClick={onStop}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-hs-ink px-3 py-1.5 text-caption-sm font-semibold text-white transition hover:bg-black"
                >
                  <Square className="h-3.5 w-3.5" aria-hidden />
                  Stop & draft
                </button>
              </>
            ) : null}
            {status === "paused" ? (
              <>
                <button
                  type="button"
                  onClick={onResume}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-caption-sm font-semibold text-white transition hover:bg-rose-700"
                >
                  <Mic className="h-3.5 w-3.5" aria-hidden />
                  Resume
                </button>
                <button
                  type="button"
                  onClick={onStop}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-hs-ink px-3 py-1.5 text-caption-sm font-semibold text-white transition hover:bg-black"
                >
                  <Square className="h-3.5 w-3.5" aria-hidden />
                  Stop & draft
                </button>
              </>
            ) : null}
          </div>

          <label className="block text-caption-sm font-semibold text-hs-text-secondary">
            Live transcript
          </label>
          <textarea
            value={transcript}
            onChange={(e) => onTranscriptChange(e.target.value)}
            rows={8}
            placeholder="Press “Start recording” — partial transcript appears here. You can edit before drafting notes."
            className="w-full rounded-xl border border-hs-border/40 bg-hs-cream/30 px-3 py-2.5 font-mono text-body-sm text-hs-ink placeholder:text-hs-text-tertiary/70 focus:border-hs-primary/45 focus:outline-none focus:ring-2 focus:ring-hs-primary/15"
          />
          <p className="text-caption-sm text-hs-text-tertiary">
            AI does not finalize notes. After stopping, review the draft below and Insert into Notes.
          </p>
        </div>

        {drawerSlot ? (
          <aside className="rounded-xl border border-hs-border/30 bg-hs-cream/30 p-3">{drawerSlot}</aside>
        ) : null}
      </div>
    </StepShell>
  );
}

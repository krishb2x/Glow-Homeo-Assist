"use client";

import { Calendar, PanelRightClose, Sparkles, X, Zap } from "lucide-react";
import { cn } from "../../../lib/cn";

export type WorkspaceDrawer = "none" | "ai" | "schedule";

type Props = {
  activeDrawer: WorkspaceDrawer;
  aiEnabled: boolean;
  onOpenAi: () => void;
  onOpenSchedule: () => void;
  onClose: () => void;
  className?: string;
};

export function ConsultationWorkspaceRail({
  activeDrawer,
  aiEnabled,
  onOpenAi,
  onOpenSchedule,
  onClose,
  className
}: Props): JSX.Element {
  return (
    <div
      className={cn(
        "flex w-11 shrink-0 flex-col items-center gap-1 border-l border-hs-border/40 bg-hs-paper/90 py-3",
        className
      )}
      role="toolbar"
      aria-label="Workspace tools"
    >
      {aiEnabled ? (
        <button
          type="button"
          onClick={activeDrawer === "ai" ? onClose : onOpenAi}
          title="AI co-pilot (Alt+I)"
          aria-pressed={activeDrawer === "ai"}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hs-primary/30",
            activeDrawer === "ai"
              ? "bg-hs-primary text-white shadow-ds-sm"
              : "text-hs-text-secondary hover:bg-hs-cream hover:text-hs-primary"
          )}
        >
          <Sparkles className="h-4 w-4" aria-hidden />
        </button>
      ) : null}

      <button
        type="button"
        onClick={activeDrawer === "schedule" ? onClose : onOpenSchedule}
        title="Schedule follow-up"
        aria-pressed={activeDrawer === "schedule"}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hs-primary/30",
          activeDrawer === "schedule"
            ? "bg-hs-primary text-white shadow-ds-sm"
            : "text-hs-text-secondary hover:bg-hs-cream hover:text-hs-primary"
        )}
      >
        <Calendar className="h-4 w-4" aria-hidden />
      </button>

      {activeDrawer !== "none" ? (
        <button
          type="button"
          onClick={onClose}
          title="Close drawer"
          className="mt-auto flex h-9 w-9 items-center justify-center rounded-lg text-hs-text-tertiary transition hover:bg-hs-cream hover:text-hs-ink"
        >
          <PanelRightClose className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

/** Slide-over panel host (360px) attached to the right rail. */
export function ConsultationWorkspaceDrawer({
  open,
  title,
  icon: Icon,
  onClose,
  children,
  className
}: {
  open: boolean;
  title: string;
  icon: typeof Sparkles;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col overflow-hidden border-l border-hs-border/40 bg-hs-paper transition-[width] duration-200 ease-out",
        open ? "w-[360px]" : "w-0",
        className
      )}
      aria-hidden={!open}
    >
      <div className={cn("flex h-full w-[360px] flex-col", !open && "invisible")}>
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-hs-border/30 px-4 py-3">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-hs-primary" aria-hidden />
            <h2 className="font-heading text-body-sm font-bold text-hs-ink">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-hs-text-tertiary transition hover:bg-hs-cream hover:text-hs-ink"
            aria-label="Close panel"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
      </div>
    </aside>
  );
}

export function DrawerHint({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <p className="mb-3 rounded-lg border border-hs-border/30 bg-hs-cream/40 px-2.5 py-2 text-[10px] leading-relaxed text-hs-text-tertiary">
      {children}
    </p>
  );
}

export function DrawerSectionTitle({ children }: { children: React.ReactNode }): JSX.Element {
  return <p className="mb-2 text-caption-sm font-semibold text-hs-text-secondary">{children}</p>;
}

/** Badge shown when AI is recording from the drawer context. */
export function DrawerLiveBadge({ label }: { label: string }): JSX.Element {
  return (
    <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-caption-sm font-semibold text-rose-800">
      <Zap className="h-3 w-3 animate-pulse" aria-hidden />
      {label}
    </span>
  );
}

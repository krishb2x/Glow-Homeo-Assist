"use client";

import { useEffect } from "react";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return Boolean(target.closest("[contenteditable='true']"));
}

type Options = {
  enabled?: boolean;
  onToggleAiDrawer?: () => void;
  onToggleRecording?: () => void;
  onFinalize?: () => void;
  recordingEnabled?: boolean;
};

/** Alt+I AI drawer, Alt+R record, Ctrl/Cmd+Enter finalize (architecture §4.1). */
export function useConsultationWorkspaceShortcuts({
  enabled = true,
  onToggleAiDrawer,
  onToggleRecording,
  onFinalize,
  recordingEnabled = false
}: Options): void {
  useEffect(() => {
    if (!enabled) return;

    function onKeyDown(e: KeyboardEvent): void {
      if (isEditableTarget(e.target)) return;

      if (e.altKey && !e.metaKey && !e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === "i") {
        e.preventDefault();
        onToggleAiDrawer?.();
        return;
      }

      if (
        recordingEnabled &&
        e.altKey &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.shiftKey &&
        e.key.toLowerCase() === "r"
      ) {
        e.preventDefault();
        onToggleRecording?.();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        onFinalize?.();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, onToggleAiDrawer, onToggleRecording, onFinalize, recordingEnabled]);
}

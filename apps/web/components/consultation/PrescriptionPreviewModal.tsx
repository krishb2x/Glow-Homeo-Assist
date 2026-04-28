"use client";

import { useEffect, useId } from "react";

type Props = {
  open: boolean;
  title: string;
  html: string;
  onClose: () => void;
};

export function PrescriptionPreviewModal({ open, title, html, onClose }: Props): JSX.Element | null {
  const id = useId();
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby={id}>
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close" onClick={onClose} />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-hs-border/50 bg-hs-paper shadow-xl">
        <div className="flex items-center justify-between border-b border-hs-border/40 px-4 py-3">
          <h2 id={id} className="text-body-sm font-bold text-hs-ink">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-hs-border/50 px-3 py-1.5 text-caption-sm font-semibold text-hs-ink"
          >
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          <iframe
            title={title}
            className="h-full min-h-[65vh] w-full border-0"
            style={{ height: "calc(90vh - 56px)" }}
            srcDoc={html}
            sandbox="allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
}

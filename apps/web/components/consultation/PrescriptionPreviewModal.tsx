"use client";

import { useEffect, useId } from "react";

type Props = {
  open: boolean;
  title: string;
  html: string;
  onClose: () => void;
  onPrint?: () => void;
};

/** A4 portrait ratio: 210mm × 297mm */
const A4_ASPECT = 210 / 297;

export function PrescriptionPreviewModal({ open, title, html, onClose, onPrint }: Props): JSX.Element | null {
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
      <div className="relative z-10 flex max-h-[94vh] w-full max-w-[820px] flex-col overflow-hidden rounded-2xl border border-hs-border/50 bg-hs-paper shadow-xl">
        <div className="flex items-center justify-between gap-2 border-b border-hs-border/40 px-4 py-3">
          <div>
            <h2 id={id} className="text-body-sm font-bold text-hs-ink">
              {title}
            </h2>
            <p className="text-[10px] text-hs-text-tertiary">A4 preview · Use Print → Save as PDF for vector output</p>
          </div>
          <div className="flex items-center gap-2">
            {onPrint ? (
              <button
                type="button"
                onClick={onPrint}
                className="rounded-lg border border-hs-primary/35 bg-hs-primary-very-light px-3 py-1.5 text-caption-sm font-semibold text-hs-primary"
              >
                Print / Save PDF
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-hs-border/50 px-3 py-1.5 text-caption-sm font-semibold text-hs-ink"
            >
              Close
            </button>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 justify-center overflow-auto bg-[#e8e8e8] p-4">
          <div
            className="w-full shrink-0 overflow-hidden bg-white shadow-md"
            style={{
              maxWidth: "210mm",
              aspectRatio: String(A4_ASPECT),
              maxHeight: "calc(94vh - 88px)"
            }}
          >
            <iframe
              title={title}
              className="h-full w-full border-0"
              srcDoc={html}
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useId, useRef } from "react";
import { LeadForm } from "./LeadForm";
import { BRAND_NAME } from "../lib/brand";

export type DemoRequestDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DemoRequestDialog({ open, onOpenChange }: DemoRequestDialogProps): JSX.Element | null {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    },
    [onOpenChange]
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", onKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prev;
    };
  }, [open, onKeyDown]);

  useEffect(() => {
    if (open) {
      setTimeout(() => panelRef.current?.querySelector<HTMLElement>("input")?.focus(), 0);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <div
        className="absolute inset-0 bg-hs-ink/25"
        aria-hidden
        onMouseDown={() => onOpenChange(false)}
      />
      <div className="relative flex min-h-full items-start justify-center p-4 pt-8 sm:items-center sm:p-6">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-lg rounded-2xl border border-stone-100 bg-white p-6 sm:p-8"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="pr-8 font-heading text-lg font-medium tracking-[-0.02em] text-stone-900">
          Book a demo · {BRAND_NAME}
        </h2>
        <p className="mt-1 text-sm text-stone-600">Tell us about your clinic — we will follow up shortly.</p>
        <div className="mt-6">
          <LeadForm
            idPrefix="modal"
            onCloseAfterSuccess={() => onOpenChange(false)}
          />
        </div>
        <button
          type="button"
          className="absolute right-3 top-3 rounded-md p-2 text-hs-text-tertiary transition hover:bg-stone-50 hover:text-hs-ink"
          onClick={() => onOpenChange(false)}
          aria-label="Close"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      </div>
    </div>
  );
}

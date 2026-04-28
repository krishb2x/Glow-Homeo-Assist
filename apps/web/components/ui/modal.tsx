"use client";

import { type ReactNode, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "../../lib/cn";
import { dsModalBackdropProps, dsModalContentProps } from "../../lib/ds-motion";
import { Button } from "./button";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
};

export function Modal({ open, onClose, title, children, className, footer }: ModalProps): JSX.Element | null {
  const [mounted, setMounted] = useState(false);
  const titleId = useId();
  const reduceMotion = !!useReducedMotion();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="modal"
          className="fixed inset-0 z-[100] flex items-end justify-center p-ds-md sm:items-center"
          role="presentation"
          initial={dsModalBackdropProps.initial}
          animate={dsModalBackdropProps.animate}
          exit={dsModalBackdropProps.exit}
          transition={reduceMotion ? { duration: 0.12 } : dsModalBackdropProps.transition}
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default border-0 bg-hs-ink/45 p-0 backdrop-blur-sm"
            aria-label="Close dialog"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={cn(
              "relative z-10 max-h-[min(90vh,720px)] w-full max-w-lg overflow-y-auto rounded-2xl border border-hs-border/30 bg-hs-paper p-ds-lg shadow-ds-md",
              className
            )}
            initial={reduceMotion ? { opacity: 0 } : dsModalContentProps.initial}
            animate={reduceMotion ? { opacity: 1 } : dsModalContentProps.animate}
            exit={reduceMotion ? { opacity: 0 } : dsModalContentProps.exit}
            transition={reduceMotion ? { duration: 0.12 } : dsModalContentProps.transition}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-ds-md">
              <h2 id={titleId} className="font-heading text-typo-section text-hs-ink">
                {title}
              </h2>
              <Button type="button" variant="ghost" size="sm" className="min-h-9 shrink-0 px-2" onClick={onClose} aria-label="Close">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="mt-ds-md text-typo-body text-hs-text-secondary">{children}</div>
            {footer ? (
              <div className="-mx-ds-lg mt-ds-lg border-t border-hs-border/25 bg-hs-cream/35 px-ds-lg pb-0 pt-ds-lg">
                <div className="flex flex-wrap justify-end gap-ds-sm">{footer}</div>
              </div>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}

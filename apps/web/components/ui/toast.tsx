"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, X as XIcon } from "lucide-react";
import { cn } from "../../lib/cn";

type ToastVariant = "success" | "error" | "info";

export type ToastPayload = {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  show: (t: Omit<ToastPayload, "id">) => void;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function iconFor(v: ToastVariant) {
  if (v === "success") return CheckCircle2;
  if (v === "error") return AlertCircle;
  return Info;
}

function stylesFor(v: ToastVariant) {
  if (v === "success")
    return "border-hs-success/30 bg-hs-paper text-hs-ink shadow-ds-md ring-1 ring-hs-success/10";
  if (v === "error") return "border-hs-danger/30 bg-hs-paper text-hs-ink shadow-ds-md ring-1 ring-hs-danger/10";
  return "border-hs-info/30 bg-hs-paper text-hs-ink shadow-ds-md ring-1 ring-hs-info/10";
}

export function ToastProvider({ children }: { children: ReactNode }): JSX.Element {
  const [items, setItems] = useState<ToastPayload[]>([]);
  /** Avoid portal during SSR / first paint so server HTML matches client (hydration). */
  const [portalReady, setPortalReady] = useState(false);
  useEffect(() => {
    setPortalReady(true);
  }, []);

  const show = useCallback((t: Omit<ToastPayload, "id">) => {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `toast-${Date.now()}`;
    const toast = { ...t, id };
    setItems((prev) => [...prev, toast]);
    const ms = 4200;
    window.setTimeout(() => {
      setItems((prev) => prev.filter((x) => x.id !== id));
    }, ms);
  }, []);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const value = useMemo(() => ({ show, dismiss }), [dismiss, show]);

  const toastStack = (
    <div
      className="pointer-events-none fixed right-0 top-0 z-[200] flex max-w-sm flex-col gap-ds-sm p-ds-md"
      aria-live="polite"
    >
      <AnimatePresence mode="popLayout">
        {items.map((t) => {
          const Icon = iconFor(t.variant);
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ x: 120, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 32, duration: 0.25 }}
              className={cn("pointer-events-auto w-full max-w-sm rounded-2xl border p-ds-md", stylesFor(t.variant))}
            >
              <div className="flex gap-ds-sm">
                <Icon
                  className={cn(
                    "mt-0.5 h-5 w-5 shrink-0",
                    t.variant === "success" && "text-hs-success",
                    t.variant === "error" && "text-hs-danger",
                    t.variant === "info" && "text-hs-info"
                  )}
                  strokeWidth={2}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="font-heading text-body-sm font-semibold text-hs-ink">{t.title}</p>
                  {t.description ? (
                    <p className="mt-0.5 text-caption-sm text-hs-text-secondary">{t.description}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  className="shrink-0 rounded-lg p-1 text-hs-text-tertiary transition hover:bg-hs-cream/80"
                  aria-label="Dismiss"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {portalReady ? createPortal(toastStack, document.body) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const v = useContext(ToastContext);
  if (!v) throw new Error("useToast must be used within ToastProvider");
  return v;
}

"use client";

import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "../../lib/cn";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  className?: string;
  /** Optional leading icon; server-safe slot */
  startAdornment?: ReactNode;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, startAdornment, ...rest },
  ref
) {
  if (startAdornment) {
    return (
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-hs-text-tertiary">
          {startAdornment}
        </span>
        <input
          ref={ref}
          className={cn(
            "h-12 w-full rounded-xl border border-hs-border/40 bg-hs-cream/40 pl-10 pr-3 text-typo-body text-hs-ink",
            "shadow-input placeholder:text-hs-text-tertiary/80",
            "hover:border-hs-border-dark/60",
            "focus:border-hs-primary/45 focus:ring-2 focus:ring-hs-primary/15",
            className
          )}
          {...rest}
        />
      </div>
    );
  }
  return (
    <input
      ref={ref}
      className={cn(
        "h-12 w-full rounded-xl border border-hs-border/40 bg-hs-cream/40 px-3 text-typo-body text-hs-ink",
        "shadow-input placeholder:text-hs-text-tertiary/80",
        "hover:border-hs-border-dark/60",
        "focus:border-hs-primary/45 focus:ring-2 focus:ring-hs-primary/15",
        className
      )}
      {...rest}
    />
  );
});

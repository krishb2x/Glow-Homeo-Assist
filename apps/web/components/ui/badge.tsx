import { type ReactNode } from "react";
import { cn } from "../../lib/cn";

const kindStyles = {
  /** Long-term / ongoing */
  chronic: "border-hs-warning/40 bg-hs-warning/10 text-hs-text border",
  /** Acute / new episode */
  acute: "border-hs-danger/40 bg-hs-danger/10 text-hs-ink border",
  "follow-up": "border-hs-primary/30 bg-hs-primary-very-light/90 text-hs-primary border"
} as const;

export type ClinicalBadgeKind = keyof typeof kindStyles;

type BadgeProps = {
  kind: ClinicalBadgeKind;
  children: ReactNode;
  className?: string;
};

export function Badge({ kind, children, className }: BadgeProps): JSX.Element {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg px-2 py-0.5 text-caption-sm font-medium leading-none",
        kindStyles[kind],
        className
      )}
    >
      {children}
    </span>
  );
}

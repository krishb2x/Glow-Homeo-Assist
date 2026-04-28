"use client";

import { type HTMLAttributes, type ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "../../lib/cn";

type CardProps = {
  children: ReactNode;
  className?: string;
  /** Slight lift on hover (non-interactive cards only; prefer motion on wrapper if card is a link) */
  hoverLift?: boolean;
} & Omit<HTMLMotionProps<"div">, "className" | "children">;

export function Card({ children, className, hoverLift = true, ...rest }: CardProps): JSX.Element {
  return (
    <motion.div
      whileHover={hoverLift ? { y: -2 } : undefined}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className={cn(
        "rounded-2xl border border-hs-border/25 bg-hs-paper/95 shadow-card ring-1 ring-black/[0.02] transition-shadow duration-200 hover:shadow-ds-md",
        className
      )}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

type CardHeaderProps = HTMLAttributes<HTMLDivElement> & { children: ReactNode; className?: string };
export function CardHeader({ children, className, ...rest }: CardHeaderProps): JSX.Element {
  return (
    <div className={cn("p-ds-md pb-0 font-heading text-heading-sm text-hs-ink", className)} {...rest}>
      {children}
    </div>
  );
}

type CardContentProps = HTMLAttributes<HTMLDivElement> & { children: ReactNode; className?: string };
export function CardContent({ children, className, ...rest }: CardContentProps): JSX.Element {
  return (
    <div className={cn("p-ds-md pt-ds-sm text-typo-body text-hs-text-secondary", className)} {...rest}>
      {children}
    </div>
  );
}

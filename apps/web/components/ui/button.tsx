"use client";

import { forwardRef, type ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "../../lib/cn";
import { DS_DURATION, DS_EASE_OUT } from "../../lib/ds-motion";

const variants = {
  primary:
    "bg-hs-primary text-white shadow-ds-md hover:bg-hs-primary-light focus-visible:ring-hs-primary/40",
  secondary:
    "border border-hs-border/60 bg-hs-paper text-hs-ink shadow-ds-sm hover:border-hs-primary/35 hover:bg-hs-cream/80",
  ghost: "text-hs-primary hover:bg-hs-primary-very-light/90 focus-visible:ring-hs-primary/30"
} as const;

const sizes = {
  sm: "min-h-9 rounded-lg px-3 text-caption-md font-semibold",
  md: "min-h-10 rounded-xl px-4 text-body-sm font-semibold",
  lg: "min-h-12 rounded-xl px-5 text-body-md font-semibold"
} as const;

export type ButtonProps = {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  className?: string;
  children: ReactNode;
} & Omit<HTMLMotionProps<"button">, "className" | "children">;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", className, type = "button", disabled, children, whileTap, whileHover, ...rest },
  ref
) {
  return (
    <motion.button
      ref={ref}
      type={type}
      disabled={disabled}
      whileTap={whileTap ?? { scale: disabled ? 1 : 0.98 }}
      whileHover={whileHover}
      transition={{ duration: DS_DURATION.tap, ease: DS_EASE_OUT }}
      className={cn(
        "font-heading inline-flex items-center justify-center gap-2 transition-shadow duration-200",
        "disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...rest}
    >
      {children}
    </motion.button>
  );
});

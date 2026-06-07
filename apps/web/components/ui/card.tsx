"use client";

import { type HTMLAttributes, type ReactNode, forwardRef } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn";

const cardVariants = cva(
  "@container relative rounded-2xl border transition-all duration-300 ease-out",
  {
    variants: {
      intent: {
        default: "border-hs-border/25 bg-hs-paper shadow-card ring-1 ring-black/[0.02]",
        interactive: "border-hs-border/30 bg-hs-paper shadow-card ring-1 ring-black/[0.02] hover:border-hs-primary/30 hover:shadow-ds-md hover:-translate-y-0.5",
        ghost: "border-transparent bg-transparent shadow-none hover:bg-hs-cream/40",
        premium: "border-hs-border/20 bg-white/70 backdrop-blur-md shadow-card ring-1 ring-white/50"
      },
      padding: {
        none: "p-0",
        sm: "p-3",
        md: "p-4 sm:p-5 lg:p-6",
        lg: "p-6 sm:p-8"
      }
    },
    defaultVariants: {
      intent: "default",
      padding: "none"
    }
  }
);

type CardProps = {
  children: ReactNode;
  className?: string;
  /** Use interactive intent instead of hoverLift */
} & Omit<HTMLMotionProps<"div">, "className" | "children"> & VariantProps<typeof cardVariants>;

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ children, className, intent, padding, ...rest }, ref) => {
    return (
      <motion.div
        ref={ref}
        layout
        className={cn(cardVariants({ intent, padding, className }))}
        {...rest}
      >
        {children}
      </motion.div>
    );
  }
);
Card.displayName = "Card";

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

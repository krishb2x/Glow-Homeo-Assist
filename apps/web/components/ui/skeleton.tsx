"use client";

import { motion } from "framer-motion";
import { cn } from "../../lib/cn";

type SkeletonProps = {
  className?: string;
  /** "line" = text row; "block" = generic rectangle */
  shape?: "line" | "block";
  lines?: number;
};

export function Skeleton({ className, shape = "block", lines = 1 }: SkeletonProps): JSX.Element {
  if (shape === "line" && lines > 1) {
    return (
      <div className="flex flex-col gap-ds-sm">
        {Array.from({ length: lines }, (_, i) => (
          <Shimmer key={i} className={cn("h-3 w-full rounded-md", i === lines - 1 && "w-2/3", className)} />
        ))}
      </div>
    );
  }
  return <Shimmer className={className} />;
}

function Shimmer({ className }: { className?: string }): JSX.Element {
  return (
    <div className={cn("relative overflow-hidden rounded-md bg-hs-cream/80", className)}>
      <motion.div
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-hs-paper/70 to-transparent"
        animate={{ x: ["-100%", "200%"] }}
        transition={{ duration: 1.1, ease: "linear", repeat: Infinity, repeatDelay: 0.25 }}
      />
    </div>
  );
}

type SkeletonCardProps = { className?: string };
export function SkeletonCard({ className }: SkeletonCardProps): JSX.Element {
  return (
    <div
      className={cn("rounded-2xl border border-hs-border/20 bg-hs-paper/80 p-ds-md shadow-ds-sm", className)}
    >
      <div className="flex gap-ds-sm">
        <Shimmer className="h-12 w-12 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1 space-y-ds-sm">
          <Shimmer className="h-4 w-3/5" />
          <Shimmer className="h-3 w-full" />
        </div>
      </div>
    </div>
  );
}

type PageSkeletonProps = { className?: string };
/** Full workspace placeholder (sidebar is real; main area only) */
export function PageSkeleton({ className }: PageSkeletonProps): JSX.Element {
  return (
    <div className={cn("space-y-ds-lg", className)}>
      <div className="space-y-ds-sm">
        <Shimmer className="h-10 max-w-sm rounded-2xl" />
        <Shimmer className="h-4 max-w-md" />
      </div>
      <div className="grid gap-ds-sm sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Shimmer key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-ds-md lg:grid-cols-12">
        <div className="space-y-ds-sm lg:col-span-8">
          <Shimmer className="h-48 rounded-2xl" />
          <Shimmer className="h-32 rounded-2xl" />
        </div>
        <div className="space-y-ds-sm lg:col-span-4">
          <Shimmer className="h-40 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

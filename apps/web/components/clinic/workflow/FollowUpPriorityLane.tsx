"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "../../../lib/cn";

type Props = {
  title: string;
  count: number;
  icon: LucideIcon;
  tone: "danger" | "warning" | "neutral";
  emptyMessage: string;
  children: React.ReactNode;
};

const toneStyles = {
  danger: {
    border: "border-rose-200/70",
    header: "bg-rose-50/80 text-rose-950",
    badge: "bg-rose-100 text-rose-900 ring-rose-200/80"
  },
  warning: {
    border: "border-amber-200/70",
    header: "bg-amber-50/80 text-amber-950",
    badge: "bg-amber-100 text-amber-900 ring-amber-200/80"
  },
  neutral: {
    border: "border-hs-border/40",
    header: "bg-hs-cream/80 text-hs-ink",
    badge: "bg-hs-paper text-hs-text-secondary ring-hs-border/50"
  }
} as const;

export function FollowUpPriorityLane({
  title,
  count,
  icon: Icon,
  tone,
  emptyMessage,
  children
}: Props): JSX.Element {
  const s = toneStyles[tone];
  return (
    <section className={cn("overflow-hidden rounded-2xl border shadow-card", s.border)}>
      <header className={cn("flex items-center justify-between gap-2 px-4 py-3 sm:px-5", s.header)}>
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Icon className="h-4 w-4 shrink-0" strokeWidth={2.25} aria-hidden />
          {title}
        </h2>
        <span
          className={cn(
            "inline-flex min-w-[1.75rem] items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ring-1",
            s.badge
          )}
        >
          {count}
        </span>
      </header>
      <ul className="space-y-0 divide-y divide-hs-border/20 bg-hs-paper/95 p-2 sm:p-3" role="list">
        {count === 0 ? (
          <li className="list-none px-2 py-4 text-center text-sm text-hs-text-tertiary">{emptyMessage}</li>
        ) : (
          children
        )}
      </ul>
    </section>
  );
}

export function FollowUpLaneLink({
  href,
  className,
  children
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <Link
      href={href}
      className={cn(
        "block rounded-xl px-3 py-2.5 text-sm transition hover:bg-hs-cream/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hs-primary/25",
        className
      )}
    >
      {children}
    </Link>
  );
}

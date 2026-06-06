"use client";

import Link from "next/link";
import { ConsultationLink } from "../ConsultationLink";
import { consultationStartHref } from "../../../lib/consultation-navigation";
import { useMemo } from "react";
import { Activity, CheckCircle2, MessageCircle, Pill } from "lucide-react";
import type { DashboardRecentItem, FollowUpQueueItem } from "../../../lib/doctor-api";
import { groupFollowUps, type GroupedFollowUp } from "../../../lib/operational-queue";
import { cn } from "../../../lib/cn";

function formatRelative(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.round(diff / 60_000);
    if (mins < 2) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function FollowUpRow({ item }: { item: GroupedFollowUp }): JSX.Element {
  const dueLabel =
    item.group === "overdue"
      ? "Overdue"
      : item.group === "today"
        ? "Due today"
        : new Date(item.dueAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <ConsultationLink
      href={consultationStartHref({ patientId: item.patientId })}
      className="flex items-center justify-between gap-2 py-2.5 text-body-sm transition hover:text-hs-primary"
    >
      <div className="min-w-0">
        <p className="truncate font-medium text-hs-ink">{item.patientName}</p>
        <p className="flex items-center gap-1.5 text-caption-sm">
          <span
            className={cn(
              item.group === "overdue" && "font-semibold text-rose-800",
              item.group === "today" && "font-medium text-amber-900",
              item.group === "upcoming" && "text-hs-text-tertiary"
            )}
          >
            {dueLabel}
          </span>
          {item.title ? (
            <span className="truncate text-hs-text-tertiary">· {item.title}</span>
          ) : null}
        </p>
      </div>
      <span className="shrink-0 text-caption-sm font-semibold text-hs-primary">Visit →</span>
    </ConsultationLink>
  );
}

function RecentActivity({ items }: { items: DashboardRecentItem[] }): JSX.Element {
  const IconFor = (k: DashboardRecentItem["kind"]) => {
    if (k === "message") return MessageCircle;
    if (k === "prescription") return Pill;
    return CheckCircle2;
  };
  if (items.length === 0) {
    return <p className="text-body-sm text-hs-text-tertiary">No recent activity.</p>;
  }
  return (
    <ul className="space-y-1" role="list">
      {items.slice(0, 6).map((item) => {
        const Icon = IconFor(item.kind);
        const row = (
          <div className="flex gap-3 rounded-xl px-2 py-2 transition hover:bg-hs-cream/60">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-hs-primary-very-light text-hs-primary">
              <Icon className="h-3.5 w-3.5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-body-sm font-medium text-hs-ink">{item.title}</p>
              {item.subtitle ? (
                <p className="line-clamp-1 text-caption-sm text-hs-text-secondary">{item.subtitle}</p>
              ) : null}
              <p className="text-caption-sm text-hs-text-tertiary">{formatRelative(item.at)}</p>
            </div>
          </div>
        );
        return (
          <li key={item.id}>
            {item.href ? (
              <Link href={item.href} className="block">
                {row}
              </Link>
            ) : (
              row
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function DashboardRightRail({
  followUps,
  activity,
  overdueCount
}: {
  followUps: FollowUpQueueItem[];
  activity: DashboardRecentItem[];
  overdueCount: number;
}): JSX.Element {
  const grouped = useMemo(() => groupFollowUps(followUps), [followUps]);
  const overdue = grouped.filter((f) => f.group === "overdue");
  const today = grouped.filter((f) => f.group === "today");
  const upcoming = grouped.filter((f) => f.group === "upcoming");

  const preview = [...overdue, ...today, ...upcoming].slice(0, 6);

  return (
    <section className="ds-card ds-card-pad">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-heading text-body-md font-semibold text-hs-ink">Follow-up queue</h2>
        <Link href="/follow-ups" className="text-caption-sm font-semibold text-hs-primary hover:underline">
          All →
        </Link>
      </div>

      {grouped.length === 0 ? (
        <p className="mt-3 text-caption-sm text-hs-text-tertiary">No follow-ups in queue.</p>
      ) : (
        <>
          {overdueCount > 0 ? (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-2 py-1 text-caption-sm font-medium text-rose-900">
              <Activity className="h-3.5 w-3.5" aria-hidden />
              {overdueCount} overdue — act today
            </p>
          ) : null}

          {overdue.length > 0 ? (
            <div className="mt-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-rose-800">Overdue</p>
              <ul className="divide-y divide-hs-border/15">
                {overdue.slice(0, 3).map((f) => (
                  <li key={f.id}>
                    <FollowUpRow item={f} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {today.length > 0 ? (
            <div className={cn("mt-3", overdue.length > 0 && "border-t border-hs-border/15 pt-3")}>
              <p className="text-[10px] font-bold uppercase tracking-wide text-amber-900">Due today</p>
              <ul className="divide-y divide-hs-border/15">
                {today.slice(0, 3).map((f) => (
                  <li key={f.id}>
                    <FollowUpRow item={f} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {preview.length === 0 && upcoming.length > 0 ? (
            <ul className="mt-3 divide-y divide-hs-border/20">
              {upcoming.slice(0, 4).map((f) => (
                <li key={f.id}>
                  <FollowUpRow item={f} />
                </li>
              ))}
            </ul>
          ) : null}

          {grouped.length > preview.length ? (
            <Link
              href="/follow-ups"
              className="mt-3 block text-center text-caption-sm font-semibold text-hs-primary hover:underline"
            >
              View all {grouped.length} follow-ups →
            </Link>
          ) : null}
        </>
      )}

      <details className="mt-4 border-t border-hs-border/20 pt-3">
        <summary className="cursor-pointer list-none text-caption-sm font-semibold text-hs-text-secondary marker:content-none [&::-webkit-details-marker]:hidden">
          Recent activity
          {activity.length > 0 ? (
            <span className="ml-1 font-normal text-hs-text-tertiary">({activity.length})</span>
          ) : null}
        </summary>
        <div className="mt-2">
          <RecentActivity items={activity} />
        </div>
      </details>
    </section>
  );
}

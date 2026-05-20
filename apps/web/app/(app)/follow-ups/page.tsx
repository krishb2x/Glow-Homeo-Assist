"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlarmClock,
  CalendarClock,
  CheckCircle2,
  Loader2,
  Phone,
  PlayCircle
} from "lucide-react";
import { FollowUpPriorityLane } from "../../../components/clinic/workflow/FollowUpPriorityLane";
import { PageHeader } from "../../../components/platform/PageHeader";
import {
  fetchFollowUpQueue,
  getToken,
  patchFollowUp,
  type FollowUpQueueItem
} from "../../../lib/doctor-api";
import { ErrorState, EmptyState } from "../../../components/ui/LoadState";
import { cn } from "../../../lib/cn";
import { DS_BTN_PRIMARY, DS_BTN_SECONDARY } from "../../../lib/ds-classes";

function sameLocalCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function groupByBucket(items: FollowUpQueueItem[], now: Date) {
  const overdue: FollowUpQueueItem[] = [];
  const dueToday: FollowUpQueueItem[] = [];
  const upcoming: FollowUpQueueItem[] = [];
  const startTomorrow = startOfLocalDay(now);
  startTomorrow.setDate(startTomorrow.getDate() + 1);

  for (const it of items) {
    if (it.overdue) {
      overdue.push(it);
      continue;
    }
    const due = new Date(it.dueAt);
    if (sameLocalCalendarDay(due, now)) {
      dueToday.push(it);
    } else if (due.getTime() >= startTomorrow.getTime()) {
      upcoming.push(it);
    } else {
      overdue.push(it);
    }
  }
  return { overdue, dueToday, upcoming };
}

function FollowRow({
  it,
  onComplete,
  onReschedule,
  busy
}: {
  it: FollowUpQueueItem;
  onComplete: (it: FollowUpQueueItem) => void;
  onReschedule: (it: FollowUpQueueItem) => void;
  busy: boolean;
}): JSX.Element {
  const when = new Date(it.dueAt);
  const canManage = Boolean(it.id) && it.source !== "suggested";
  return (
    <li className="rounded-xl border border-transparent bg-hs-paper p-3 transition hover:border-hs-border/30 hover:bg-hs-cream/40">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="font-heading text-body-sm font-bold text-hs-ink">{it.patientName}</p>
          <p className="mt-0.5 text-caption-sm text-hs-text-secondary">
            {it.title} · due {when.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
          </p>
          {it.source === "suggested" ? (
            <p className="mt-1 text-caption-sm text-hs-text-tertiary">Suggested check-in — confirm in a visit</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {it.phone ? (
            <a
              href={`tel:${it.phone.replace(/\s/g, "")}`}
              className={cn(DS_BTN_SECONDARY, "min-h-9 gap-1.5 px-3 py-2 text-caption-sm")}
            >
              <Phone className="h-3.5 w-3.5 text-hs-primary" aria-hidden />
              Call
            </a>
          ) : null}
          {canManage ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => onComplete(it)}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-emerald-300/70 bg-emerald-50 px-3 text-caption-sm font-semibold text-emerald-900 transition hover:bg-emerald-100 disabled:opacity-50"
              >
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                Done
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => onReschedule(it)}
                className={cn(DS_BTN_SECONDARY, "min-h-9 px-3 py-2 text-caption-sm")}
              >
                +7 days
              </button>
            </>
          ) : null}
          <Link
            href={`/consultation?patientId=${encodeURIComponent(it.patientId)}`}
            className={cn(DS_BTN_PRIMARY, "min-h-9 gap-1.5 px-4 py-2 text-caption-sm")}
          >
            <PlayCircle className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
            Start visit
          </Link>
          <Link
            href={`/patients/${encodeURIComponent(it.patientId)}/timeline`}
            className={cn(DS_BTN_SECONDARY, "min-h-9 px-3 py-2 text-caption-sm font-semibold text-hs-primary")}
          >
            Chart
          </Link>
        </div>
      </div>
    </li>
  );
}

export default function FollowUpsPage(): JSX.Element {
  const router = useRouter();
  const [items, setItems] = useState<FollowUpQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<unknown>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      setItems(await fetchFollowUpQueue());
    } catch (e) {
      setErr(e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    void load();
  }, [load, router]);

  const onComplete = useCallback(
    async (it: FollowUpQueueItem) => {
      if (!it.id) return;
      setBusyId(it.id);
      try {
        await patchFollowUp(it.id, { status: "COMPLETED" });
        await load();
      } catch (e) {
        setErr(e);
      } finally {
        setBusyId(null);
      }
    },
    [load]
  );

  const onReschedule = useCallback(
    async (it: FollowUpQueueItem) => {
      if (!it.id) return;
      setBusyId(it.id);
      try {
        const next = new Date(it.dueAt);
        next.setDate(next.getDate() + 7);
        await patchFollowUp(it.id, { dueAt: next.toISOString(), status: "PENDING" });
        await load();
      } catch (e) {
        setErr(e);
      } finally {
        setBusyId(null);
      }
    },
    [load]
  );

  const { overdue, dueToday, upcoming } = useMemo(
    () => groupByBucket(items, new Date()),
    [items]
  );
  const total = overdue.length + dueToday.length + upcoming.length;

  if (err && !loading) {
    return (
      <div className="mx-auto max-w-4xl">
        <PageHeader title="Follow-ups" className="mb-4" />
        <ErrorState err={err} title="Couldn’t load follow-ups" onRetry={load} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Follow-ups"
        description="Priority queue for post-visit check-ins. Overdue items surface first — same workflow as starting any consultation."
        className="mb-6 border-b border-hs-border/30 pb-6"
      />

      {loading ? (
        <p className="flex items-center gap-2 text-body-sm text-hs-text-secondary" role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading queue…
        </p>
      ) : total === 0 ? (
        <EmptyState
          title="No follow-ups in this window"
          description="When you schedule follow-ups during a consultation, they appear here by due date."
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-1">
          <FollowUpPriorityLane
            title="Overdue"
            count={overdue.length}
            icon={AlarmClock}
            tone="danger"
            emptyMessage="No overdue follow-ups — you're caught up."
          >
            {overdue.map((it) => (
              <FollowRow
                key={it.id ?? `${it.patientId}-ov-${it.sourceConsultationId}`}
                it={it}
                onComplete={onComplete}
                onReschedule={onReschedule}
                busy={busyId === it.id}
              />
            ))}
          </FollowUpPriorityLane>

          <FollowUpPriorityLane
            title="Due today"
            count={dueToday.length}
            icon={CalendarClock}
            tone="warning"
            emptyMessage="Nothing due today."
          >
            {dueToday.map((it) => (
              <FollowRow
                key={it.id ?? `${it.patientId}-td-${it.sourceConsultationId}`}
                it={it}
                onComplete={onComplete}
                onReschedule={onReschedule}
                busy={busyId === it.id}
              />
            ))}
          </FollowUpPriorityLane>

          <FollowUpPriorityLane
            title="Upcoming"
            count={upcoming.length}
            icon={CalendarClock}
            tone="neutral"
            emptyMessage="No upcoming dates in this list."
          >
            {upcoming.map((it) => (
              <FollowRow
                key={it.id ?? `${it.patientId}-up-${it.sourceConsultationId}`}
                it={it}
                onComplete={onComplete}
                onReschedule={onReschedule}
                busy={busyId === it.id}
              />
            ))}
          </FollowUpPriorityLane>
        </div>
      )}
    </div>
  );
}

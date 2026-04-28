"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlarmClock, CalendarClock, Loader2, Phone, PlayCircle, type LucideIcon } from "lucide-react";
import { fetchFollowUpQueue, getToken, type FollowUpQueueItem } from "../../../lib/doctor-api";
import { ErrorState, EmptyState } from "../../../components/ui/LoadState";

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

function Section({
  title,
  icon: Icon,
  children
}: {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <section className="rounded-2xl border border-hs-border/30 bg-hs-card p-5 shadow-card sm:p-6">
      <h2 className="flex items-center gap-2 text-sm font-bold text-hs-ink">
        <Icon className="h-4 w-4 text-hs-primary" strokeWidth={2} aria-hidden />
        {title}
      </h2>
      <ul className="mt-3 space-y-2" role="list">
        {children}
      </ul>
    </section>
  );
}

function FollowRow({ it }: { it: FollowUpQueueItem }): JSX.Element {
  const when = new Date(it.dueAt);
  return (
    <li className="flex flex-col gap-3 rounded-xl border border-hs-border/25 bg-hs-paper/85 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-semibold text-hs-ink">{it.patientName}</p>
        <p className="text-xs text-hs-text-secondary">
          {it.title} · due {when.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {it.phone ? (
          <a
            href={`tel:${it.phone.replace(/\s/g, "")}`}
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-hs-border/45 bg-hs-paper px-3 text-sm font-medium text-hs-ink transition hover:border-hs-primary/35"
          >
            <Phone className="h-3.5 w-3.5 text-hs-primary" aria-hidden />
            Call
          </a>
        ) : null}
        <Link
          href={`/consultation?patientId=${encodeURIComponent(it.patientId)}`}
          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-hs-primary px-4 text-sm font-bold text-white shadow-md hover:bg-hs-primary-light"
        >
          <PlayCircle className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          Start consultation
        </Link>
        <Link
          href={`/patients/${encodeURIComponent(it.patientId)}/timeline`}
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-hs-primary/35 px-3 text-sm font-semibold text-hs-primary hover:bg-hs-primary-very-light/50"
        >
          Chart
        </Link>
      </div>
    </li>
  );
}

export default function FollowUpsPage(): JSX.Element {
  const router = useRouter();
  const [items, setItems] = useState<FollowUpQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<unknown>(null);
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

  const { overdue, dueToday, upcoming } = useMemo(
    () => groupByBucket(items, new Date()),
    [items]
  );
  const total = overdue.length + dueToday.length + upcoming.length;

  if (err && !loading) {
    return (
      <div className="min-w-0 max-w-3xl">
        <h1 className="text-2xl font-bold text-hs-ink">Follow-ups</h1>
        <div className="mt-4">
          <ErrorState err={err} title="Couldn’t load follow-ups" onRetry={load} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-4xl">
      <h1 className="text-2xl font-bold text-hs-ink">Follow-ups & reminders</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-hs-text-secondary">
        Patients who need a check-in after a visit. Start a consultation to continue care in one place.
      </p>

      {loading ? (
        <p className="mt-8 flex items-center gap-2 text-sm text-hs-text-secondary" role="status">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading queue…
        </p>
      ) : total === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No follow-ups in this window"
            description="Completed visits with scheduled follow-ups will show here."
          />
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          <Section title="Overdue" icon={AlarmClock}>
            {overdue.length === 0 ? (
              <li className="list-none text-sm text-hs-text-secondary">None overdue.</li>
            ) : (
              overdue.map((it) => (
                <FollowRow
                  key={`${it.patientId}-ov-${it.sourceConsultationId ?? it.patientId}`}
                  it={it}
                />
              ))
            )}
          </Section>

          <Section title="Due today" icon={CalendarClock}>
            {dueToday.length === 0 ? (
              <li className="list-none text-sm text-hs-text-secondary">None due today.</li>
            ) : (
              dueToday.map((it) => (
                <FollowRow
                  key={`${it.patientId}-td-${it.sourceConsultationId ?? it.patientId}`}
                  it={it}
                />
              ))
            )}
          </Section>

          <Section title="Upcoming" icon={CalendarClock}>
            {upcoming.length === 0 ? (
              <li className="list-none text-sm text-hs-text-secondary">No upcoming dates in this list.</li>
            ) : (
              upcoming.map((it) => (
                <FollowRow
                  key={`${it.patientId}-up-${it.sourceConsultationId ?? it.patientId}`}
                  it={it}
                />
              ))
            )}
          </Section>
        </div>
      )}
    </div>
  );
}

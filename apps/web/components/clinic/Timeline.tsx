"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Calendar, CheckCircle2, Download, FileText, HeartPulse, History, Loader2, Pill, Stethoscope } from "lucide-react";
import {
  createFollowUp,
  fetchPresignDownload,
  patchFollowUp,
  type ConsultationEvent,
  type DocumentEvent,
  type FollowupEvent,
  type PrescriptionEvent,
  type TimelineEvent
} from "../../lib/doctor-api";
import { cn } from "../../lib/cn";

const FU_DONE_KEY = (pid: string) => `ha_fu_done_${pid}`;

function isLocalFollowupComplete(patientId: string, taskId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(FU_DONE_KEY(patientId));
    if (!raw) return false;
    const a = JSON.parse(raw) as string[];
    return Array.isArray(a) && a.includes(taskId);
  } catch {
    return false;
  }
}

function setLocalFollowupComplete(patientId: string, taskId: string, done: boolean): void {
  try {
    const raw = localStorage.getItem(FU_DONE_KEY(patientId));
    const a: string[] = raw ? (JSON.parse(raw) as string[]) : [];
    const set = new Set(a);
    if (done) set.add(taskId);
    else set.delete(taskId);
    localStorage.setItem(FU_DONE_KEY(patientId), JSON.stringify([...set]));
  } catch {
    /* */
  }
}

/** Real follow_ups (intentional source) carry a UUID; suggested rows are prefixed `fu-`. */
function isSyntheticFollowup(f: FollowupEvent): boolean {
  return f.source === "suggested" || f.id.startsWith("fu-");
}

function sortForDisplay(events: TimelineEvent[], now: Date): TimelineEvent[] {
  const t = now.getTime();
  const futureFu: TimelineEvent[] = [];
  const main: TimelineEvent[] = [];
  for (const e of events) {
    if (e.kind === "followup") {
      const due = new Date(e.dueAt).getTime();
      if (due > t && !e.overdue) {
        futureFu.push(e);
        continue;
      }
    }
    main.push(e);
  }
  main.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  futureFu.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  return [...main, ...futureFu];
}

type Props = { patientId: string; events: TimelineEvent[]; onFollowupToggled?: () => void };

export function Timeline({ patientId, events, onFollowupToggled }: Props): JSX.Element {
  const [now, setNow] = useState(() => new Date());
  const [fuTick, setFuTick] = useState(0);
  const [pendingId, setPendingId] = useState<string | null>(null);
  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(i);
  }, []);

  const ordered = useMemo(() => sortForDisplay(events, now), [events, now, fuTick]);

  const onToggle = useCallback(
    async (f: FollowupEvent, v: boolean) => {
      if (isSyntheticFollowup(f)) {
        // Materialise the suggested follow-up as a real DB row first, then mark it done.
        setPendingId(f.id);
        try {
          const newRow = await createFollowUp({
            patientId,
            dueAt: f.dueAt,
            reason: f.reason ?? "Post-consultation check-in",
          });
          // Immediately mark the real row as completed/pending.
          await patchFollowUp(newRow.id, { status: v ? "COMPLETED" : "PENDING" });
          onFollowupToggled?.();
        } catch {
          // Fallback: persist locally so the doctor isn't blocked in the UI.
          setLocalFollowupComplete(patientId, f.id, v);
          setFuTick((x) => x + 1);
        } finally {
          setPendingId(null);
        }
        return;
      }
      // Real follow_ups: PATCH server, then ask the parent to refetch.
      setPendingId(f.id);
      try {
        await patchFollowUp(f.id, { status: v ? "COMPLETED" : "PENDING" });
        onFollowupToggled?.();
      } catch {
        // On failure, fall back to local persistence so doctor isn't blocked.
        setLocalFollowupComplete(patientId, f.id, v);
        setFuTick((x) => x + 1);
      } finally {
        setPendingId(null);
      }
    },
    [onFollowupToggled, patientId]
  );

  const visible = useMemo(
    () =>
      ordered.filter((e) => {
        if (e.kind !== "followup") return true;
        const f = e as FollowupEvent;
        if (f.status === "COMPLETED" || f.status === "CANCELLED") return false;
        if (isSyntheticFollowup(f) && isLocalFollowupComplete(patientId, f.id)) return false;
        return true;
      }),
    [ordered, patientId, fuTick]
  );

  if (events.length === 0) {
    return (
      <div
        className="ds-app-card flex min-h-[320px] flex-col items-center justify-center border-dashed border-hs-border/60 bg-hs-paper p-8 text-center"
        role="status"
      >
        <div
          className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-hs-cream/90 text-hs-primary ring-1 ring-hs-border/40"
          aria-hidden
        >
          <Stethoscope className="h-8 w-8" strokeWidth={1.3} />
        </div>
        <p className="font-heading max-w-sm text-body-md font-semibold text-hs-ink">Start the first consultation</p>
        <p className="mt-1 max-w-sm text-body-sm text-hs-text-secondary">
          When you document visits and prescriptions, they&rsquo;ll show here in order—your patient&rsquo;s story, at a
          glance.
        </p>
        <div className="mt-6">
          <Link
            href="/consultation"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-hs-primary px-5 text-body-sm font-semibold text-white shadow-ds-sm transition hover:bg-hs-primary-light focus:outline-none focus:ring-2 focus:ring-hs-primary/30"
          >
            Open consultation
          </Link>
        </div>
      </div>
    );
  }

  if (visible.length === 0 && events.length > 0) {
    return (
      <p className="rounded-2xl border border-hs-border/60 bg-hs-paper p-6 text-body-sm text-hs-text-secondary" role="status">
        No events to show right now (completed items are hidden from the timeline).
      </p>
    );
  }

  return (
    <div className="relative mx-auto w-full max-w-3xl">
      <div
        className="pointer-events-none absolute bottom-0 left-4 top-0 w-px bg-hs-border/90 md:left-1/2 md:-translate-x-1/2"
        aria-hidden
      />
      <ol className="relative m-0 list-none space-y-10 p-0" aria-label="Clinical timeline">
        {visible.map((e, i) => {
          const isFuture =
            e.kind === "followup" &&
            new Date((e as FollowupEvent).dueAt).getTime() > now.getTime() &&
            !(e as FollowupEvent).overdue;
          return (
            <li
              key={`${e.kind}-${e.id}-${i}`}
              className="relative pl-12 sm:pl-14 md:pl-0 md:pr-[2%] md:pl-[calc(50%+0.75rem)]"
            >
              <span
                className={cn(
                  "absolute left-1.5 top-3 z-[1] h-2.5 w-2.5 rounded-full border-2 border-hs-paper sm:left-2.5 md:left-1/2 md:-translate-x-1/2",
                  e.kind === "consultation" && "bg-hs-primary",
                  e.kind === "prescription" && "bg-hs-text-tertiary",
                  e.kind === "followup" && "bg-hs-warning",
                  e.kind === "document" && "bg-hs-text-secondary"
                )}
                aria-hidden
              />
              {e.kind === "consultation" ? <ConsultationCard c={e} /> : null}
              {e.kind === "prescription" ? <PrescriptionCard p={e} /> : null}
              {e.kind === "followup" ? (
                <FollowupCard
                  f={e as FollowupEvent}
                  isFuture={isFuture}
                  pending={pendingId === e.id}
                  onMarkChange={(v) => void onToggle(e as FollowupEvent, v)}
                />
              ) : null}
              {e.kind === "document" ? <DocumentCard d={e as DocumentEvent} /> : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function ConsultationCard({ c }: { c: ConsultationEvent }): JSX.Element {
  const d = c.detail;
  const hasStructured = Boolean(d && (d.chiefComplaints || d.emotionalState || d.timeline || d.physicalSymptoms));
  return (
    <div className="ds-app-card overflow-hidden border-hs-primary/25 bg-hs-paper p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-caption-sm font-semibold uppercase tracking-wide text-hs-primary">Consultation</span>
        <Stethoscope className="h-4 w-4 text-hs-primary" strokeWidth={1.75} aria-hidden />
        <time className="text-caption-sm text-hs-text-tertiary" dateTime={c.at}>
          {new Date(c.at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
        </time>
        <span className="rounded-full border border-hs-border/60 bg-hs-cream/90 px-2 py-0.5 text-caption-sm text-hs-text-secondary">
          {c.visitType === "INITIAL" ? "Initial" : "Follow-up"}
        </span>
        {c.hasNoteFinal ? (
          <span className="text-caption-sm text-hs-text-tertiary">Notes finalised</span>
        ) : (
          <span className="text-caption-sm text-amber-800/90">Review pending</span>
        )}
      </div>

      {hasStructured ? (
        <dl className="mt-4 space-y-3 text-body-sm text-hs-ink">
          {d?.chiefComplaints ? (
            <div>
              <dt className="flex items-center gap-1.5 text-caption-sm font-semibold uppercase tracking-wide text-hs-text-tertiary">
                <FileText className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                Chief complaints
              </dt>
              <dd className="mt-1 leading-relaxed">{d.chiefComplaints}</dd>
            </div>
          ) : null}
          {d?.emotionalState ? (
            <div>
              <dt className="flex items-center gap-1.5 text-caption-sm font-semibold uppercase tracking-wide text-hs-text-tertiary">
                <HeartPulse className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                Emotional state
              </dt>
              <dd className="mt-1 leading-relaxed">{d.emotionalState}</dd>
            </div>
          ) : null}
          {d?.physicalSymptoms ? (
            <div>
              <dt className="text-caption-sm font-semibold uppercase tracking-wide text-hs-text-tertiary">
                Physical / generals
              </dt>
              <dd className="mt-1 leading-relaxed">{d.physicalSymptoms}</dd>
            </div>
          ) : null}
          {d?.timeline ? (
            <div>
              <dt className="flex items-center gap-1.5 text-caption-sm font-semibold uppercase tracking-wide text-hs-text-tertiary">
                <History className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                Timeline
              </dt>
              <dd className="mt-1 leading-relaxed">{d.timeline}</dd>
            </div>
          ) : null}
        </dl>
      ) : (
        <p className="mt-3 line-clamp-4 text-body-sm leading-relaxed text-hs-ink">{c.summary}</p>
      )}

      <div className="mt-4">
        <Link
          href={`/consultation/${c.consultationId}`}
          className="inline-flex min-h-9 items-center justify-center rounded-lg border border-hs-primary/35 bg-hs-cream/70 px-3 text-body-sm font-medium text-hs-primary transition hover:border-hs-primary/55"
        >
          Open consultation
        </Link>
      </div>
    </div>
  );
}

function PrescriptionCard({ p }: { p: PrescriptionEvent }): JSX.Element {
  const lines = p.items
    .filter((x) => (x.remedy && x.remedy.length > 0) || (x.dosage && x.dosage.length > 0))
    .slice(0, 6);
  return (
    <div className="ds-app-card overflow-hidden p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2 text-hs-ink">
        <Pill className="h-4 w-4 text-hs-text-secondary" strokeWidth={1.75} aria-hidden />
        <span className="text-body-sm font-semibold">Prescription issued</span>
        <time className="text-caption-sm text-hs-text-tertiary" dateTime={p.at}>
          {new Date(p.at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
        </time>
      </div>
      {lines.length > 0 ? (
        <ul className="mt-3 list-disc space-y-1.5 pl-4 text-body-sm text-hs-text-secondary" aria-label="Remedies on this script">
          {lines.map((it, j) => (
            <li key={j}>
              {it.remedy ? <span className="font-medium text-hs-ink">{it.remedy}</span> : <span>—</span>}
              {it.dosage ? <span> · {it.dosage}</span> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-body-sm text-hs-text-tertiary">Items on file (view record for detail).</p>
      )}
    </div>
  );
}

function FollowupCard({
  f,
  isFuture,
  pending,
  onMarkChange
}: {
  f: FollowupEvent;
  isFuture: boolean;
  pending: boolean;
  onMarkChange: (v: boolean) => void;
}): JSX.Element {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border p-4 shadow-ds-sm sm:p-5",
        f.overdue
          ? "border-amber-300/60 bg-amber-50/90"
          : isFuture
            ? "border-amber-200/60 bg-amber-50/40"
            : "border-amber-200/50 bg-amber-50/70"
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Calendar className="h-4 w-4 text-amber-900/70" strokeWidth={1.75} aria-hidden />
        <span className="text-body-sm font-semibold text-amber-950/90">Follow-up due</span>
        <time className="text-caption-sm text-hs-text-secondary" dateTime={f.dueAt}>
          Due: {new Date(f.dueAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
        </time>
        {f.overdue ? (
          <span className="rounded bg-amber-200/60 px-1.5 text-[10px] font-semibold uppercase text-amber-900">
            Overdue
          </span>
        ) : null}
        {f.source === "suggested" ? (
          <span className="rounded bg-hs-cream/80 px-1.5 text-[10px] font-semibold uppercase text-hs-text-tertiary">
            Suggested
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-body-sm text-hs-ink">{f.title}</p>
      {f.reason && f.reason !== f.title ? (
        <p className="mt-1 text-caption-sm text-hs-text-secondary">{f.reason}</p>
      ) : null}
      <div className="mt-3 flex items-center gap-2">
        <input
          type="checkbox"
          id={`fu-${f.id}`}
          disabled={pending}
          onChange={(e) => onMarkChange(e.target.checked)}
          className="h-4 w-4 rounded border-hs-border/70 text-amber-700 focus:ring-amber-400/30 disabled:opacity-60"
        />
        <label htmlFor={`fu-${f.id}`} className="text-body-sm text-hs-text-secondary">
          {pending ? "Saving…" : "Mark as complete"}
        </label>
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin text-amber-700/40" aria-hidden />
        ) : (
          <CheckCircle2 className="h-4 w-4 text-amber-700/30" aria-hidden />
        )}
      </div>
    </div>
  );
}

function DocumentCard({ d }: { d: DocumentEvent }): JSX.Element {
  const onOpen = async (): Promise<void> => {
    try {
      const { downloadUrl } = await fetchPresignDownload(d.objectKey);
      if (downloadUrl) window.open(downloadUrl, "_blank", "noopener,noreferrer");
    } catch {
      /* noop */
    }
  };
  return (
    <div className="ds-app-card overflow-hidden p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2 text-hs-ink">
        <FileText className="h-4 w-4 text-hs-text-secondary" strokeWidth={1.75} aria-hidden />
        <span className="text-body-sm font-semibold">Document uploaded</span>
        <time className="text-caption-sm text-hs-text-tertiary" dateTime={d.at}>
          {new Date(d.at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
        </time>
      </div>
      <p className="mt-2 truncate text-body-sm text-hs-ink">{d.filename}</p>
      <div className="mt-3">
        <button
          type="button"
          onClick={() => void onOpen()}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-hs-border/60 bg-hs-paper px-3 text-caption-sm font-semibold text-hs-ink transition hover:border-hs-primary/35"
        >
          <Download className="h-3.5 w-3.5" aria-hidden />
          Download
        </button>
      </div>
    </div>
  );
}

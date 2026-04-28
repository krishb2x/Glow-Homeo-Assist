"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Activity, ArrowRight, Building2, Calendar, Stethoscope, UserCircle2, Users } from "lucide-react";
import { fetchAdminPlatformSummary, type PlatformSummary } from "../../../lib/doctor-api";
import { PageLoad } from "../../ui/page-states";
import { StatCard } from "../../platform/StatCard";

function formatActivityTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export function SuperAdminDashboardView(): JSX.Element {
  const [summary, setSummary] = useState<PlatformSummary | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setErr(null);
    void (async () => {
      try {
        const s = await fetchAdminPlatformSummary();
        if (!cancelled) setSummary(s);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Could not load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (err) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50/80 px-6 py-8 text-sm text-red-800" role="alert">
        {err}
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <PageLoad />
      </div>
    );
  }

  const { stats, growth, recentActivity } = summary;

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-2xl border border-hs-border/35 bg-gradient-to-br from-hs-primary-very-light/90 via-hs-paper to-hs-cream/90 p-8 shadow-ds-md">
        <div className="relative z-10 max-w-2xl">
          <p className="text-caption-sm font-semibold uppercase tracking-[0.14em] text-hs-primary">Platform</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-hs-ink sm:text-3xl">Welcome to your control center</h1>
          <p className="mt-3 text-sm leading-relaxed text-hs-text-secondary">
            Manage tenant clinics, doctors, and scope. This workspace is separate from the clinical console used by doctors at
            the desk.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/clinics"
              className="inline-flex items-center gap-2 rounded-xl bg-hs-primary px-4 py-2.5 text-sm font-semibold text-white shadow-ds-sm transition hover:bg-hs-primary-light"
            >
              Manage clinics
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/doctors"
              className="inline-flex items-center gap-2 rounded-xl border border-hs-border/60 bg-hs-paper/90 px-4 py-2.5 text-sm font-semibold text-hs-ink transition hover:border-hs-primary/35"
            >
              View all doctors
            </Link>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-caption-sm font-semibold uppercase tracking-wide text-hs-text-tertiary">Overview</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total clinics" value={stats.totalClinics} icon={Building2} />
          <StatCard label="Active doctors" value={stats.totalDoctors} icon={Stethoscope} hint="Profiles with doctor role" />
          <StatCard label="Total patients" value={stats.totalPatients} icon={Users} hint="Across all clinics" />
          <StatCard
            label="Consultations today"
            value={stats.consultationsToday}
            icon={Calendar}
            hint={`${growth.consultationsLast7d} in last 7 days`}
          />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-3 flex items-center gap-2 text-caption-sm font-semibold uppercase tracking-wide text-hs-text-tertiary">
            <Activity className="h-4 w-4" />
            Recent activity
          </h2>
          <div className="rounded-2xl border border-hs-border/30 bg-hs-card shadow-ds-sm">
            {recentActivity.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-hs-text-secondary">No events yet. Create a clinic to get started.</p>
            ) : (
              <ul className="divide-y divide-hs-border/25">
                {recentActivity.map((a) => (
                  <li key={`${a.kind}-${a.id}`} className="flex items-start gap-4 px-5 py-4">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-hs-cream/90 text-hs-primary">
                      {a.kind === "clinic" ? (
                        <Building2 className="h-4 w-4" strokeWidth={1.75} />
                      ) : (
                        <UserCircle2 className="h-4 w-4" strokeWidth={1.75} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-hs-ink">{a.title}</p>
                      <p className="text-caption-sm text-hs-text-tertiary">{a.subtitle}</p>
                    </div>
                    <time className="shrink-0 text-caption-sm tabular-nums text-hs-text-tertiary">{formatActivityTime(a.at)}</time>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div>
          <h2 className="mb-3 text-caption-sm font-semibold uppercase tracking-wide text-hs-text-tertiary">Shortcuts</h2>
          <div className="space-y-2 rounded-2xl border border-hs-border/30 bg-hs-paper/90 p-4 shadow-ds-sm">
            <Link href="/clinics" className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-hs-ink transition hover:bg-hs-cream">
              Clinics
              <ArrowRight className="h-4 w-4 text-hs-text-tertiary" />
            </Link>
            <Link href="/doctors" className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-hs-ink transition hover:bg-hs-cream">
              Doctors
              <ArrowRight className="h-4 w-4 text-hs-text-tertiary" />
            </Link>
            <Link href="/analytics" className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-hs-ink transition hover:bg-hs-cream">
              Analytics
              <ArrowRight className="h-4 w-4 text-hs-text-tertiary" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

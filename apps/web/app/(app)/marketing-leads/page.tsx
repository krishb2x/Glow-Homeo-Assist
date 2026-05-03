"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import {
  getToken,
  listAdminMarketingLeads,
  patchAdminMarketingLead,
  type AdminMarketingLeadRow,
  type MarketingLeadStatus
} from "../../../lib/doctor-api";
import { useAppRole } from "../../../contexts/RoleContext";
import { PageHeader } from "../../../components/platform/PageHeader";
import { TableCard, TableShell } from "../../../components/platform/TableCard";
import { EmptyState } from "../../../components/platform/EmptyState";
import { StatusBadge } from "../../../components/platform/StatusBadge";

const STATUS_OPTIONS: MarketingLeadStatus[] = ["new", "contacted", "qualified", "closed", "lost"];

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return iso;
  }
}

export default function MarketingLeadsPage(): JSX.Element | null {
  const router = useRouter();
  const { role } = useAppRole();
  const [rows, setRows] = useState<AdminMarketingLeadRow[]>([]);
  const [filter, setFilter] = useState<MarketingLeadStatus | "">("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    setErr(null);
    setLoading(true);
    try {
      const { items } = await listAdminMarketingLeads({
        status: filter || undefined,
        limit: 100,
        offset: 0
      });
      setRows(items);
      const nextDrafts: Record<string, string> = {};
      for (const r of items) {
        nextDrafts[r.id] = r.admin_notes ?? "";
      }
      setNoteDrafts(nextDrafts);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not load");
    } finally {
      setLoading(false);
    }
  }, [router, filter]);

  useEffect(() => {
    if (role !== "SUPER_ADMIN") return;
    void load();
  }, [load, role]);

  async function onStatusChange(id: string, lead_status: MarketingLeadStatus): Promise<void> {
    setErr(null);
    try {
      const updated = await patchAdminMarketingLead(id, { lead_status });
      if (filter && updated.lead_status !== filter) {
        setRows((prev) => prev.filter((r) => r.id !== id));
        setNoteDrafts((d) => {
          const next = { ...d };
          delete next[id];
          return next;
        });
      } else {
        setRows((prev) => prev.map((r) => (r.id === id ? updated : r)));
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function saveNotes(id: string): Promise<void> {
    setErr(null);
    setSavingId(id);
    try {
      const raw = noteDrafts[id] ?? "";
      const updated = await patchAdminMarketingLead(id, { admin_notes: raw.trim() === "" ? null : raw.trim() });
      setRows((prev) => prev.map((r) => (r.id === id ? updated : r)));
      setNoteDrafts((d) => ({ ...d, [id]: updated.admin_notes ?? "" }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSavingId(null);
    }
  }

  if (role !== "SUPER_ADMIN") {
    return null;
  }

  return (
    <div>
      <PageHeader
        title="Marketing leads"
        description="Walkthrough and guided-trial requests from the public site. Update pipeline status and internal notes here."
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-hs-text-secondary" htmlFor="lead-filter">
          Status
        </label>
        <select
          id="lead-filter"
          className="min-h-10 rounded-xl border border-hs-border/60 bg-white px-3 text-sm text-hs-ink shadow-sm focus:border-hs-primary/40 focus:outline-none focus:ring-2 focus:ring-hs-primary/15"
          value={filter}
          onChange={(e) => setFilter((e.target.value || "") as MarketingLeadStatus | "")}
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      {err ? (
        <p className="mb-6 text-sm text-red-600" role="alert">
          {err}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-hs-text-secondary" role="status">
          Loading leads…
        </p>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No leads in this view"
          description="Try another status filter, or check back after new submissions from the homepage CTAs."
        />
      ) : (
        <TableCard>
          <TableShell>
            <thead>
              <tr className="border-b border-hs-border/40 bg-hs-cream/50 text-caption-sm font-medium uppercase tracking-wide text-hs-text-tertiary">
                <th className="px-4 py-3.5">When</th>
                <th className="px-4 py-3.5">Name</th>
                <th className="px-4 py-3.5">Contact</th>
                <th className="px-4 py-3.5">City</th>
                <th className="px-4 py-3.5">Intent</th>
                <th className="min-w-[140px] px-4 py-3.5">Status</th>
                <th className="min-w-[220px] px-4 py-3.5">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hs-border/20">
              {rows.map((r) => (
                <tr key={r.id} className="bg-hs-paper/50 align-top transition hover:bg-hs-cream/40">
                  <td className="px-4 py-3 text-caption-sm text-hs-text-secondary">{formatWhen(r.created_at)}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-hs-ink">{r.name}</p>
                    <p className="mt-1 line-clamp-2 text-caption-sm text-hs-text-tertiary">{r.clinic_name}</p>
                    {r.message ? (
                      <p className="mt-1 line-clamp-2 text-caption-sm text-hs-text-secondary">{r.message}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-sm text-hs-text-secondary">
                    <a className="text-hs-primary hover:underline" href={`mailto:${encodeURIComponent(r.email)}`}>
                      {r.email}
                    </a>
                    <p className="mt-1 tabular-nums">{r.phone}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-hs-ink">{r.city}</td>
                  <td className="px-4 py-3">
                    <StatusBadge variant={r.intent === "trial" ? "neutral" : "active"}>
                      {r.intent === "trial" ? "90-day trial" : "Walkthrough"}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="w-full min-h-9 rounded-lg border border-hs-border/60 bg-white px-2 text-caption-sm text-hs-ink focus:border-hs-primary/40 focus:outline-none focus:ring-2 focus:ring-hs-primary/15"
                      value={r.lead_status}
                      onChange={(e) => void onStatusChange(r.id, e.target.value as MarketingLeadStatus)}
                      aria-label={`Status for ${r.name}`}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <textarea
                      className="w-full min-h-[72px] rounded-lg border border-hs-border/60 bg-white px-2 py-1.5 text-caption-sm text-hs-ink focus:border-hs-primary/40 focus:outline-none focus:ring-2 focus:ring-hs-primary/15"
                      value={noteDrafts[r.id] ?? ""}
                      onChange={(e) => setNoteDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
                      placeholder="Internal notes…"
                      maxLength={8000}
                      aria-label={`Notes for ${r.name}`}
                    />
                    <button
                      type="button"
                      onClick={() => void saveNotes(r.id)}
                      disabled={savingId === r.id}
                      className="mt-2 inline-flex min-h-8 items-center justify-center rounded-lg bg-hs-primary px-3 text-caption-sm font-semibold text-white transition hover:bg-hs-primary-light disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingId === r.id ? "Saving…" : "Save notes"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        </TableCard>
      )}
    </div>
  );
}

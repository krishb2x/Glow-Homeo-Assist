"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Building2, CheckCircle2, ChevronDown, Sparkles, Stethoscope, ToggleLeft, ToggleRight, Zap } from "lucide-react";
import {
  getAdminClinic,
  getAdminClinicFeatures,
  patchAdminClinicFeatures,
  type AdminClinicDetail,
  type AdminClinicFeaturesResponse,
  type PlanTier
} from "../../../../lib/doctor-api";
import { useAppRole } from "../../../../contexts/RoleContext";
import { TableCard, TableShell } from "../../../../components/platform/TableCard";
import { StatusBadge } from "../../../../components/platform/StatusBadge";
import { PageLoad } from "../../../../components/ui/page-states";

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

const PLAN_TIERS: { value: PlanTier; label: string; description: string; color: string }[] = [
  { value: "BASIC", label: "Basic", description: "Core clinical workflows — patient management, consultations, prescriptions.", color: "text-hs-text-secondary" },
  { value: "PRO", label: "Pro", description: "All Basic features + AI Notetaker, advanced messaging.", color: "text-hs-primary" },
  { value: "ENTERPRISE", label: "Enterprise", description: "All Pro features + WhatsApp integration, priority support.", color: "text-amber-700" }
];

const FEATURE_META: Record<string, { label: string; description: string; icon: React.ComponentType<{ className?: string }> }> = {
  ai_notetaker: {
    label: "AI Notetaker",
    description: "Real-time transcription + AI-structured clinical notes during consultation.",
    icon: Sparkles
  },
  messages: {
    label: "Messaging",
    description: "Inbox and patient communication within the platform.",
    icon: Stethoscope
  },
  whatsapp_integration: {
    label: "WhatsApp Integration",
    description: "Send prescriptions and reminders to patients via WhatsApp.",
    icon: Zap
  }
};

type SaveState = "idle" | "saving" | "saved" | "error";

export default function ClinicDetailPage(): JSX.Element | null {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : null;
  const router = useRouter();
  const { role, setActiveClinicId } = useAppRole();

  const [data, setData] = useState<AdminClinicDetail | null>(null);
  const [featData, setFeatData] = useState<AdminClinicFeaturesResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Local editable state for the feature panel
  const [selectedTier, setSelectedTier] = useState<PlanTier>("BASIC");
  const [overrides, setOverrides] = useState<Record<string, boolean | null>>({});
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveErr, setSaveErr] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    setErr(null);
    void (async () => {
      try {
        const [d, f] = await Promise.all([getAdminClinic(id), getAdminClinicFeatures(id)]);
        setData(d);
        setFeatData(f);
        setSelectedTier(f.planTier);
        // Populate local overrides from server data
        const initial: Record<string, boolean | null> = {};
        for (const ov of f.overrides) {
          initial[ov.featureKey] = ov.enabled;
        }
        setOverrides(initial);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Could not load");
        setData(null);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (role !== "SUPER_ADMIN" || !id) return;
    load();
  }, [load, role, id]);

  async function saveFeatures() {
    if (!id) return;
    setSaveState("saving");
    setSaveErr(null);
    try {
      // Build overrides object — only include explicit overrides (not null = "use plan default")
      const patchOverrides: Record<string, boolean> = {};
      for (const [key, val] of Object.entries(overrides)) {
        if (val !== null) patchOverrides[key] = val;
      }
      const updated = await patchAdminClinicFeatures(id, {
        planTier: selectedTier,
        overrides: patchOverrides
      });
      setFeatData((prev) => prev ? { ...prev, planTier: updated.planTier, features: updated.features } : prev);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2500);
    } catch (e) {
      setSaveErr(e instanceof Error ? e.message : "Save failed");
      setSaveState("error");
    }
  }

  /** Compute the effective value of a feature given current tier + overrides */
  function effectiveValue(featureKey: string): boolean {
    const ov = overrides[featureKey];
    if (ov !== undefined && ov !== null) return ov;
    const planDefaults = featData?.planDefaults ?? {};
    const defaults = planDefaults[selectedTier] ?? [];
    return defaults.includes(featureKey);
  }

  if (role !== "SUPER_ADMIN" || !id) return null;

  if (err) {
    return (
      <div>
        <Link href="/clinics" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-hs-primary">
          <ArrowLeft className="h-4 w-4" />
          Back to clinics
        </Link>
        <p className="text-sm text-red-600" role="alert">{err}</p>
      </div>
    );
  }

  if (!data) return <PageLoad />;

  const { clinic, doctors } = data;
  const allFeatureKeys = Object.keys(FEATURE_META);

  return (
    <div className="space-y-8">
      <Link href="/clinics" className="inline-flex items-center gap-1.5 text-sm font-medium text-hs-text-secondary transition hover:text-hs-primary">
        <ArrowLeft className="h-4 w-4" />
        Clinics
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-hs-ink">{clinic.name}</h1>
            <StatusBadge variant={clinic.is_active === false ? "inactive" : "active"}>
              {clinic.is_active === false ? "Inactive" : "Active"}
            </StatusBadge>
            {featData ? (
              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                featData.planTier === "ENTERPRISE"
                  ? "border-amber-300 bg-amber-50 text-amber-700"
                  : featData.planTier === "PRO"
                  ? "border-hs-primary/30 bg-hs-primary-very-light text-hs-primary"
                  : "border-hs-border bg-hs-cream text-hs-text-secondary"
              }`}>
                {featData.planTier === "ENTERPRISE" ? "Enterprise" : featData.planTier === "PRO" ? "Pro" : "Basic"}
              </span>
            ) : null}
          </div>
          {clinic.slug ? <p className="mt-1 font-mono text-sm text-hs-text-tertiary">{clinic.slug}</p> : null}
          {clinic.location ? <p className="mt-2 text-sm text-hs-text-secondary">{clinic.location}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/clinics"
            className="inline-flex items-center gap-1 rounded-xl border border-hs-border/50 px-4 py-2 text-sm font-medium text-hs-ink"
          >
            <Building2 className="h-4 w-4" />
            All clinics
          </Link>
          <button
            type="button"
            onClick={() => { setActiveClinicId(id); router.push("/dashboard"); }}
            className="inline-flex items-center gap-2 rounded-xl bg-hs-primary px-4 py-2 text-sm font-semibold text-white shadow-ds-sm"
          >
            Switch to this clinic
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Feature Access Control ─────────────────────────────────────────── */}
      <section>
        <div className="mb-3 flex items-center gap-2 text-caption-sm font-medium uppercase tracking-wide text-hs-text-tertiary">
          <Sparkles className="h-4 w-4" />
          Plan &amp; Feature Access
        </div>

        <div className="rounded-2xl border border-hs-border/50 bg-hs-paper shadow-ds-sm">
          {/* Plan Tier Selector */}
          <div className="border-b border-hs-border/30 px-6 py-5">
            <p className="mb-3 text-sm font-semibold text-hs-ink">Subscription Plan</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {PLAN_TIERS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setSelectedTier(t.value)}
                  className={`group flex flex-col gap-1 rounded-xl border p-4 text-left transition ${
                    selectedTier === t.value
                      ? "border-hs-primary bg-hs-primary-very-light shadow-ds-sm"
                      : "border-hs-border/60 bg-hs-cream/40 hover:border-hs-primary/40 hover:bg-hs-cream"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-semibold ${selectedTier === t.value ? "text-hs-primary" : t.color}`}>{t.label}</span>
                    {selectedTier === t.value && <CheckCircle2 className="h-4 w-4 text-hs-primary" />}
                  </div>
                  <p className="text-xs leading-relaxed text-hs-text-secondary">{t.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Feature Toggles */}
          <div className="divide-y divide-hs-border/20 px-6">
            <p className="pb-3 pt-4 text-xs font-medium uppercase tracking-wide text-hs-text-tertiary">
              Per-feature overrides <span className="normal-case tracking-normal text-hs-text-tertiary/70">(override plan defaults for this clinic)</span>
            </p>
            {allFeatureKeys.map((key) => {
              const meta = FEATURE_META[key];
              if (!meta) return null;
              const planDefault = (featData?.planDefaults[selectedTier] ?? []).includes(key);
              const overrideVal = overrides[key];
              const effective = effectiveValue(key);
              const Icon = meta.icon;

              return (
                <div key={key} className="flex items-start gap-4 py-4">
                  <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                    effective ? "bg-hs-primary-very-light text-hs-primary" : "bg-hs-cream text-hs-text-tertiary"
                  }`}>
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-hs-ink">{meta.label}</p>
                      {planDefault ? (
                        <span className="rounded-full border border-hs-primary/25 bg-hs-primary-very-light px-2 py-0.5 text-[10px] font-medium text-hs-primary">
                          Included in {selectedTier.charAt(0) + selectedTier.slice(1).toLowerCase()}
                        </span>
                      ) : (
                        <span className="rounded-full border border-hs-border bg-hs-cream px-2 py-0.5 text-[10px] font-medium text-hs-text-tertiary">
                          Not in {selectedTier.charAt(0) + selectedTier.slice(1).toLowerCase()}
                        </span>
                      )}
                      {overrideVal !== null && overrideVal !== undefined ? (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                          Admin override: {overrideVal ? "On" : "Off"}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-hs-text-secondary">{meta.description}</p>
                  </div>

                  {/* Override control */}
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <div className="relative">
                      <select
                        value={overrideVal === null || overrideVal === undefined ? "plan" : overrideVal ? "on" : "off"}
                        onChange={(e) => {
                          const v = e.target.value;
                          setOverrides((prev) => ({
                            ...prev,
                            [key]: v === "plan" ? null : v === "on"
                          }));
                        }}
                        className="appearance-none rounded-lg border border-hs-border/60 bg-hs-paper py-1.5 pl-3 pr-7 text-xs font-medium text-hs-ink shadow-sm focus:border-hs-primary focus:outline-none focus:ring-1 focus:ring-hs-primary/30"
                      >
                        <option value="plan">Plan default</option>
                        <option value="on">Force ON</option>
                        <option value="off">Force OFF</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-hs-text-tertiary" />
                    </div>
                    {/* Effective indicator */}
                    <span className={`flex items-center gap-1 text-[10px] font-medium ${effective ? "text-emerald-600" : "text-hs-text-tertiary"}`}>
                      {effective ? <ToggleRight className="h-3 w-3" /> : <ToggleLeft className="h-3 w-3" />}
                      {effective ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Save bar */}
          <div className="flex items-center justify-between rounded-b-2xl border-t border-hs-border/30 bg-hs-cream/40 px-6 py-4">
            <div>
              {saveState === "saved" && (
                <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  Saved
                </p>
              )}
              {saveState === "error" && saveErr && (
                <p className="text-sm text-red-600">{saveErr}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => void saveFeatures()}
              disabled={saveState === "saving"}
              className="inline-flex items-center gap-2 rounded-xl bg-hs-primary px-5 py-2 text-sm font-semibold text-white shadow-ds-sm transition hover:bg-hs-primary-light disabled:opacity-60"
            >
              {saveState === "saving" ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </section>

      {/* ── Doctors ────────────────────────────────────────────────────────── */}
      <section>
        <div className="mb-3 flex items-center gap-2 text-caption-sm font-medium uppercase tracking-wide text-hs-text-tertiary">
          <Stethoscope className="h-4 w-4" />
          Doctors in this clinic
        </div>
        <TableCard>
          {doctors.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-hs-text-secondary">
              No doctor profiles yet. Assign the doctor role in Supabase and set this clinic id.
            </p>
          ) : (
            <TableShell>
              <thead>
                <tr className="border-b border-hs-border/40 bg-hs-cream/50 text-caption-sm font-medium uppercase tracking-wide text-hs-text-tertiary">
                  <th className="px-5 py-3.5">Name</th>
                  <th className="px-4 py-3.5">Last updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hs-border/20">
                {doctors.map((d) => (
                  <tr key={d.id} className="bg-hs-paper/50">
                    <td className="px-5 py-3.5 font-medium text-hs-ink">{d.full_name}</td>
                    <td className="px-4 py-3.5 text-hs-text-secondary">
                      {d.updated_at ? formatTime(d.updated_at) : formatTime(d.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          )}
        </TableCard>
      </section>
    </div>
  );
}

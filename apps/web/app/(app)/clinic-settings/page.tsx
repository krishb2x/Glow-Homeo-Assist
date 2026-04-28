"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Headphones, Mic, Shield, Users } from "lucide-react";
import { fetchClinicPrivacyDefaults, getToken } from "../../../lib/doctor-api";

function readProfileRoleFromStorage(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ha_role");
}

export default function ClinicSettingsPage(): JSX.Element {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [saveAudioDefault, setSaveAudioDefault] = useState<boolean | null>(null);
  const [forbiddenBanner, setForbiddenBanner] = useState(false);

  const load = useCallback(async () => {
    if (typeof window === "undefined" || !getToken()) {
      router.replace("/login");
      return;
    }
    const r = readProfileRoleFromStorage();
    if (r == null) {
      router.replace("/login");
      return;
    }
    setRole(r);
    if (r !== "admin" && r !== "super_admin") {
      router.replace("/dashboard?clinic_settings=forbidden");
      return;
    }
    try {
      const p = await fetchClinicPrivacyDefaults();
      setSaveAudioDefault(p.defaultSaveAudio);
    } catch {
      setSaveAudioDefault(null);
    }
    setChecked(true);
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setForbiddenBanner(new URLSearchParams(window.location.search).get("clinic_settings") === "forbidden");
  }, []);

  if (!checked) {
    return (
      <div className="text-sm text-gh-subtle" role="status">
        Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl min-w-0">
      {forbiddenBanner ? (
        <p className="mb-6 rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-2 text-sm text-amber-950" role="status">
          This area is for clinic managers only. If you need access, ask your clinic admin.
        </p>
      ) : null}

      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg border border-gh-accent/25 bg-gh-cream/80 p-2 text-gh-accent">
          <Building2 className="h-5 w-5" strokeWidth={1.8} aria-hidden />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-gh-ink">Clinic settings</h1>
          <p className="mt-1 text-sm text-gh-muted">
            Configuration for this workspace. Nothing here issues treatment — you and your team remain accountable for
            every clinical decision.
          </p>
          {role ? (
            <p className="mt-2 text-xs text-gh-subtle">
              Signed in as: <span className="font-mono text-gh-ink/80">{role}</span>
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-10 space-y-8">
        <section className="rounded-2xl border border-stone-200/80 bg-gh-paper p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-base font-semibold text-gh-ink">
            <Building2 className="h-4 w-4 text-gh-accent" strokeWidth={2} aria-hidden />
            Clinic profile
          </h2>
          <p className="mt-2 text-sm text-gh-muted">
            Name, address, and region are stored with your Supabase project. Use the platform admin or a future
            “Save profile” action when the API endpoint is connected.
          </p>
          <p className="mt-3 rounded-xl border border-dashed border-stone-200/80 bg-gh-cream/50 px-3 py-2 text-xs text-gh-subtle">
            Placeholder: profile form will bind to <code className="rounded bg-stone-100 px-1">clinics</code> when the
            mutation route is available.
          </p>
        </section>

        <section className="rounded-2xl border border-stone-200/80 bg-gh-paper p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-base font-semibold text-gh-ink">
            <Users className="h-4 w-4 text-gh-accent" strokeWidth={2} aria-hidden />
            Team
          </h2>
          <p className="mt-2 text-sm text-gh-muted">
            Invite or remove doctors, assign roles, and keep access aligned with your organisation. Provisioning
            should follow your SOP; no automatic invitations are sent from this screen yet.
          </p>
          <p className="mt-3 rounded-xl border border-dashed border-stone-200/80 bg-gh-cream/50 px-3 py-2 text-xs text-gh-subtle">
            Connect to <code className="rounded bg-stone-100 px-1">profiles</code> + auth invites in a later API pass.
          </p>
        </section>

        <section className="rounded-2xl border border-stone-200/80 bg-gh-paper p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-base font-semibold text-gh-ink">
            <Mic className="h-4 w-4 text-gh-accent" strokeWidth={2} aria-hidden />
            Consultation &amp; audio
          </h2>
          <p className="mt-2 text-sm text-gh-muted">Retention and capture defaults (read from server today).</p>
          <ul className="mt-3 space-y-2 text-sm text-gh-ink/90">
            <li className="flex items-start gap-2">
              <span className="text-gh-accent">·</span>
              <span>
                Default save live audio to long-term storage:{" "}
                <strong>{saveAudioDefault === null ? "—" : saveAudioDefault ? "On" : "Off"}</strong>{" "}
                <span className="text-gh-subtle">(from API / environment)</span>
              </span>
            </li>
            <li className="flex items-start gap-2 text-gh-subtle text-xs">
              <Shield className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden />
              Audio is for documentation support only; review before any medico-legal use.
            </li>
          </ul>
        </section>

        <section className="rounded-2xl border border-gh-accent/20 bg-gh-cream/60 p-4 text-sm text-gh-muted">
          <p className="flex items-center gap-2 font-medium text-gh-ink">
            <Headphones className="h-4 w-4 text-gh-accent" strokeWidth={2} aria-hidden />
            Need a change in production?
          </p>
          <p className="mt-1.5">Contact platform support; critical policies should be recorded in your clinic SOPs.</p>
        </section>
      </div>
    </div>
  );
}

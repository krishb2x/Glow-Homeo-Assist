"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import { BRAND_NAME } from "../../../lib/brand";
import { fetchWorkspaceContext, getToken, type WorkspaceContext } from "../../../lib/doctor-api";

function readRole(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ha_role");
}

export default function ClinicOverviewPage(): JSX.Element {
  const router = useRouter();
  const [ctx, setCtx] = useState<WorkspaceContext | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(() => {
    if (typeof window === "undefined" || !getToken()) {
      router.replace("/login");
      return;
    }
    void (async () => {
      setErr(null);
      try {
        setCtx(await fetchWorkspaceContext());
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Could not load");
        setCtx({
          fullName: "Doctor",
          firstName: "Doctor",
          clinicName: null,
          clinicId: null
        });
      }
    })();
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const role = readRole();
  const isAdmin = role === "admin" || role === "super_admin";

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-hs-ink sm:text-2xl">
        <Building2 className="h-6 w-6 text-hs-primary/90" strokeWidth={1.75} />
        Clinic
      </h1>
      <p className="mt-1 text-sm text-hs-text-tertiary">Your practice context in {BRAND_NAME}.</p>

      {err ? (
        <p className="mt-4 rounded-xl border border-amber-200/60 bg-amber-50/80 px-4 py-2 text-sm text-amber-950" role="status">
          {err}
        </p>
      ) : null}

      <div className="mt-8 space-y-4 rounded-2xl border border-hs-border/30 bg-hs-card p-6 shadow-card sm:p-8">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-hs-text-tertiary">Clinic name</p>
          <p className="mt-0.5 text-base font-medium text-hs-ink">{ctx?.clinicName ?? "—"}</p>
        </div>
        {ctx?.clinicId ? (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-hs-text-tertiary">Clinic id</p>
            <p className="mt-0.5 font-mono text-sm text-hs-text-secondary">{ctx.clinicId}</p>
          </div>
        ) : null}
        {isAdmin ? (
          <p className="pt-2 text-sm text-hs-text-secondary">
            Administrators can open{" "}
            <Link href="/clinic-settings" className="font-medium text-hs-primary hover:underline">
              advanced clinic settings
            </Link>
            .
          </p>
        ) : (
          <p className="pt-2 text-sm text-hs-text-secondary">
            Changes to practice-wide settings are managed by your clinic administrator.
          </p>
        )}
      </div>
    </div>
  );
}

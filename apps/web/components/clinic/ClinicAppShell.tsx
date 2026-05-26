"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AppLayout } from "../layout/AppLayout";
import { GlobalCommandPalette, useWorkspaceShortcutNav } from "./GlobalCommandPalette";
import { PageError, PageLoad } from "../ui/page-states";
import { clearClientSession, getToken } from "../../lib/doctor-api";
import { NAV_DOCTOR, NAV_SUPER_ADMIN } from "../../lib/nav-config";
import { useAppRole } from "../../contexts/RoleContext";

function isConsultationSessionPath(path: string): boolean {
  return /^\/consultation\/[^/]+$/.test(path);
}

export function ClinicAppShell({ children }: { children: ReactNode }): JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const [tokenReady, setTokenReady] = useState(false);
  const { role, workspace, loading, activeClinicId, clinics, setActiveClinicId, error, refresh } = useAppRole();
  const isLiveConsult = isConsultationSessionPath(pathname);
  /** Dedicated session chrome — no dashboard sidebar during an active visit. */
  const consultationMode = isLiveConsult;

  useWorkspaceShortcutNav();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!getToken()) {
      const next = pathname && pathname.length > 0 ? pathname : "/dashboard";
      router.replace(`/login?next=${encodeURIComponent(next)}`);
      setTokenReady(false);
      return;
    }
    setTokenReady(true);
  }, [router, pathname, loading]);

  function handleLogout(): void {
    clearClientSession();
    router.push("/login");
    router.refresh();
  }

  if (!tokenReady) {
    return (
      <div className="min-h-screen bg-hs-surface">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          <PageLoad />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-hs-surface">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          <p className="mb-ds-lg text-typo-small font-medium text-hs-text-tertiary" role="status">
            Preparing your workspace
          </p>
          <PageLoad />
        </div>
      </div>
    );
  }

  if (error && role === null) {
    return (
      <div className="min-h-screen bg-hs-surface">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          <PageError err={error} title="Unable to load data" onRetry={() => void refresh()} />
        </div>
      </div>
    );
  }

  if (role === null) {
    return (
      <div className="min-h-screen bg-hs-surface">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          <PageLoad />
        </div>
      </div>
    );
  }

  if (role === "PATIENT") {
    return (
      <div className="min-h-screen bg-hs-surface">
        <PageLoad />
      </div>
    );
  }

  const navItems = role === "SUPER_ADMIN" ? NAV_SUPER_ADMIN : NAV_DOCTOR;
  const displayName = workspace?.fullName ?? "User";
  const clinicContextLabel =
    role === "SUPER_ADMIN" ? "Platform" : (workspace?.clinicName ?? (activeClinicId ? `Clinic ${activeClinicId.slice(0, 8)}…` : "Clinic"));

  const clinicSelector =
    role === "SUPER_ADMIN" && clinics.length > 0 ? (
      <p className="mt-0.5 text-typo-small leading-snug text-hs-text-tertiary" title="Use the top bar to switch context">
        Active data scope is set in the top bar.
      </p>
    ) : null;

  const platformViewing =
    role === "SUPER_ADMIN" && clinics.length > 0 ? (
      <div
        className="flex min-w-0 max-w-md items-center gap-2.5 rounded-full border border-hs-border/50 bg-hs-cream/80 px-3 py-2 shadow-ds-sm"
        title="APIs use this clinic via X-Clinic-Id"
      >
        <span className="shrink-0 text-caption-sm font-medium uppercase tracking-wide text-hs-text-tertiary">Viewing</span>
        <label className="sr-only" htmlFor="gh-platform-clinic">
          Active clinic
        </label>
        <select
          id="gh-platform-clinic"
          className="min-w-0 max-w-[min(320px,46vw)] cursor-pointer truncate rounded-lg border border-hs-border/40 bg-hs-paper px-2.5 py-1 text-body-sm font-semibold text-hs-ink"
          value={activeClinicId ?? ""}
          onChange={(e) => setActiveClinicId(e.target.value)}
        >
          {clinics.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
    ) : role === "SUPER_ADMIN" && clinics.length === 0 ? (
      <p className="text-caption-sm text-amber-900">Add a clinic to set scope.</p>
    ) : null;

  const hideNewPatient = pathname === "/dashboard" || role === "SUPER_ADMIN";
  const mainMaxClass =
    role === "SUPER_ADMIN"
      ? "max-w-7xl"
      : pathname === "/messages"
        ? "max-w-[1600px]"
        : pathname === "/appointments"
          ? "max-w-[1600px]"
          : "max-w-6xl";

  return (
    <>
      <GlobalCommandPalette />
      <AppLayout
        mode={consultationMode ? "session" : "app"}
        pathname={pathname}
        clinicId={activeClinicId}
        doctorName={displayName}
        onLogout={handleLogout}
        mainMaxClass={mainMaxClass}
        mainFullBleed={false}
        hideNewPatient={hideNewPatient}
        navItems={navItems}
        clinicContextLabel={clinicContextLabel}
        clinicSelector={clinicSelector}
        headerLeading={role === "SUPER_ADMIN" ? platformViewing : undefined}
        showSidebarKeyboardHints={role !== "SUPER_ADMIN"}
      >
        {children}
      </AppLayout>
    </>
  );
}

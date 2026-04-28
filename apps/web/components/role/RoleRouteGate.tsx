"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAppRole } from "../../contexts/RoleContext";

const SUPER_ONLY_PREFIXES = ["/clinics", "/doctors", "/analytics"];
const DOCTOR_AREA_PREFIXES = [
  "/patients",
  "/consultation",
  "/follow-ups",
  "/messages",
  "/appointments",
  "/clinic",
  "/clinic-settings"
];

function pathMatchesOne(path: string, prefixes: string[]): boolean {
  return prefixes.some((p) => path === p || path.startsWith(`${p}/`));
}

/**
 * Redirects PATIENT to login; keeps SUPER_ADMIN off clinical routes and DOCTOR off platform routes.
 */
export function RoleRouteGate({ children }: { children: ReactNode }): JSX.Element {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const { role, loading } = useAppRole();

  useEffect(() => {
    if (loading) return;
    if (role === "PATIENT") {
      const next = encodeURIComponent(pathname || "/dashboard");
      router.replace(`/login?reason=mobile&next=${next}`);
      return;
    }
    if (role === "SUPER_ADMIN" && pathMatchesOne(pathname, DOCTOR_AREA_PREFIXES)) {
      router.replace("/dashboard");
      return;
    }
    if (role === "DOCTOR" && pathMatchesOne(pathname, SUPER_ONLY_PREFIXES)) {
      router.replace("/dashboard");
      return;
    }
  }, [role, loading, pathname, router]);

  if (!loading && role === "PATIENT") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-hs-surface px-6 text-center">
        <p className="text-body-sm text-hs-text-secondary">Redirecting…</p>
      </div>
    );
  }

  return <>{children}</>;
}

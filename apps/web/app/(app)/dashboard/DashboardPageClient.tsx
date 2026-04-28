"use client";

import { Suspense } from "react";
import { DashboardView } from "../../../components/clinic/dashboard/DashboardView";
import { SuperAdminDashboardView } from "../../../components/clinic/dashboard/SuperAdminDashboardView";
import { useAppRole } from "../../../contexts/RoleContext";
import { PageLoad } from "../../../components/ui/page-states";

export function DashboardPageClient(): JSX.Element {
  const { role, loading } = useAppRole();

  if (loading || role === null) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2">
        <PageLoad />
      </div>
    );
  }

  if (role === "SUPER_ADMIN") {
    return <SuperAdminDashboardView />;
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-hs-text-secondary" role="status">
          Loading workspace…
        </div>
      }
    >
      <DashboardView />
    </Suspense>
  );
}

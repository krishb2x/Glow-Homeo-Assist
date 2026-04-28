"use client";

import { useEffect, useState } from "react";
import { BarChart2, Building2, Stethoscope, Activity } from "lucide-react";
import { fetchAdminPlatformSummary, type PlatformSummary } from "../../../lib/doctor-api";
import { useAppRole } from "../../../contexts/RoleContext";
import { PageHeader } from "../../../components/platform/PageHeader";
import { StatCard } from "../../../components/platform/StatCard";
import { PageLoad } from "../../../components/ui/page-states";

export default function AnalyticsPage(): JSX.Element | null {
  const { role } = useAppRole();
  const [s, setS] = useState<PlatformSummary | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (role !== "SUPER_ADMIN") return;
    let c = false;
    void (async () => {
      try {
        const d = await fetchAdminPlatformSummary();
        if (!c) setS(d);
      } catch (e) {
        if (!c) setErr(e instanceof Error ? e.message : "Could not load");
      }
    })();
    return () => {
      c = true;
    };
  }, [role]);

  if (role !== "SUPER_ADMIN") {
    return null;
  }

  if (err) {
    return <p className="text-sm text-red-600">{err}</p>;
  }
  if (!s) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <PageLoad />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Lightweight operational metrics. Detailed reporting can be added when you connect a warehouse or BI tool."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total consultations (7d)"
          value={s.growth.consultationsLast7d}
          icon={Activity}
          hint="By started_at in your database"
        />
        <StatCard label="Clinics" value={s.stats.totalClinics} icon={Building2} />
        <StatCard label="Doctors" value={s.stats.totalDoctors} icon={Stethoscope} />
      </div>
      <p className="mt-8 flex items-center gap-2 text-sm text-hs-text-tertiary">
        <BarChart2 className="h-4 w-4" />
        Charts and exports are intentionally omitted in this build to keep the control plane fast and calm.
      </p>
    </div>
  );
}

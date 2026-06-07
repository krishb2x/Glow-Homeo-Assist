"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { BRAND } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Activity, ClipboardList, Clock, CheckCircle2, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function OperationsDashboard() {
  const [stats, setStats] = useState({
    newCases: 0,
    assignedCases: 0,
    activeTreatments: 0,
    pendingFollowups: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      const supabase = getSupabaseBrowser();
      const clinicId = BRAND.clinicId;

      // In a real app, this would be an RPC call for performance
      // Here we just do some basic counts
      const [
        { count: newCount },
        { count: assignedCount },
        { count: activeCount },
        { count: followupCount }
      ] = await Promise.all([
        supabase.from("mt_cases").select("*", { count: "exact", head: true }).eq("clinic_id", clinicId).eq("status", "new"),
        supabase.from("mt_cases").select("*", { count: "exact", head: true }).eq("clinic_id", clinicId).eq("status", "assigned"),
        supabase.from("mt_cases").select("*", { count: "exact", head: true }).eq("clinic_id", clinicId).eq("status", "active_treatment"),
        supabase.from("mt_cases").select("*", { count: "exact", head: true }).eq("clinic_id", clinicId).eq("status", "followup")
      ]);

      setStats({
        newCases: newCount || 0,
        assignedCases: assignedCount || 0,
        activeTreatments: activeCount || 0,
        pendingFollowups: followupCount || 0
      });
      setLoading(false);
    }
    
    loadStats();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Operations Control Center</h2>
          <p className="text-sm text-slate-500 mt-1">Manage MediTonic lead flow and doctor assignments.</p>
        </div>
        <div className="flex gap-3">
          <Button asChild>
            <Link href="/admin/operations/cases">View All Cases</Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-slate-500">Loading operations data...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-500">New Cases</p>
                  <p className="text-3xl font-semibold text-slate-900">{stats.newCases}</p>
                </div>
                <div className="p-2 bg-blue-50 rounded-lg">
                  <UserPlus className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-4">Needs assignment</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-500">Assigned Cases</p>
                  <p className="text-3xl font-semibold text-slate-900">{stats.assignedCases}</p>
                </div>
                <div className="p-2 bg-amber-50 rounded-lg">
                  <Users className="w-5 h-5 text-amber-600" />
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-4">Pending sync to GlowHomeo</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-500">Active Treatments</p>
                  <p className="text-3xl font-semibold text-slate-900">{stats.activeTreatments}</p>
                </div>
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <Activity className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-4">Currently in clinical workflow</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-500">Pending Follow-ups</p>
                  <p className="text-3xl font-semibold text-slate-900">{stats.pendingFollowups}</p>
                </div>
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Clock className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-4">Requires outreach</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Placeholders for future charts / doctor workload */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Recent Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-center justify-center text-sm text-slate-500 border-2 border-dashed border-slate-100 rounded-lg">
              Activity timeline will appear here
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Doctor Workload</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-center justify-center text-sm text-slate-500 border-2 border-dashed border-slate-100 rounded-lg">
              Doctor case allocation chart will appear here
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

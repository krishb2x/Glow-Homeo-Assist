"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { BRAND } from "@/lib/constants";
import { Card } from "@/components/ui/Card";
import { Loader2, ArrowRight, UserPlus, FileText, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function CasesListPage() {
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCases() {
      const supabase = getSupabaseBrowser();
      const clinicId = BRAND.clinicId;

      const { data, error } = await supabase
        .from("mt_cases")
        .select(`
          *,
          profiles:assigned_doctor_id (full_name)
        `)
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setCases(data);
      } else {
        console.error("Failed to fetch cases", error);
      }
      setLoading(false);
    }
    fetchCases();
  }, []);

  const getStatusBadge = (status: string) => {
    const map: any = {
      new: "bg-blue-100 text-blue-700",
      under_review: "bg-purple-100 text-purple-700",
      assigned: "bg-amber-100 text-amber-700",
      patient_created: "bg-indigo-100 text-indigo-700",
      scheduled: "bg-cyan-100 text-cyan-700",
      completed: "bg-emerald-100 text-emerald-700",
      active_treatment: "bg-emerald-100 text-emerald-700",
      followup: "bg-orange-100 text-orange-700",
      closed: "bg-slate-100 text-slate-700"
    };
    return map[status] || "bg-slate-100 text-slate-700";
  };

  const getPaymentBadge = (status: string) => {
    const map: any = {
      pending: "bg-slate-100 text-slate-700",
      captured: "bg-emerald-100 text-emerald-700",
      failed: "bg-red-100 text-red-700"
    };
    return map[status] || "bg-slate-100 text-slate-700";
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">All Cases</h2>
          <p className="text-sm text-slate-500 mt-1">Manage and track all operational transactions.</p>
        </div>
      </div>

      <Card className="border-0 shadow-sm overflow-hidden bg-white">
        {loading ? (
          <div className="flex justify-center items-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        ) : cases.length === 0 ? (
          <div className="text-center py-24 px-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">No cases found</h3>
            <p className="text-slate-500 max-w-sm mx-auto">
              Once a lead submits a form or books a consultation, it will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-medium">Patient</th>
                  <th className="px-6 py-4 font-medium">Type / Concern</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Payment</th>
                  <th className="px-6 py-4 font-medium">Assigned To</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cases.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{c.patient_name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{c.mobile}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="capitalize font-medium">{c.case_type}</div>
                      <div className="text-xs text-slate-500 capitalize">{c.concern_category?.replace('-', ' ')}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium uppercase tracking-wider ${getStatusBadge(c.status)}`}>
                        {c.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium uppercase tracking-wider ${getPaymentBadge(c.payment_status)}`}>
                        {c.payment_status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {c.profiles?.full_name ? (
                        <div className="text-sm font-medium text-slate-700">{c.profiles.full_name}</div>
                      ) : (
                        <span className="text-slate-400 italic text-xs">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/operations/cases/${c.id}`}>
                          Manage <ArrowRight className="ml-2 w-4 h-4" />
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

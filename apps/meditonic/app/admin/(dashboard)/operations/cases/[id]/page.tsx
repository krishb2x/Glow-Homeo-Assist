"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Loader2, ArrowLeft, UserPlus, FileText, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";

export default function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [caseId, setCaseId] = useState<string>("");
  const [caseData, setCaseData] = useState<any>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    params.then(p => {
      setCaseId(p.id);
      fetchData(p.id);
    });
  }, [params]);

  async function fetchData(id: string) {
    const supabase = getSupabaseBrowser();

    // Fetch Case
    const { data: cData, error: cError } = await supabase
      .from("mt_cases")
      .select(`
        *,
        profiles:assigned_doctor_id (full_name)
      `)
      .eq("id", id)
      .single();

    if (!cError && cData) {
      setCaseData(cData);
    }

    // Fetch Doctors (Assuming profiles table has doctors)
    const { data: dData } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .in("role", ["doctor", "admin"]);

    // If 'role' is not available, just fetch some profiles for the demo
    if (dData && dData.length > 0) {
      setDoctors(dData);
    } else {
      // Fallback fetch if role doesn't match
      const { data: fallbackDocs } = await supabase.from("profiles").select("id, full_name").limit(10);
      if (fallbackDocs) setDoctors(fallbackDocs);
    }

    setLoading(false);
  }

  const handleAssignDoctor = async (doctorId: string) => {
    setAssigning(true);
    try {
      const res = await fetch(`/api/admin/cases/${caseId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorId })
      });

      if (!res.ok) throw new Error("Failed to assign doctor");
      
      alert("Doctor assigned successfully");
      await fetchData(caseId);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="text-center py-24">
        <p className="text-slate-500">Case not found.</p>
        <Button asChild className="mt-4" variant="outline"><Link href="/admin/operations/cases">Back to Cases</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-4">
        <Link href="/admin/operations/cases" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </Link>
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Case Details: {caseData.patient_name}</h2>
          <p className="text-sm text-slate-500 mt-1">Ref: {caseData.id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column - Details */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="border-b border-slate-100 bg-slate-50">
              <CardTitle className="text-lg">Patient Information</CardTitle>
            </CardHeader>
            <CardContent className="p-6 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Name</p>
                <p className="text-slate-900 font-medium">{caseData.patient_name}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Mobile</p>
                <p className="text-slate-900 font-medium">{caseData.mobile}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Email</p>
                <p className="text-slate-900 font-medium">{caseData.email || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Age/Gender</p>
                <p className="text-slate-900 font-medium">{caseData.age || "N/A"} / {caseData.gender || "N/A"}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-slate-100 bg-slate-50">
              <CardTitle className="text-lg">Case Request Details</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Type</p>
                  <p className="text-slate-900 font-medium capitalize">{caseData.case_type}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Concern</p>
                  <p className="text-slate-900 font-medium capitalize">{caseData.concern_category?.replace('-', ' ') || "N/A"}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Description</p>
                <p className="text-slate-700 bg-slate-50 p-4 rounded-md border border-slate-100">{caseData.description || "No specific details provided."}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Status & Assignment */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="border-b border-slate-100 bg-slate-50">
              <CardTitle className="text-lg">Assignment</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="mb-6">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">Current Doctor</p>
                {caseData.profiles?.full_name ? (
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-md">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-medium">{caseData.profiles.full_name}</span>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 text-amber-700 border border-amber-100 rounded-md">
                    <span className="font-medium">Unassigned</span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">Assign to Doctor</p>
                <select 
                  className="w-full text-sm rounded-md border border-slate-200 p-2" 
                  id="doctor-select"
                >
                  <option value="">Select a Doctor...</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>{d.full_name} {d.role ? `(${d.role})` : ''}</option>
                  ))}
                </select>
                <Button 
                  className="w-full" 
                  disabled={assigning}
                  onClick={() => {
                    const select = document.getElementById("doctor-select") as HTMLSelectElement;
                    if (select.value) handleAssignDoctor(select.value);
                  }}
                >
                  {assigning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                  Assign Doctor
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
             <CardHeader className="border-b border-slate-100 bg-slate-50">
              <CardTitle className="text-lg">Operations</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <span className="text-sm text-slate-500">Payment</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium uppercase tracking-wider ${caseData.payment_status === 'captured' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {caseData.payment_status}
                </span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <span className="text-sm text-slate-500">GlowHomeo Sync</span>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium uppercase tracking-wider ${caseData.sync_status === 'synced' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {caseData.sync_status}
                  </span>
                  {caseData.sync_status !== 'synced' && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-7 text-xs"
                      onClick={async () => {
                        try {
                          const res = await fetch(`/api/admin/cases/${caseId}/sync`, { method: "POST" });
                          if (!res.ok) throw new Error("Failed to sync");
                          alert("Successfully synced with GlowHomeo!");
                          window.location.reload();
                        } catch (err: any) {
                          alert(err.message);
                        }
                      }}
                    >
                      Sync Now
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

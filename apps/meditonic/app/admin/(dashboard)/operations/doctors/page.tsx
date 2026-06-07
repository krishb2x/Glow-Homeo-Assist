"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/Button";
import { Loader2, Stethoscope, CheckCircle2, XCircle } from "lucide-react";
import { BRAND } from "@/lib/constants";

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      const supabase = getSupabaseBrowser();
      
      // Fetch doctors
      const { data: dData, error: dError } = await supabase
        .from("doctors")
        .select("*")
        .order("name");

      if (dError) throw dError;

      // Fetch case counts per doctor
      const { data: cData, error: cError } = await supabase
        .from("mt_cases")
        .select("doctor_id, status")
        .eq("clinic_id", BRAND.clinicId)
        .not("doctor_id", "is", null);

      if (cError) throw cError;

      // Map case counts to doctors
      const mapped = (dData || []).map(doc => {
        const docCases = (cData || []).filter(c => c.doctor_id === doc.id);
        const activeCount = docCases.filter(c => c.status === "assigned" || c.status === "active").length;
        const totalCount = docCases.length;
        return { ...doc, activeCount, totalCount };
      });

      setDoctors(mapped);
    } catch (error) {
      console.error("Error fetching doctors:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAvailability = async (id: string, currentStatus: boolean) => {
    try {
      const supabase = getSupabaseBrowser();
      const { error } = await supabase
        .from("doctors")
        .update({ is_active: !currentStatus })
        .eq("id", id);

      if (error) throw error;
      await fetchDoctors();
    } catch (err) {
      alert("Failed to update status");
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-mt-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-mt-text flex items-center gap-2">
            <Stethoscope className="h-8 w-8 text-mt-primary" />
            Doctor Management
          </h1>
          <p className="text-mt-text-secondary mt-1">Manage doctor availability and monitor caseloads.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {doctors.map(doc => (
          <div key={doc.id} className="bg-white rounded-2xl border border-mt-border p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            {/* Status Indicator Strip */}
            <div className={`absolute top-0 left-0 w-1 h-full ${doc.is_active ? 'bg-mt-success' : 'bg-slate-300'}`}></div>
            
            <div className="flex justify-between items-start pl-2 mb-4">
              <div>
                <h3 className="font-bold text-lg text-mt-text">Dr. {doc.name}</h3>
                <p className="text-sm font-medium text-mt-text-secondary">{doc.specialization}</p>
              </div>
              <button 
                onClick={() => toggleAvailability(doc.id, doc.is_active)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border transition-all ${
                  doc.is_active 
                    ? "bg-mt-success/10 text-mt-success border-mt-success/20 hover:bg-red-50 hover:text-red-600 hover:border-red-200" 
                    : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-mt-success/10 hover:text-mt-success hover:border-mt-success/20"
                }`}
              >
                {doc.is_active ? <><CheckCircle2 className="w-3 h-3"/> Active</> : <><XCircle className="w-3 h-3"/> Offline</>}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-mt-border pt-4 pl-2 mt-4">
              <div>
                <p className="text-xs uppercase tracking-wider font-semibold text-mt-text-secondary mb-1">Active Cases</p>
                <p className={`text-2xl font-bold ${doc.activeCount > 0 ? 'text-mt-primary' : 'text-slate-400'}`}>{doc.activeCount}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider font-semibold text-mt-text-secondary mb-1">Total Handled</p>
                <p className="text-2xl font-bold text-slate-700">{doc.totalCount}</p>
              </div>
            </div>
            
            {!doc.is_active && (
              <div className="mt-4 pl-2">
                <p className="text-xs text-orange-600 bg-orange-50 px-2 py-1.5 rounded border border-orange-100">
                  This doctor will not appear in the assignment queue.
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

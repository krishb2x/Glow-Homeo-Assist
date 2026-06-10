"use client";

import { useEffect, useState, useMemo } from "react";
import { getSupabaseBrowser } from "../../../../../lib/supabase-browser";
import { Button } from "../../../../../components/ui/Button";
import { Loader2, ArrowRight, Filter, Search, CheckCircle2, Clock, XCircle, AlertCircle, CalendarClock } from "lucide-react";
import Link from "next/link";
import { BRAND } from "../../../../../lib/constants";

export default function CasesPage() {
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [clinicalPhase, setClinicalPhase] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    try {
      const supabase = getSupabaseBrowser();
      const { data, error } = await supabase
        .from("mt_cases")
        .select("*, doctor:profiles(full_name)")
        .eq("clinic_id", BRAND.clinicId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCases(data || []);
    } catch (error) {
      console.error("Error fetching cases:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCases = useMemo(() => {
    return cases.filter(c => {
      let matchPhase = true;
      if (clinicalPhase === "unassigned") {
        matchPhase = c.status === "new" || !c.assigned_doctor_id;
      } else if (clinicalPhase === "active") {
        matchPhase = ["under_review", "assigned", "scheduled", "active_treatment"].includes(c.status);
      } else if (clinicalPhase === "followup") {
        matchPhase = c.status === "followup";
      } else if (clinicalPhase === "closed") {
        matchPhase = ["completed", "closed"].includes(c.status);
      }

      const matchSearch = c.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.id.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchPhase && matchSearch;
    });
  }, [cases, clinicalPhase, searchQuery]);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Clinical Triage Queue</h1>
          <p className="text-slate-500 mt-1">Manage and assign patient cases across the clinic.</p>
        </div>
      </div>

      {/* Modern Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by patient name or case ID..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 px-1 whitespace-nowrap">Clinical Phase</label>
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide w-full">
            {[
              { id: 'all', label: 'All Cases' },
              { id: 'unassigned', label: 'Unassigned / New' },
              { id: 'active', label: 'Active Treatment' },
              { id: 'followup', label: 'Follow-Ups Due' },
              { id: 'closed', label: 'Resolved' }
            ].map(phase => (
              <button
                key={phase.id}
                onClick={() => setClinicalPhase(phase.id)}
                className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${
                  clinicalPhase === phase.id 
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                    : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
                }`}
              >
                {phase.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-sm text-slate-500 px-2">
        <span>Showing {filteredCases.length} cases</span>
        {(clinicalPhase !== 'all' || searchQuery) && (
          <button 
            onClick={() => { setClinicalPhase('all'); setSearchQuery(''); }}
            className="text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
          >
            <Filter className="h-3 w-3" /> Clear Filters
          </button>
        )}
      </div>

      {/* Cases List */}
      <div className="grid gap-4">
        {filteredCases.map((c) => {
          const isStalled = new Date(c.updated_at) < new Date(Date.now() - 48 * 60 * 60 * 1000) && ['under_review', 'assigned'].includes(c.status);
          const isUnassigned = c.status === 'new' || !c.assigned_doctor_id;

          return (
            <div key={c.id} className="relative bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                
                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between sm:justify-start gap-4">
                    <h3 className="font-bold text-lg text-slate-900 leading-none">{c.patient_name || "Unknown Patient"}</h3>
                    <div className="flex gap-2">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider border ${
                        isUnassigned ? 'bg-orange-50 text-orange-700 border-orange-200' :
                        c.status === 'followup' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        ['completed', 'closed'].includes(c.status) ? 'bg-slate-100 text-slate-600 border-slate-200' :
                        'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {c.status.replace('_', ' ')}
                      </span>
                      {isStalled && (
                        <span className="px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider border bg-red-50 text-red-700 border-red-200 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Stalled &gt;48h
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-sm text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 line-clamp-2">
                    <span className="font-semibold text-slate-800 mr-2">Intake Notes:</span>
                    {c.description || "No symptoms provided."}
                  </p>

                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" /> 
                      {new Date(c.created_at).toLocaleDateString()}
                    </span>
                    
                    <span className="flex items-center gap-1.5">
                      Assigned to: <span className="text-slate-900 font-medium">{c.doctor?.full_name ? `Dr. ${c.doctor.full_name}` : "Pending Allocation"}</span>
                    </span>

                    {c.concern_category && (
                      <span className="flex items-center gap-1.5">
                        Category: <span className="text-slate-900 font-medium capitalize">{c.concern_category}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 w-full sm:w-auto mt-2 sm:mt-0 pt-4 sm:pt-0 border-t border-slate-100 sm:border-0 flex sm:flex-col gap-2">
                  <Button asChild className="w-full sm:w-auto" variant={isUnassigned ? 'primary' : 'outline'}>
                    <Link href={`/admin/operations/cases/${c.id}`} className="flex items-center justify-center gap-2">
                      {isUnassigned ? 'Assign Doctor' : 'Manage Case'}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
                
              </div>
            </div>
          );
        })}
        
        {filteredCases.length === 0 && (
          <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200">
            <Filter className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-slate-900">No cases found</h3>
            <p className="text-slate-500 text-sm">Try adjusting your clinical phase filter or search query.</p>
          </div>
        )}
      </div>
    </div>
  );
}

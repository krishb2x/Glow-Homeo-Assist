"use client";

import { useEffect, useState, useMemo } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/Button";
import { Loader2, ArrowRight, Filter, Search, CheckCircle2, Clock, XCircle } from "lucide-react";
import Link from "next/link";
import { BRAND } from "@/lib/constants";

export default function CasesPage() {
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    try {
      const supabase = getSupabaseBrowser();
      const { data, error } = await supabase
        .from("mt_cases")
        .select("*, doctor:doctors(name)")
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
      const matchStatus = statusFilter === "all" || c.status === statusFilter;
      const matchPayment = paymentFilter === "all" || c.payment_status === paymentFilter;
      const matchSearch = c.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchPayment && matchSearch;
    });
  }, [cases, statusFilter, paymentFilter, searchQuery]);

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
          <h1 className="text-3xl font-bold tracking-tight text-mt-text">Case Operations</h1>
          <p className="text-mt-text-secondary mt-1">Manage and track all patient cases across the clinic.</p>
        </div>
      </div>

      {/* Mobile-Friendly Filters Panel */}
      <div className="bg-white p-4 rounded-2xl border border-mt-border shadow-sm space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-mt-text-secondary" />
          <input 
            type="text" 
            placeholder="Search patient name or case ID..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-mt-border rounded-xl outline-none focus:ring-2 focus:ring-mt-primary/50"
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-mt-text-secondary px-1">Case Status</label>
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
              {['all', 'unassigned', 'assigned', 'active', 'closed'].map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${
                    statusFilter === status 
                      ? 'bg-mt-primary text-white border-mt-primary' 
                      : 'bg-gray-50 text-mt-text hover:bg-gray-100 border-mt-border'
                  }`}
                >
                  {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex-1 space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-mt-text-secondary px-1">Payment Status</label>
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
              {['all', 'pending', 'captured', 'failed'].map(status => (
                <button
                  key={status}
                  onClick={() => setPaymentFilter(status)}
                  className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${
                    paymentFilter === status 
                      ? 'bg-slate-800 text-white border-slate-800' 
                      : 'bg-gray-50 text-mt-text hover:bg-gray-100 border-mt-border'
                  }`}
                >
                  {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-sm text-mt-text-secondary px-2">
        <span>Showing {filteredCases.length} cases</span>
        {(statusFilter !== 'all' || paymentFilter !== 'all' || searchQuery) && (
          <button 
            onClick={() => { setStatusFilter('all'); setPaymentFilter('all'); setSearchQuery(''); }}
            className="text-mt-primary hover:underline flex items-center gap-1"
          >
            <Filter className="h-3 w-3" /> Clear Filters
          </button>
        )}
      </div>

      {/* Cases Grid / List (Mobile First) */}
      <div className="grid gap-4">
        {filteredCases.map((c) => (
          <div key={c.id} className="relative overflow-hidden bg-white rounded-2xl border border-mt-border hover:border-mt-primary/30 hover:shadow-md transition-all p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              
              <div className="flex-1">
                <div className="flex items-start justify-between sm:justify-start gap-4 mb-2">
                  <h3 className="font-bold text-lg text-mt-text leading-none">{c.patient_name || "Unknown Patient"}</h3>
                  <span className={`px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider border ${
                    c.status === 'unassigned' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                    c.status === 'assigned' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    c.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    'bg-gray-100 text-gray-600 border-gray-200'
                  }`}>
                    {c.status}
                  </span>
                </div>
                
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-mt-text-secondary mt-3">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" /> 
                    {new Date(c.created_at).toLocaleDateString()}
                  </span>
                  
                  <span className="flex items-center gap-1.5">
                    {c.payment_status === 'captured' ? <CheckCircle2 className="h-4 w-4 text-mt-success" /> : 
                     c.payment_status === 'failed' ? <XCircle className="h-4 w-4 text-red-500" /> :
                     <Clock className="h-4 w-4 text-orange-400" />}
                    Payment: <span className="capitalize text-mt-text font-medium">{c.payment_status || "Pending"}</span>
                  </span>

                  <span className="flex items-center gap-1.5">
                    Assigned: <span className="text-mt-text font-medium">{c.doctor?.name ? `Dr. ${c.doctor.name}` : "None"}</span>
                  </span>
                </div>
              </div>

              <div className="shrink-0 w-full sm:w-auto mt-2 sm:mt-0 pt-4 sm:pt-0 border-t border-mt-border sm:border-0">
                <Button asChild className="w-full sm:w-auto" variant={c.status === 'unassigned' ? 'primary' : 'outline'}>
                  <Link href={`/admin/operations/cases/${c.id}`} className="flex items-center justify-center gap-2 h-11 sm:h-9">
                    {c.status === 'unassigned' ? 'Assign Doctor' : 'Manage Case'}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
              
            </div>
          </div>
        ))}
        
        {filteredCases.length === 0 && (
          <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-mt-border">
            <Filter className="h-10 w-10 text-mt-text-secondary/50 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-mt-text">No cases found</h3>
            <p className="text-mt-text-secondary text-sm">Try adjusting your filters or search query.</p>
          </div>
        )}
      </div>
    </div>
  );
}

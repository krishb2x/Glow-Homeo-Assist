"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "../../../../../lib/supabase-browser";
import { Loader2, CheckCircle2, XCircle, Users, Mail, Phone, Calendar, ArrowRight, ShieldCheck, UserPlus } from "lucide-react";
import { Button } from "../../../../../components/ui/Button";

export default function PartnerApplicationsPage() {
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchApps();
  }, []);

  const fetchApps = async () => {
    try {
      const supabase = getSupabaseBrowser();
      const { data } = await supabase
        .from("mt_partner_applications")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (data) setApps(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (appId: string) => {
    try {
      setProcessingId(appId);
      const res = await fetch("/api/admin/partners/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: appId })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      alert("Partner approved and code generated successfully!");
      fetchApps();
    } catch (err: any) {
      alert("Failed to approve: " + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (appId: string) => {
    try {
      setProcessingId(appId);
      const res = await fetch("/api/admin/partners/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: appId })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      fetchApps();
    } catch (err: any) {
      alert("Failed to reject: " + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-[60vh] items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mb-4" />
        <p className="text-slate-500 font-medium animate-pulse">Loading applications...</p>
      </div>
    );
  }

  const pendingCount = apps.filter(a => a.status === 'pending').length;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl">
              <UserPlus className="h-7 w-7" />
            </div>
            Partner Applications
          </h1>
          <p className="text-slate-500 mt-2 text-lg">Review and approve new influencer and affiliate applications.</p>
        </div>
        {pendingCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2.5 rounded-xl flex items-center gap-2 font-semibold shadow-sm">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </span>
            {pendingCount} Pending Review
          </div>
        )}
      </div>

      <div className="grid gap-5">
        {apps.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-slate-300 shadow-sm">
            <div className="mx-auto w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              <ShieldCheck className="h-10 w-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">No applications found</h3>
            <p className="text-slate-500">When people apply to join the partner program, they will appear here.</p>
          </div>
        ) : apps.map((app) => (
          <div key={app.id} className="group bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden">
            {app.status === 'pending' && (
              <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>
            )}
            
            <div className="flex flex-col lg:flex-row justify-between gap-6">
              
              <div className="flex-1">
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">{app.name}</h3>
                    <p className="text-sm font-semibold text-emerald-600 mt-0.5 uppercase tracking-wider">{app.profession}</p>
                  </div>
                  <span className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider border flex items-center gap-1.5 ${
                    app.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                    app.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                    'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {app.status === 'approved' && <CheckCircle2 className="w-3.5 h-3.5" />}
                    {app.status === 'rejected' && <XCircle className="w-3.5 h-3.5" />}
                    {app.status === 'pending' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {app.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-sm text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <Mail className="h-4 w-4 text-slate-400" /> <a href={`mailto:${app.email}`} className="truncate hover:text-emerald-600 font-medium">{app.email}</a>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Phone className="h-4 w-4 text-slate-400" /> <a href={`tel:${app.mobile}`} className="hover:text-emerald-600 font-medium">{app.mobile}</a>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Users className="h-4 w-4 text-slate-400" /> <span>Audience Size: <strong className="text-slate-900">{app.audience_size || 'N/A'}</strong></span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Calendar className="h-4 w-4 text-slate-400" /> <span>Applied: <strong className="text-slate-900">{new Date(app.created_at).toLocaleDateString()}</strong></span>
                  </div>
                </div>
              </div>

              {app.status === 'pending' && (
                <div className="flex flex-row lg:flex-col gap-3 shrink-0 lg:pl-6 lg:border-l border-slate-100 pt-4 lg:pt-0 justify-center">
                  <Button 
                    onClick={() => handleApprove(app.id)} 
                    disabled={processingId === app.id}
                    className="flex-1 lg:flex-none justify-center h-12 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow-md transition-all text-sm font-bold"
                  >
                    {processingId === app.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4 mr-2" /> Approve Application</>}
                  </Button>
                  <Button 
                    onClick={() => handleReject(app.id)} 
                    disabled={processingId === app.id}
                    variant="outline"
                    className="flex-1 lg:flex-none justify-center h-12 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-bold"
                  >
                    <XCircle className="w-4 h-4 mr-2" /> Reject
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

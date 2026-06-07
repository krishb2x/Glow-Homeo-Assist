"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { Loader2, CheckCircle2, XCircle, Users, Mail, Phone, Calendar } from "lucide-react";
import { Button } from "@/components/ui/Button";

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
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-mt-primary" /></div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-mt-text flex items-center gap-2">
            <Users className="h-8 w-8 text-mt-primary" />
            Partner Applications
          </h1>
          <p className="text-mt-text-secondary mt-1">Review and approve new influencer and affiliate applications.</p>
        </div>
      </div>

      <div className="grid gap-4">
        {apps.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-mt-border">
            <Users className="h-10 w-10 text-mt-text-secondary/50 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-mt-text">No applications found</h3>
            <p className="text-mt-text-secondary text-sm">You're all caught up!</p>
          </div>
        ) : apps.map((app) => (
          <div key={app.id} className="bg-white rounded-2xl border border-mt-border p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex flex-col md:flex-row justify-between gap-4">
              
              <div className="flex-1">
                <div className="flex items-start justify-between md:justify-start gap-4 mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-mt-text">{app.name}</h3>
                    <p className="text-sm font-medium text-mt-text-secondary">{app.profession}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider border ${
                    app.status === 'approved' ? 'bg-mt-success/10 text-mt-success border-mt-success/20' : 
                    app.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                    'bg-orange-50 text-orange-700 border-orange-200'
                  }`}>
                    {app.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 text-sm text-mt-text-secondary">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" /> <span className="truncate">{app.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" /> <span>{app.mobile}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" /> <span>Audience: <strong className="text-mt-text">{app.audience_size || 'N/A'}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> <span>{new Date(app.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {app.status === 'pending' && (
                <div className="flex md:flex-col gap-2 shrink-0 border-t md:border-t-0 md:border-l border-mt-border pt-4 md:pt-0 md:pl-4 mt-2 md:mt-0">
                  <Button 
                    onClick={() => handleApprove(app.id)} 
                    disabled={processingId === app.id}
                    className="flex-1 md:flex-none justify-center h-10 bg-mt-success hover:bg-mt-success/90 text-white"
                  >
                    {processingId === app.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4 mr-2" /> Approve & Generate Code</>}
                  </Button>
                  <Button 
                    onClick={() => handleReject(app.id)} 
                    disabled={processingId === app.id}
                    variant="outline"
                    className="flex-1 md:flex-none justify-center h-10 border-red-200 text-red-600 hover:bg-red-50"
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

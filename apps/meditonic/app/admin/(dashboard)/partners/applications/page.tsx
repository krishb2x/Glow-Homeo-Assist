"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { Loader2, Check, X } from "lucide-react";

export default function PartnerApplicationsPage() {
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApps();
  }, []);

  const fetchApps = async () => {
    const supabase = getSupabaseBrowser();
    const { data } = await supabase
      .from("mt_partner_applications")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (data) setApps(data);
    setLoading(false);
  };

  const handleApprove = async (appId: string) => {
    try {
      const res = await fetch("/api/admin/partners/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Need to send session token in real app:
          // "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ applicationId: appId })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      fetchApps();
    } catch (err: any) {
      alert("Failed to approve: " + err.message);
    }
  };

  const handleReject = async (appId: string) => {
    try {
      const res = await fetch("/api/admin/partners/reject", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ applicationId: appId })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      fetchApps();
    } catch (err: any) {
      alert("Failed to reject: " + err.message);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200">
        <h2 className="text-lg font-semibold text-slate-800">Partner Applications</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-sm font-medium border-b border-slate-200">
              <th className="px-6 py-4">Name / Profession</th>
              <th className="px-6 py-4">Contact</th>
              <th className="px-6 py-4">Audience Size</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {apps.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No applications found.</td></tr>
            ) : apps.map((app) => (
              <tr key={app.id} className="hover:bg-slate-50/50">
                <td className="px-6 py-4">
                  <div className="font-medium text-slate-900">{app.name}</div>
                  <div className="text-sm text-slate-500">{app.profession}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-slate-900">{app.email}</div>
                  <div className="text-sm text-slate-500">{app.mobile}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-slate-700">{app.audience_size || 'N/A'}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    app.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 
                    app.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {app.status.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  {app.status === 'pending' && (
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleApprove(app.id)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Approve">
                        <Check className="w-5 h-5" />
                      </button>
                      <button onClick={() => handleReject(app.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Reject">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

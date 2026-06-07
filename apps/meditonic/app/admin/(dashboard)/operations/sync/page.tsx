"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/Button";
import { Loader2, RefreshCw, AlertCircle, CheckCircle2, Clock } from "lucide-react";

export default function SyncMonitoringPage() {
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);

  useEffect(() => {
    fetchQueue();
  }, []);

  const fetchQueue = async () => {
    try {
      const supabase = getSupabaseBrowser();
      const { data, error } = await supabase
        .from("mt_sync_queue")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50); // Get last 50 sync events

      if (error) throw error;
      setQueue(data || []);
    } catch (error) {
      console.error("Error fetching sync queue:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (id: string, targetSystem: string, operation: string, payload: any) => {
    try {
      setRetrying(id);
      const supabase = getSupabaseBrowser();
      
      // Update status to pending so backend picks it up again
      const { error } = await supabase
        .from("mt_sync_queue")
        .update({ status: "pending", attempts: 0 })
        .eq("id", id);

      if (error) throw error;
      
      alert("Sync item queued for retry.");
      await fetchQueue();
    } catch (err) {
      alert("Failed to retry sync item");
    } finally {
      setRetrying(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-mt-primary" />
      </div>
    );
  }

  const failedSyncs = queue.filter(q => q.status === 'failed');

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-mt-text flex items-center gap-2">
            <RefreshCw className="h-8 w-8 text-mt-primary" />
            Integration Monitor
          </h1>
          <p className="text-mt-text-secondary mt-1">Monitor background syncs with Google Sheets and GlowHomeo.</p>
        </div>
        
        {failedSyncs.length > 0 && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-xl flex items-center gap-2 font-medium">
            <AlertCircle className="h-5 w-5" />
            {failedSyncs.length} Failed Syncs Require Attention
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-mt-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-mt-border text-mt-text-secondary">
              <tr>
                <th className="px-6 py-4 font-semibold">Target System</th>
                <th className="px-6 py-4 font-semibold">Operation</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Error Log</th>
                <th className="px-6 py-4 font-semibold">Created</th>
                <th className="px-6 py-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mt-border">
              {queue.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium">
                    {item.target_system === 'google_sheets' ? 'Google Sheets' : 
                     item.target_system === 'glow_homeo' ? 'GlowHomeo DB' : item.target_system}
                  </td>
                  <td className="px-6 py-4 uppercase tracking-wider text-xs font-bold text-slate-500">
                    {item.operation}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
                      item.status === 'completed' ? 'bg-mt-success/10 text-mt-success border-mt-success/20' :
                      item.status === 'failed' ? 'bg-red-50 text-red-600 border-red-200' :
                      'bg-orange-50 text-orange-600 border-orange-200'
                    }`}>
                      {item.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                      {item.status === 'failed' && <AlertCircle className="w-3 h-3" />}
                      {item.status === 'pending' && <Clock className="w-3 h-3" />}
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-slate-500 max-w-xs truncate" title={item.error_message || "No errors"}>
                    {item.error_message || "-"}
                  </td>
                  <td className="px-6 py-4 text-mt-text-secondary whitespace-nowrap">
                    {new Date(item.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {item.status === 'failed' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleRetry(item.id, item.target_system, item.operation, item.payload)}
                        disabled={retrying === item.id}
                      >
                        {retrying === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Retry Sync"}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {queue.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-mt-text-secondary">
                    No sync events found in the queue.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

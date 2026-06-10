"use client";

import React, { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function MarkPaidButton({ attributionId, currentStatus }: { attributionId: string; currentStatus: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleMarkPaid = async () => {
    if (!confirm("Are you sure you want to mark this commission as paid?")) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/partners/commissions/mark-paid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: attributionId })
      });
      
      if (!res.ok) throw new Error("Failed to update status");
      
      // Refresh the server component
      router.refresh();
    } catch (err) {
      alert("Failed to mark as paid");
    } finally {
      setLoading(false);
    }
  };

  if (currentStatus === "paid") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
        <CheckCircle2 className="w-3 h-3" /> Paid
      </span>
    );
  }

  return (
    <button 
      onClick={handleMarkPaid}
      disabled={loading}
      className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 px-2 py-1 rounded-md transition-colors disabled:opacity-50"
    >
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
      Mark Paid
    </button>
  );
}

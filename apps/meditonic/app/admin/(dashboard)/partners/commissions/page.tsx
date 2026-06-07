"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { Loader2, ArrowUpRight, Ban, CheckCircle } from "lucide-react";

export default function PartnerCommissionsPage() {
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Simple modal state for Payout
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState("");
  const [amount, setAmount] = useState<number | "">("");

  useEffect(() => {
    fetchCommissions();
  }, []);

  const fetchCommissions = async () => {
    setLoading(true);
    const supabase = getSupabaseBrowser();
    
    // Fetch attributions to see all tracked commissions
    const { data } = await supabase
      .from("mt_order_attributions")
      .select(`
        *,
        mt_partners (
          id,
          mt_partner_applications ( name )
        ),
        mt_referral_codes ( code )
      `)
      .order("created_at", { ascending: false });
    
    if (data) setCommissions(data);
    setLoading(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Commissions Ledger</h2>
          <p className="text-sm text-slate-500 mt-1">View all recorded attributions and commissions.</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-sm font-medium border-b border-slate-200">
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Partner</th>
              <th className="px-6 py-4">Code Used</th>
              <th className="px-6 py-4">Product Type</th>
              <th className="px-6 py-4">Revenue</th>
              <th className="px-6 py-4">Commission</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {commissions.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">No commissions recorded yet.</td></tr>
            ) : commissions.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/50">
                <td className="px-6 py-4">
                  <div className="text-sm text-slate-600">
                    {new Date(item.created_at).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="font-medium text-slate-900">
                    {item.mt_partners?.mt_partner_applications?.name || "Unknown"}
                  </div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">
                    {item.partner_id.split("-")[0]}...
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded w-fit">
                    {item.mt_referral_codes?.code || "N/A"}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600 capitalize">
                  {item.product_type}
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-slate-900 font-medium">
                    ₹{item.revenue_after_discount}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-bold text-emerald-600">
                    ₹{item.commission_amount}
                  </div>
                  <div className="text-xs text-slate-500">
                    ({item.commission_percentage}%)
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

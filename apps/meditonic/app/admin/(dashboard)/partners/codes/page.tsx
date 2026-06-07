"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { Loader2, Plus, Edit2, Ban, CheckCircle2 } from "lucide-react";

export default function ReferralCodesPage() {
  const [codes, setCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [partners, setPartners] = useState<any[]>([]);

  // Simple modal state for MVP
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    partner_id: "",
    code: "",
    discount_type: "percentage",
    discount_value: 10,
    usage_limit: "",
  });

  useEffect(() => {
    fetchCodes();
    fetchPartners();
  }, []);

  const fetchCodes = async () => {
    setLoading(true);
    const supabase = getSupabaseBrowser();
    // mt_partners -> mt_partner_applications (for name)
    const { data } = await supabase
      .from("mt_referral_codes")
      .select(`
        *,
        mt_partners (
          id,
          mt_partner_applications ( name )
        )
      `)
      .order("created_at", { ascending: false });
    
    if (data) setCodes(data);
    setLoading(false);
  };

  const fetchPartners = async () => {
    const supabase = getSupabaseBrowser();
    const { data } = await supabase
      .from("mt_partners")
      .select(`
        id,
        mt_partner_applications ( name )
      `)
      .eq("status", "active");
    if (data) setPartners(data);
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    const supabase = getSupabaseBrowser();
    await supabase
      .from("mt_referral_codes")
      .update({ is_active: !currentStatus })
      .eq("id", id);
    fetchCodes();
  };

  const handleCreateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabaseBrowser();
    
    // In MVP, we just create via client. In real app, we might call an API.
    const { error } = await supabase
      .from("mt_referral_codes")
      .insert({
        clinic_id: "595cd444-e89c-4d1f-b31f-27f76f59e0d7", // Use actual clinic ID
        partner_id: formData.partner_id,
        code: formData.code.toUpperCase(),
        discount_type: formData.discount_type,
        discount_value: Number(formData.discount_value),
        usage_limit: formData.usage_limit ? Number(formData.usage_limit) : null,
        is_active: true
      });

    if (error) {
      alert("Failed to create code: " + error.message);
    } else {
      setIsModalOpen(false);
      setFormData({ partner_id: "", code: "", discount_type: "percentage", discount_value: 10, usage_limit: "" });
      fetchCodes();
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-slate-800">Referral Codes</h2>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
        >
          <Plus className="w-4 h-4" />
          Create Code
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-sm font-medium border-b border-slate-200">
              <th className="px-6 py-4">Code</th>
              <th className="px-6 py-4">Partner</th>
              <th className="px-6 py-4">Discount</th>
              <th className="px-6 py-4">Usage</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {codes.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">No referral codes found.</td></tr>
            ) : codes.map((code) => (
              <tr key={code.id} className="hover:bg-slate-50/50">
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-900 tracking-wider">{code.code}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="font-medium text-slate-700">
                    {code.mt_partners?.mt_partner_applications?.name || "Unknown"}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-slate-900">
                    {code.discount_type === 'percentage' ? `${code.discount_value}%` : `₹${code.discount_value}`} OFF
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-slate-700">
                    {code.current_usage} {code.usage_limit ? `/ ${code.usage_limit}` : 'uses'}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center w-fit gap-1 ${
                    code.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {code.is_active ? <CheckCircle2 className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
                    {code.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => toggleStatus(code.id, code.is_active)}
                    className="p-2 text-slate-400 hover:text-emerald-600 rounded-lg transition-colors" 
                    title={code.is_active ? "Disable Code" : "Enable Code"}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-slate-800">Create Referral Code</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><Ban className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleCreateCode} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Partner</label>
                <select 
                  required
                  value={formData.partner_id} 
                  onChange={e => setFormData({...formData, partner_id: e.target.value})}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select Partner</option>
                  {partners.map(p => (
                    <option key={p.id} value={p.id}>{p.mt_partner_applications?.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Code</label>
                <input 
                  required
                  type="text" 
                  value={formData.code} 
                  onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 uppercase"
                  placeholder="e.g. AMAN15"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select 
                    value={formData.discount_type} 
                    onChange={e => setFormData({...formData, discount_type: e.target.value})}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Value</label>
                  <input 
                    required
                    type="number" 
                    min="1"
                    value={formData.discount_value} 
                    onChange={e => setFormData({...formData, discount_value: Number(e.target.value)})}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Usage Limit (Optional)</label>
                <input 
                  type="number" 
                  min="1"
                  value={formData.usage_limit} 
                  onChange={e => setFormData({...formData, usage_limit: e.target.value})}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
                  placeholder="Leave empty for unlimited"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition">
                  Cancel
                </button>
                <button type="submit" className="flex-1 px-4 py-2 text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg font-medium transition">
                  Save Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

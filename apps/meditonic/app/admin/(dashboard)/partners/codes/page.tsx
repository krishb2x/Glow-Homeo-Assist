"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "../../../../../lib/supabase-browser";
import { Loader2, Plus, Ban, CheckCircle2, Ticket, Users, Percent, X, Scissors } from "lucide-react";
import { Button } from "../../../../../components/ui/Button";

export default function ReferralCodesPage() {
  const [codes, setCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [partners, setPartners] = useState<any[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    partner_id: "",
    code: "",
    discount_type: "percentage",
    discount_value: 10,
    commission_rate: "",
    product_scope: "all",
    usage_limit: "",
  });

  useEffect(() => {
    fetchCodes();
    fetchPartners();
  }, []);

  const fetchCodes = async () => {
    setLoading(true);
    const supabase = getSupabaseBrowser();
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
    
    let landing_path = "/";
    if (formData.product_scope === "ebooks") landing_path = "/ebooks";
    if (formData.product_scope === "consultation") landing_path = "/consultation";
    if (formData.product_scope === "programs") landing_path = "/programs";

    const { data: newCode, error } = await supabase
      .from("mt_referral_codes")
      .insert({
        clinic_id: "595cd444-e89c-4d1f-b31f-27f76f59e0d7", // Fallback, will normally be dynamic
        partner_id: formData.partner_id,
        code: formData.code.toUpperCase(),
        discount_type: formData.discount_type,
        discount_value: Number(formData.discount_value),
        commission_rate: formData.commission_rate ? Number(formData.commission_rate) : null,
        landing_path: landing_path,
        usage_limit: formData.usage_limit ? Number(formData.usage_limit) : null,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      alert("Failed to create code: " + error.message);
    } else if (newCode) {
      // Map product scope
      await supabase.from("mt_referral_products").insert({
        referral_code_id: newCode.id,
        product_type: formData.product_scope
      });

      setIsDrawerOpen(false);
      setFormData({ partner_id: "", code: "", discount_type: "percentage", discount_value: 10, commission_rate: "", product_scope: "all", usage_limit: "" });
      fetchCodes();
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-[60vh] items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mb-4" />
        <p className="text-slate-500 font-medium animate-pulse">Loading tracking codes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl">
              <Ticket className="h-7 w-7" />
            </div>
            Tracking & Discount Codes
          </h2>
          <p className="text-slate-500 mt-2 text-lg">Manage partner affiliate links and custom discount codes.</p>
        </div>
        <Button onClick={() => setIsDrawerOpen(true)} className="w-full sm:w-auto h-12 shrink-0 bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-sm">
          <Plus className="w-5 h-5 mr-2" /> Create Tracking Code
        </Button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {codes.length === 0 ? (
          <div className="col-span-full text-center py-24 bg-white rounded-3xl border border-dashed border-slate-300 shadow-sm">
            <div className="mx-auto w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              <Ticket className="h-10 w-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">No codes found</h3>
            <p className="text-slate-500">Create a new referral code to get started.</p>
          </div>
        ) : codes.map((code) => (
          <div key={code.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col group hover:shadow-md transition-shadow">
            
            {/* The Ticket "Cutouts" */}
            <div className="absolute top-1/2 -left-3 w-6 h-6 bg-[#F8FAFC] border-r border-slate-200 rounded-full -translate-y-1/2 z-10"></div>
            <div className="absolute top-1/2 -right-3 w-6 h-6 bg-[#F8FAFC] border-l border-slate-200 rounded-full -translate-y-1/2 z-10"></div>
            
            {/* Top Half */}
            <div className={`p-6 border-b-2 border-dashed border-slate-200 relative ${!code.is_active ? 'opacity-70 bg-slate-50' : 'bg-gradient-to-b from-white to-slate-50/50'}`}>
              <div className="flex justify-between items-start mb-6">
                <h3 className="font-mono text-2xl font-black tracking-wider text-slate-800">{code.code}</h3>
                <span className={`px-2.5 py-1 rounded-md text-[10px] uppercase font-black tracking-wider border flex items-center gap-1.5 shadow-sm ${
                  code.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}>
                  {code.is_active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                  {code.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                    <Users className="w-4 h-4 text-slate-500" /> 
                  </div>
                  <span className="font-semibold text-slate-700 truncate">{code.mt_partners?.mt_partner_applications?.name || "Unknown Partner"}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100">
                    <Percent className="w-4 h-4 text-blue-600" /> 
                  </div>
                  <span className="font-bold text-slate-900">
                    {code.discount_type === 'percentage' ? `${code.discount_value}% OFF` : `₹${code.discount_value} OFF`}
                  </span>
                  {code.commission_rate && (
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded ml-2">
                      {code.commission_rate}% Comm.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Half */}
            <div className={`p-5 flex items-center justify-between mt-auto bg-white ${!code.is_active ? 'opacity-70 bg-slate-50' : ''}`}>
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1">Total Usage</p>
                <p className="text-xl font-black text-slate-800">
                  {code.current_usage} <span className="text-sm font-semibold text-slate-400">{code.usage_limit ? `/ ${code.usage_limit}` : 'uses'}</span>
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => toggleStatus(code.id, code.is_active)}
                className={`font-bold transition-colors ${code.is_active ? 'hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-slate-600 border-slate-200' : 'hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 text-slate-500 border-slate-200'}`}
              >
                {code.is_active ? 'Disable' : 'Enable'}
              </Button>
            </div>
            
            {/* Decorative scissor icon showing it's a coupon */}
            <div className="absolute top-[50%] left-0 w-full flex justify-center -mt-3 z-20 pointer-events-none opacity-0 group-hover:opacity-10 transition-opacity">
              <Scissors className="w-6 h-6 text-slate-900" />
            </div>
          </div>
        ))}
      </div>

      {/* Drawer Overlay */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm transition-opacity">
          {/* Drawer Panel */}
          <div className="w-full max-w-md h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-200">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
              <h3 className="font-bold text-xl text-slate-900">Create Tracking Code</h3>
              <button onClick={() => setIsDrawerOpen(false)} className="p-2 -mr-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5"/>
              </button>
            </div>
            
            <form onSubmit={handleCreateCode} className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Assign to Partner *</label>
                <select 
                  required
                  value={formData.partner_id} 
                  onChange={e => setFormData({...formData, partner_id: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-medium focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 outline-none transition-all"
                >
                  <option value="">Select Partner</option>
                  {partners.map(p => (
                    <option key={p.id} value={p.id}>{p.mt_partner_applications?.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">Code (Tracking ID) *</label>
                <input 
                  required
                  type="text" 
                  value={formData.code} 
                  onChange={e => setFormData({...formData, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-base font-bold focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 outline-none transition-all uppercase font-mono tracking-wider text-slate-900"
                  placeholder="e.g. SUMMER10"
                />
                <p className="text-[11px] font-medium text-slate-500 mt-1">This code is used at checkout and via URL (?ref=SUMMER10).</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Discount Type</label>
                  <select 
                    value={formData.discount_type} 
                    onChange={e => setFormData({...formData, discount_type: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-medium focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 outline-none transition-all"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed (₹)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Discount Value</label>
                  <input 
                    required
                    type="number" 
                    min="1"
                    value={formData.discount_value} 
                    onChange={e => setFormData({...formData, discount_value: Number(e.target.value)})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-medium focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Product Scope</label>
                  <select 
                    value={formData.product_scope} 
                    onChange={e => setFormData({...formData, product_scope: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-medium focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 outline-none transition-all"
                  >
                    <option value="all">All Products</option>
                    <option value="consultation">Consultations Only</option>
                    <option value="ebooks">eBooks Only</option>
                    <option value="programs">Programs Only</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Partner Comm. (%)</label>
                  <input 
                    type="number" 
                    min="1"
                    max="100"
                    value={formData.commission_rate} 
                    onChange={e => setFormData({...formData, commission_rate: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-medium focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 outline-none transition-all"
                    placeholder="Use Base Rate"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex justify-between">
                  <span>Usage Limit</span> 
                  <span className="text-slate-400 font-normal">Optional</span>
                </label>
                <input 
                  type="number" 
                  min="1"
                  value={formData.usage_limit} 
                  onChange={e => setFormData({...formData, usage_limit: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-medium focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 outline-none transition-all"
                  placeholder="Leave empty for unlimited"
                />
              </div>
            </form>

            <div className="p-6 border-t border-slate-100 bg-white shrink-0 flex gap-4">
              <Button type="button" variant="outline" onClick={() => setIsDrawerOpen(false)} className="flex-1 h-12 font-bold border-slate-200 text-slate-600 hover:bg-slate-50">
                Cancel
              </Button>
              <Button type="submit" onClick={handleCreateCode} className="flex-1 h-12 font-bold bg-slate-900 hover:bg-slate-800 text-white">
                Save Code
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

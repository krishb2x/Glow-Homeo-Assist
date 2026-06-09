"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { Loader2, Plus, Edit2, Ban, CheckCircle2, Ticket, Users, Percent, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

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
    return <div className="flex items-center justify-center h-[50vh]"><Loader2 className="w-8 h-8 animate-spin text-mt-primary" /></div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tracking & Discount Codes</h2>
          <p className="text-slate-500">Manage partner affiliate links and custom discount codes.</p>
        </div>
        <Button onClick={() => setIsDrawerOpen(true)} className="w-full sm:w-auto h-11 sm:h-10 shrink-0 bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4 mr-2" /> Create Tracking Code
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {codes.length === 0 ? (
          <div className="col-span-full text-center py-16 bg-white rounded-3xl border border-dashed border-mt-border">
            <Ticket className="h-10 w-10 text-mt-text-secondary/50 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-mt-text">No codes found</h3>
            <p className="text-mt-text-secondary text-sm">Create a new referral code to get started.</p>
          </div>
        ) : codes.map((code) => (
          <div key={code.id} className="bg-white rounded-2xl border border-mt-border p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className={`absolute top-0 left-0 w-1 h-full ${code.is_active ? 'bg-mt-success' : 'bg-slate-300'}`}></div>
            
            <div>
              <div className="flex justify-between items-start pl-2 mb-4">
                <h3 className="font-mono text-xl font-bold tracking-wider text-mt-text bg-gray-100 px-2 py-0.5 rounded-lg border border-mt-border">{code.code}</h3>
                <span className={`px-2 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider border flex items-center gap-1 ${
                  code.is_active ? 'bg-mt-success/10 text-mt-success border-mt-success/20' : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}>
                  {code.is_active ? <CheckCircle2 className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
                  {code.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="pl-2 space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-mt-text-secondary">
                  <Users className="w-4 h-4" /> 
                  <span className="font-medium text-mt-text truncate">{code.mt_partners?.mt_partner_applications?.name || "Unknown"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-mt-text-secondary">
                  <Percent className="w-4 h-4" /> 
                  <span className="font-medium text-mt-text">{code.discount_type === 'percentage' ? `${code.discount_value}%` : `₹${code.discount_value}`} OFF</span>
                </div>
              </div>
            </div>

            <div className="border-t border-mt-border pt-4 pl-2 flex items-center justify-between mt-auto">
              <div>
                <p className="text-xs uppercase tracking-wider font-semibold text-mt-text-secondary mb-0.5">Times Used</p>
                <p className="text-sm font-medium text-mt-text">
                  {code.current_usage} <span className="text-mt-text-secondary font-normal">{code.usage_limit ? `/ ${code.usage_limit}` : 'total'}</span>
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => toggleStatus(code.id, code.is_active)}
                className={`h-8 ${code.is_active ? 'hover:bg-red-50 hover:text-red-600 hover:border-red-200' : 'hover:bg-mt-success/10 hover:text-mt-success hover:border-mt-success/20'}`}
              >
                {code.is_active ? 'Disable' : 'Enable'}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Drawer Overlay */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm transition-opacity">
          {/* Drawer Panel */}
          <div className="w-full max-w-md h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="px-6 py-4 border-b border-mt-border flex justify-between items-center bg-gray-50/50 shrink-0">
              <h3 className="font-semibold text-lg text-slate-900">Create Tracking Code</h3>
              <button onClick={() => setIsDrawerOpen(false)} className="p-2 -mr-2 text-mt-text-secondary hover:text-mt-text hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5"/>
              </button>
            </div>
            
            <form onSubmit={handleCreateCode} className="p-6 overflow-y-auto flex-1 space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-mt-text">Partner</label>
                <select 
                  required
                  value={formData.partner_id} 
                  onChange={e => setFormData({...formData, partner_id: e.target.value})}
                  className="w-full bg-gray-50 border border-mt-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-mt-primary/50 outline-none transition-all"
                >
                  <option value="">Select Partner</option>
                  {partners.map(p => (
                    <option key={p.id} value={p.id}>{p.mt_partner_applications?.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700 mb-1">Code (Tracking ID) *</label>
                <input 
                  required
                  type="text" 
                  value={formData.code} 
                  onChange={e => setFormData({...formData, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')})}
                  className="w-full bg-gray-50 border border-mt-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-mt-primary/50 outline-none transition-all uppercase font-mono tracking-wider"
                  placeholder="e.g. KRISHNA10"
                />
                <p className="text-[10px] text-slate-500 mt-1">This code will be automatically attached to their product links (e.g., ?ref=KRISHNA10).</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-mt-text">Discount Type</label>
                  <select 
                    value={formData.discount_type} 
                    onChange={e => setFormData({...formData, discount_type: e.target.value})}
                    className="w-full bg-gray-50 border border-mt-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-mt-primary/50 outline-none transition-all"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed (₹)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-mt-text">Discount Value</label>
                  <input 
                    required
                    type="number" 
                    min="1"
                    value={formData.discount_value} 
                    onChange={e => setFormData({...formData, discount_value: Number(e.target.value)})}
                    className="w-full bg-gray-50 border border-mt-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-mt-primary/50 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-mt-text">Product Scope</label>
                  <select 
                    value={formData.product_scope} 
                    onChange={e => setFormData({...formData, product_scope: e.target.value})}
                    className="w-full bg-gray-50 border border-mt-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-mt-primary/50 outline-none transition-all"
                  >
                    <option value="all">All Products</option>
                    <option value="consultation">Consultations Only</option>
                    <option value="ebooks">eBooks Only</option>
                    <option value="programs">Programs Only</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-mt-text">Partner Comm. (%)</label>
                  <input 
                    type="number" 
                    min="1"
                    max="100"
                    value={formData.commission_rate} 
                    onChange={e => setFormData({...formData, commission_rate: e.target.value})}
                    className="w-full bg-gray-50 border border-mt-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-mt-primary/50 outline-none transition-all"
                    placeholder="Base Rate"
                  />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-mt-text">Usage Limit <span className="text-mt-text-secondary font-normal">(Optional)</span></label>
                <input 
                  type="number" 
                  min="1"
                  value={formData.usage_limit} 
                  onChange={e => setFormData({...formData, usage_limit: e.target.value})}
                  className="w-full bg-gray-50 border border-mt-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-mt-primary/50 outline-none transition-all"
                  placeholder="Leave empty for unlimited"
                />
              </div>
            </form>

            <div className="p-6 border-t border-mt-border bg-gray-50/50 shrink-0 flex gap-3">
              <Button type="button" variant="outline" onClick={() => setIsDrawerOpen(false)} className="flex-1 h-11">
                Cancel
              </Button>
              <Button type="submit" onClick={handleCreateCode} className="flex-1 h-11">
                Save Code
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

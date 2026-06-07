"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { Copy, Check, LogOut, TrendingUp, DollarSign, ShoppingBag, Loader2 } from "lucide-react";
import { formatPrice } from "@/lib/utils";

export default function PartnerDashboard() {
  const router = useRouter();
  const [partner, setPartner] = useState<any>(null);
  const [codes, setCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    const fetchPartnerData = async () => {
      try {
        const supabase = getSupabaseBrowser();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.push("/partner-login");
          return;
        }

        const { data: partnerData, error: partnerError } = await supabase
          .from("mt_partners")
          .select("*, mt_partner_applications(name)")
          .eq("user_id", session.user.id)
          .single();

        if (partnerError || !partnerData) {
          throw new Error("Partner not found");
        }

        setPartner(partnerData);

        const { data: codesData } = await supabase
          .from("mt_referral_codes")
          .select("*")
          .eq("partner_id", partnerData.id);

        if (codesData) {
          setCodes(codesData);
        }

      } catch (err) {
        console.error(err);
        router.push("/partner-login");
      } finally {
        setLoading(false);
      }
    };

    fetchPartnerData();
  }, [router]);

  const handleCopy = (code: string) => {
    // Determine base URL dynamically or fallback to env
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://meditonic.glowhomeo.com';
    const link = `${baseUrl}?ref=${code}`;
    navigator.clipboard.writeText(link);
    setCopied(code);
    setTimeout(() => setCopied(""), 2000);
  };

  const handleLogout = async () => {
    const supabase = getSupabaseBrowser();
    await supabase.auth.signOut();
    router.push("/partner-login");
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-emerald-700" /></div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-700 rounded-lg flex items-center justify-center text-white font-serif text-lg">M</div>
            <span className="font-semibold text-slate-900">Partner Portal</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-600 hidden md:block">
              Welcome back, {partner?.mt_partner_applications?.name || "Partner"}
            </span>
            <button onClick={handleLogout} className="text-slate-500 hover:text-slate-900 transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-10">
          <h1 className="text-3xl font-serif text-slate-900 mb-2">Overview</h1>
          <p className="text-slate-600">Track your performance and earnings.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Total Orders</p>
              <h3 className="text-2xl font-bold text-slate-900">{partner.total_orders}</h3>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Revenue Generated</p>
              <h3 className="text-2xl font-bold text-slate-900">{formatPrice(partner.total_revenue)}</h3>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Total Commission</p>
              <h3 className="text-2xl font-bold text-slate-900">{formatPrice(partner.total_commission)}</h3>
            </div>
          </div>
        </div>

        {/* Referral Codes */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">Your Referral Links</h2>
          
          {codes.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <p className="text-slate-500">No active referral codes found. The admin will assign one shortly.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {codes.map((c) => (
                <div key={c.id} className="flex flex-col md:flex-row items-center justify-between p-5 rounded-xl border border-slate-200 bg-slate-50/50 gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="text-lg font-bold text-slate-900 tracking-wider uppercase">{c.code}</h4>
                      {c.is_active ? (
                        <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-700 rounded-full">Active</span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs font-semibold bg-slate-200 text-slate-600 rounded-full">Inactive</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600">
                      Benefit: {c.discount_type === 'percentage' ? `${c.discount_value}% Off` : `₹${c.discount_value} Off`} • Uses: {c.current_usage}
                    </p>
                  </div>
                  
                  <button 
                    onClick={() => handleCopy(c.code)}
                    disabled={!c.is_active}
                    className="w-full md:w-auto shrink-0 px-5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 text-slate-700 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-colors focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  >
                    {copied === c.code ? (
                      <><Check className="w-4 h-4 text-emerald-600" /> Copied</>
                    ) : (
                      <><Copy className="w-4 h-4" /> Copy Link</>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { Copy, Check, LogOut, TrendingUp, DollarSign, ShoppingBag, Loader2, Sparkles, ArrowRight, Target, Award } from "lucide-react";
import { formatPrice } from "@/lib/utils";

export default function PartnerDashboard() {
  const router = useRouter();
  const [partner, setPartner] = useState<any>(null);
  const [codes, setCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState("");
  const [greeting, setGreeting] = useState("Welcome back");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");

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
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mb-4" />
        <p className="text-slate-500 font-medium animate-pulse">Loading your dashboard...</p>
      </div>
    );
  }

  const name = partner?.mt_partner_applications?.name || "Partner";
  const revenue = partner.total_revenue || 0;
  const targetRevenue = 50000;
  const progressPercent = Math.min(100, (revenue / targetRevenue) * 100);

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      {/* Premium Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-50 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl flex items-center justify-center text-white font-serif text-xl shadow-lg shadow-emerald-600/20">M</div>
            <span className="font-semibold text-slate-800 text-lg tracking-tight hidden sm:block">MediTonic Partners</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-2 px-4 py-1.5 bg-slate-100 rounded-full border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Portal Active</span>
            </div>
            <button 
              onClick={handleLogout} 
              className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-8 md:pt-12">
        {/* Dynamic Greeting Section */}
        <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white mb-10 shadow-2xl shadow-slate-900/20 p-8 md:p-12">
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-emerald-500/20 via-emerald-800/5 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/10 mb-6">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-medium text-emerald-100">Tier 1 Partner</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-serif mb-2 tracking-tight">
                {greeting}, <span className="text-emerald-400">{name.split(" ")[0]}</span>
              </h1>
              <p className="text-slate-400 text-lg max-w-xl">
                Here's what's happening with your referrals today. Keep sharing to hit your next milestone!
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-6 min-w-[300px]">
              <div className="flex justify-between items-end mb-2">
                <p className="text-sm font-medium text-slate-300 flex items-center gap-2"><Target className="w-4 h-4 text-emerald-400"/> Next Milestone</p>
                <p className="font-semibold text-white">{formatPrice(revenue)} <span className="text-slate-500 font-normal">/ {formatPrice(targetRevenue)}</span></p>
              </div>
              <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden mb-3">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 rounded-full transition-all duration-1000 ease-out relative"
                  style={{ width: `${progressPercent}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]"></div>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                {progressPercent >= 100 
                  ? "Milestone achieved! Incredible work." 
                  : `${formatPrice(targetRevenue - revenue)} away from your next performance bonus.`}
              </p>
            </div>
          </div>
        </div>

        {/* Premium Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Revenue Card */}
          <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/40 border border-slate-100 hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 group">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <TrendingUp className="w-7 h-7" />
            </div>
            <p className="text-sm font-semibold tracking-wide text-slate-500 uppercase mb-2">Total Revenue Generated</p>
            <h3 className="text-4xl font-bold text-slate-900 tracking-tight">{formatPrice(partner.total_revenue)}</h3>
          </div>

          {/* Commission Card */}
          <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/40 border border-slate-100 hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 group relative overflow-hidden">
            <div className="absolute -right-6 -top-6 w-32 h-32 bg-amber-50 rounded-full blur-2xl group-hover:bg-amber-100 transition-colors duration-500"></div>
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-inner">
                <DollarSign className="w-7 h-7" />
              </div>
              <p className="text-sm font-semibold tracking-wide text-slate-500 uppercase mb-2">Your Commission</p>
              <h3 className="text-4xl font-bold text-slate-900 tracking-tight">{formatPrice(partner.total_commission)}</h3>
            </div>
          </div>

          {/* Orders Card */}
          <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/40 border border-slate-100 hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 group">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <ShoppingBag className="w-7 h-7" />
            </div>
            <p className="text-sm font-semibold tracking-wide text-slate-500 uppercase mb-2">Total Referrals</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-4xl font-bold text-slate-900 tracking-tight">{partner.total_orders}</h3>
              <span className="text-slate-400 font-medium">conversions</span>
            </div>
          </div>
        </div>

        {/* Links Section */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-serif text-slate-900">Your Active Links</h2>
          <span className="text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 hidden sm:block">
            {codes.filter(c => c.is_active).length} Active Codes
          </span>
        </div>

        <div className="bg-white rounded-3xl p-2 sm:p-8 shadow-xl shadow-slate-200/40 border border-slate-100">
          {codes.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
              <Award className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 mb-1">No codes yet</h3>
              <p className="text-slate-500 max-w-md mx-auto">Your account is active, but our team hasn't assigned your unique code yet. Please check back shortly.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {codes.map((c) => (
                <div key={c.id} className="relative overflow-hidden group rounded-2xl border border-slate-200 bg-white p-6 md:p-8 hover:border-emerald-300 transition-colors shadow-sm hover:shadow-md">
                  {c.is_active && (
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-100 to-transparent rounded-bl-[100px] opacity-50 pointer-events-none"></div>
                  )}
                  
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-2xl font-bold text-slate-900 tracking-wider uppercase font-mono bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">{c.code}</h4>
                        {c.is_active ? (
                          <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold bg-emerald-100 text-emerald-700 rounded-full uppercase tracking-wide border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Active
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 text-xs font-bold bg-slate-100 text-slate-500 rounded-full uppercase tracking-wide border border-slate-200">Inactive</span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm font-medium text-slate-500 mt-4">
                        <div className="flex flex-col">
                          <span className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">Discount Value</span>
                          <span className="text-slate-700">{c.discount_type === 'percentage' ? `${c.discount_value}% Off` : `₹${c.discount_value} Off`}</span>
                        </div>
                        <div className="w-px h-8 bg-slate-200"></div>
                        <div className="flex flex-col">
                          <span className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">Times Used</span>
                          <span className="text-slate-700">{c.current_usage} {c.usage_limit ? `/ ${c.usage_limit}` : 'total'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => handleCopy(c.code)}
                      disabled={!c.is_active}
                      className={`w-full md:w-auto shrink-0 px-6 py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all outline-none ${
                        copied === c.code 
                          ? "bg-emerald-50 text-emerald-700 border-2 border-emerald-500" 
                          : "bg-slate-900 text-white hover:bg-slate-800 hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 border-2 border-transparent"
                      }`}
                    >
                      {copied === c.code ? (
                        <><Check className="w-4 h-4" /> Link Copied</>
                      ) : (
                        <><Copy className="w-4 h-4" /> Copy Link</>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

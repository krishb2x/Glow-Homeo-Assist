"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { 
  Copy, Check, LogOut, TrendingUp, DollarSign, 
  ShoppingBag, Loader2, Sparkles, Share2, Target, Award 
} from "lucide-react";
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

  const handleShare = async (code: string) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://meditonic.glowhomeo.com';
    const link = `${baseUrl}?ref=${code}`;
    
    // Use Native Share API if available (Mobile devices)
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'MediTonic Partner Link',
          text: 'Book a consultation or purchase a program with my partner link!',
          url: link,
        });
      } catch (err) {
        // Fallback to copy if share was aborted or failed
        copyToClipboard(code, link);
      }
    } else {
      // Fallback for desktop/unsupported browsers
      copyToClipboard(code, link);
    }
  };

  const copyToClipboard = (code: string, link: string) => {
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
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mb-4" />
        <p className="text-slate-500 font-medium animate-pulse">Loading dashboard...</p>
      </div>
    );
  }

  const name = partner?.mt_partner_applications?.name || "Partner";
  const firstName = name.split(" ")[0];
  const activeCode = codes.find(c => c.is_active);
  const revenue = partner.total_revenue || 0;
  const targetRevenue = 50000;
  const progressPercent = Math.min(100, (revenue / targetRevenue) * 100);

  return (
    <div className="min-h-[100dvh] bg-[#F8FAFC] pb-12 font-sans w-full overflow-x-hidden">
      {/* Mobile-Friendly Header */}
      <header className="bg-white sticky top-0 z-50 border-b border-slate-200 shadow-sm">
        <div className="px-4 h-16 flex items-center justify-between max-w-lg mx-auto md:max-w-7xl">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-serif text-lg">M</div>
            <span className="font-semibold text-slate-800 text-sm md:text-base truncate max-w-[120px] md:max-w-none">
              MediTonic Partners
            </span>
          </div>
          <button 
            onClick={handleLogout} 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-sm font-medium text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      <main className="px-4 pt-6 max-w-lg mx-auto md:max-w-7xl">
        
        {/* Welcome Section */}
        <div className="mb-6">
          <p className="text-slate-500 text-sm mb-1">{greeting},</p>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            {firstName}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-full border border-emerald-200">
              <Sparkles className="w-3 h-3" /> Partner
            </span>
          </h1>
        </div>

        {/* PRIMARY ACTION: Referral Link (Mobile First Stack) */}
        {activeCode ? (
          <div className="bg-slate-900 rounded-3xl p-5 md:p-6 mb-8 text-white shadow-xl shadow-slate-900/10 relative overflow-hidden">
            {/* Background design elements to make it pop */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-emerald-500/30 to-transparent rounded-full blur-2xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
            
            <div className="relative z-10">
              <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold mb-3">Your Referral Code</p>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 flex-1 flex items-center justify-between">
                  <span className="font-mono text-xl md:text-2xl font-bold tracking-wider">{activeCode.code}</span>
                  <span className="px-2 py-1 bg-emerald-500/20 text-emerald-300 text-[10px] uppercase font-bold tracking-wider rounded-md border border-emerald-500/30">
                    Active
                  </span>
                </div>
                
                <button 
                  onClick={() => handleShare(activeCode.code)}
                  className={`w-full sm:w-auto h-[52px] px-6 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shrink-0 ${
                    copied === activeCode.code 
                      ? "bg-emerald-500 text-white" 
                      : "bg-emerald-400 text-slate-900 hover:bg-emerald-300 active:scale-[0.98]"
                  }`}
                >
                  {copied === activeCode.code ? (
                    <><Check className="w-5 h-5" /> Copied!</>
                  ) : (
                    <><Share2 className="w-5 h-5" /> Share Link</>
                  )}
                </button>
              </div>
              <div className="mt-4 flex gap-4 text-xs font-medium text-slate-400">
                <span>Discount: <strong className="text-white">{activeCode.discount_type === 'percentage' ? `${activeCode.discount_value}%` : `₹${activeCode.discount_value}`} Off</strong></span>
                <span>Used: <strong className="text-white">{activeCode.current_usage} times</strong></span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 border border-dashed border-slate-300 rounded-3xl p-6 mb-8 text-center">
            <Award className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <h3 className="font-semibold text-slate-700">Code Pending</h3>
            <p className="text-sm text-slate-500 mt-1">Your referral code is being generated.</p>
          </div>
        )}

        {/* PERFORMANCE METRICS (Responsive Grid) */}
        <h2 className="text-lg font-bold text-slate-900 mb-4 px-1">Performance</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-8">
          
          {/* Earnings */}
          <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200 shadow-sm col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3 text-emerald-600">
              <div className="bg-emerald-50 p-2 rounded-lg">
                <DollarSign className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Earnings</span>
            </div>
            <h3 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
              {formatPrice(partner.total_commission)}
            </h3>
          </div>

          {/* Conversions */}
          <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-3 text-blue-600">
              <div className="bg-blue-50 p-2 rounded-lg">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 hidden sm:inline">Conversions</span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 sm:hidden">Orders</span>
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
              {partner.total_orders}
            </h3>
          </div>

          {/* Revenue */}
          <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-3 text-indigo-600">
              <div className="bg-indigo-50 p-2 rounded-lg">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Revenue</span>
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
              {formatPrice(partner.total_revenue)}
            </h3>
          </div>

        </div>

        {/* COMPACT PROGRESS CARD */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex justify-between items-end mb-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Target className="w-4 h-4 text-emerald-500"/> Next Milestone
            </h3>
            <span className="text-xs font-bold text-slate-500">{formatPrice(revenue)} / {formatPrice(targetRevenue)}</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden mb-2">
            <div 
              className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          <p className="text-xs text-slate-500">
            {progressPercent >= 100 
              ? "Goal achieved! Excellent work." 
              : `${formatPrice(targetRevenue - revenue)} remaining to unlock bonus tier.`}
          </p>
        </div>

      </main>
    </div>
  );
}

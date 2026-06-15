"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "../../lib/supabase-browser";
import { 
  Copy, Check, LogOut, DollarSign, 
  ShoppingBag, Loader2, Sparkles, Target, Link as LinkIcon, 
  Wallet, Activity, TrendingUp, Home, Compass, FileText, Share2, Award, Calendar, ChevronRight, X, Mail, Eye, Clock
} from "lucide-react";
import { formatPrice } from "../../lib/utils";

type TabType = "overview" | "promote" | "ledger" | "payouts";

export default function PartnerDashboard() {
  const router = useRouter();
  const [partner, setPartner] = useState<any>(null);
  const [codes, setCodes] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [attributions, setAttributions] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState("");
  const [greeting, setGreeting] = useState("Welcome");
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  // UX Swipe Assets State
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [copiedTextType, setCopiedTextType] = useState<string | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);

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
          .eq("partner_id", partnerData.id)
          .eq("is_active", true);

        if (codesData) {
          setCodes(codesData);
        }

        const { data: attrData } = await supabase
          .from("mt_order_attributions")
          .select("*")
          .eq("partner_id", partnerData.id)
          .order("created_at", { ascending: false });

        if (attrData) {
          setAttributions(attrData);
        }

        // Fetch Products for Marketing Marketplace
        const { data: productsData } = await supabase
          .from("mt_products")
          .select("id, title, slug, price, cover_image_path, image_url, product_type")
          .eq("clinic_id", "595cd444-e89c-4d1f-b31f-27f76f59e0d7") 
          .eq("is_active", true)
          .order("display_order", { ascending: true });

        if (productsData) {
          setProducts(productsData);
        }

        // Fetch Payouts via API Endpoint to bypass RLS restrictions
        const payoutsRes = await fetch(`/api/partners/payouts`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        if (payoutsRes.ok) {
          const pData = await payoutsRes.json();
          setPayouts(pData.payouts || []);
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

  const copyToClipboard = (id: string, link: string) => {
    navigator.clipboard.writeText(link);
    setCopied(id);
    setTimeout(() => setCopied(""), 2000);
  };

  const copyTextSwipe = (type: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTextType(type);
    setTimeout(() => setCopiedTextType(null), 2000);
  };

  const handleLogout = async () => {
    const supabase = getSupabaseBrowser();
    await supabase.auth.signOut();
    document.cookie = "meditonic_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "meditonic_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.push("/partner-login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-500 mb-4 drop-shadow-md" />
        <p className="text-slate-400 text-sm font-bold tracking-wider animate-pulse">Launching Partner Hub...</p>
      </div>
    );
  }

  const name = partner?.mt_partner_applications?.name || "Partner";
  const firstName = name.split(" ")[0];
  
  const primaryCode = codes.length > 0 ? codes[0].code : null;
  const partnerCommission = partner?.base_commission_rate || 10;
  
  const pendingCommission = attributions
    .filter(a => a.status === 'pending')
    .reduce((sum, a) => sum + (a.commission_amount || 0), 0);

  const totalClearedPayouts = payouts
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col md:flex-row font-sans text-slate-100 selection:bg-emerald-500/30 select-none animate-in fade-in duration-500 relative">
      
      {/* Left Sidebar - Desktop */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-slate-950 border-r border-slate-800/80 z-40">
        {/* Brand Logo & Title */}
        <div className="px-6 py-6 border-b border-slate-850 flex items-center gap-3">
          <div className="w-9.5 h-9.5 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-650 to-teal-800 flex items-center justify-center text-white font-serif font-black shadow-md shadow-emerald-500/15 text-sm shrink-0">
            M
          </div>
          <div>
            <span className="text-[9px] font-black text-slate-400 block uppercase tracking-widest leading-none">MediTonic</span>
            <span className="font-extrabold text-sm text-white tracking-tight mt-0.5 block">Partner Hub</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          <button
            onClick={() => setActiveTab("overview")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
              activeTab === 'overview'
                ? 'bg-emerald-600/15 border-emerald-500/25 text-emerald-400'
                : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <Home className="w-5 h-5 shrink-0" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => setActiveTab("promote")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
              activeTab === 'promote'
                ? 'bg-emerald-600/15 border-emerald-500/25 text-emerald-400'
                : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <Compass className="w-5 h-5 shrink-0" />
            <span>Promote</span>
          </button>

          <button
            onClick={() => setActiveTab("ledger")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
              activeTab === 'ledger'
                ? 'bg-emerald-600/15 border-emerald-500/25 text-emerald-400'
                : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <FileText className="w-5 h-5 shrink-0" />
            <span>Ledger</span>
          </button>

          <button
            onClick={() => setActiveTab("payouts")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
              activeTab === 'payouts'
                ? 'bg-emerald-600/15 border-emerald-500/25 text-emerald-400'
                : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <Wallet className="w-5 h-5 shrink-0" />
            <span>Payouts</span>
          </button>
        </nav>

        {/* Profile Card & Logout */}
        <div className="p-4 border-t border-slate-850 space-y-3">
          <div className="flex items-center gap-3 px-2 py-1.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-black text-sm shadow-inner">
              {name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate leading-tight">{name}</p>
              <p className="text-[10px] text-slate-500 truncate mt-0.5">Partner</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider border border-slate-800 text-slate-400 hover:text-rose-450 hover:bg-rose-500/10 hover:border-rose-500/20 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden bg-slate-950 border-b border-slate-850 px-4 py-3.5 flex items-center justify-between sticky top-0 z-40 select-none">
        <div className="flex items-center gap-2.5">
          <div className="w-8.5 h-8.5 rounded-lg bg-gradient-to-br from-emerald-500 via-teal-650 to-teal-800 flex items-center justify-center text-white font-serif font-black shadow-md shadow-emerald-500/15 text-xs">
            M
          </div>
          <div>
            <span className="text-[8px] font-black text-slate-400 block uppercase tracking-widest leading-none">MediTonic</span>
            <span className="font-extrabold text-xs text-white tracking-tight mt-0.5 block">Partner Hub</span>
          </div>
        </div>
        <button 
          onClick={handleLogout} 
          className="w-8.5 h-8.5 rounded-lg bg-slate-900 text-slate-400 hover:text-rose-455 hover:bg-rose-500/10 flex items-center justify-center transition-all border border-slate-800 shadow-sm animate-in fade-in"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </header>

      {/* Main Content Workspace */}
      <main className="flex-1 md:pl-64 flex flex-col min-h-screen bg-slate-900">
        <div className="max-w-6xl w-full mx-auto px-4 py-6 md:p-8 lg:p-10 pb-24 md:pb-8 space-y-6 md:space-y-8">
          
          {/* Active Tab View: Home/Overview */}
          {activeTab === "overview" && (
            <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              
              {/* Profile Card Header */}
              <div className="flex items-center gap-4 bg-slate-950/40 backdrop-blur-md p-5 md:p-6 rounded-2xl border border-slate-850 shadow-xl relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl"></div>
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 border border-emerald-550/40 flex items-center justify-center text-white font-black text-2xl shadow-inner">
                  {name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-widest leading-none">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500" /> {greeting}
                  </div>
                  <h2 className="text-lg md:text-xl font-black text-white leading-tight mt-1.5">Hey, {firstName}!</h2>
                </div>
              </div>

              {/* Unique Code card box */}
              {primaryCode && (
                <div className="bg-gradient-to-r from-emerald-950/30 via-teal-950/20 to-transparent p-5 rounded-2xl border border-emerald-800/30 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-text">
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold text-slate-400 block uppercase tracking-wider">YOUR TRACKING CODE</span>
                    <span className="font-mono font-black text-2xl text-emerald-455 tracking-wider">{primaryCode}</span>
                  </div>
                  <div className="sm:text-right space-y-1">
                    <span className="text-[10px] font-extrabold text-slate-400 block uppercase tracking-wider">COMMISSION RATE</span>
                    <span className="font-black text-emerald-400 text-xl">{partnerCommission}%</span>
                  </div>
                </div>
              )}

              {/* Main metric panels grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* Total Lifetime commission payout card */}
                <div className="sm:col-span-2 lg:col-span-1 bg-gradient-to-br from-emerald-600 via-teal-700 to-teal-850 p-6 rounded-2.5xl relative overflow-hidden shadow-xl flex flex-col justify-between h-40 hover:shadow-2xl transition-all group border border-emerald-500/25">
                  <div className="absolute -top-6 -right-6 w-36 h-36 bg-white/10 rounded-full blur-2xl group-hover:scale-105 transition-transform duration-500"></div>
                  <div className="flex items-center justify-between z-10">
                    <span className="text-[10px] font-black uppercase tracking-wider text-teal-200">Total Earnings</span>
                    <div className="w-8.5 h-8.5 rounded-full bg-white/10 flex items-center justify-center border border-white/10">
                      <Wallet className="w-4 h-4 text-emerald-200" />
                    </div>
                  </div>
                  <div className="z-10 mt-2">
                    <h3 className="text-3.5xl font-black text-white tracking-tight">{formatPrice(partner?.total_commission || 0)}</h3>
                    <p className="text-[10px] font-semibold text-emerald-250 flex items-center gap-1.5 mt-2">
                      <TrendingUp className="w-3.5 h-3.5" /> Lifetime Earned Cash
                    </p>
                  </div>
                </div>

                {/* Sales count count widget */}
                <div className="bg-slate-950/40 border border-slate-850 p-6 rounded-2.5xl shadow-xl flex flex-col justify-between h-40 hover:border-slate-800 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-450">Total Sales</span>
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                      <ShoppingBag className="w-4 h-4 text-blue-400" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-3.5xl font-black text-white mt-2">{partner?.total_orders || 0}</h3>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide mt-1">Conversions</p>
                  </div>
                </div>

                {/* Pending ledger next cycle widget */}
                <div className="bg-slate-950/40 border border-slate-850 p-6 rounded-2.5xl shadow-xl flex flex-col justify-between h-40 hover:border-slate-800 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-450">Pending Ledger</span>
                    <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                      <Activity className="w-4 h-4 text-amber-400" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-3.5xl font-black text-amber-500 mt-2">{formatPrice(pendingCommission)}</h3>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide mt-1">Next Payout</p>
                  </div>
                </div>
              </div>

              {/* Instructions onboarding card */}
              <div className="bg-gradient-to-r from-emerald-600 to-teal-750 p-6 rounded-2.5xl text-white shadow-xl relative overflow-hidden">
                <div className="absolute right-0 bottom-0 translate-y-4 translate-x-4 opacity-15">
                  <Award className="w-32 h-32 text-white" />
                </div>
                <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 mb-2 text-emerald-200">
                  <Target className="w-4.5 h-4.5" /> Share & Earn
                </h4>
                <p className="text-sm text-white/90 leading-relaxed font-medium">
                  Navigate to the <strong className="text-emerald-300">Promote</strong> tab, generate your unique tracking URLs, and share them to accumulate commissions.
                </p>
              </div>

            </div>
          )}

          {/* Active Tab View: Promote & Marketing Assets */}
          {activeTab === "promote" && (
            <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div>
                <h3 className="text-2xl font-black text-white tracking-tight">Promote Products</h3>
                <p className="text-xs text-slate-450 mt-0.5">Generate sales links & copy Swipe templates</p>
              </div>

              {primaryCode ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((product) => {
                    const isPhysical = product.product_type === 'PHYSICAL_BOOK' || product.product_type === 'TREATMENT_KIT';
                    const link = `https://meditonic.glowhomeo.com/${isPhysical ? 'store' : 'ebooks'}/${product.slug}?ref=${primaryCode}`;
                    const estimatedEarnings = (product.price * partnerCommission) / 100;
                    const imageSrc = product.cover_image_path?.startsWith('http') 
                      ? product.cover_image_path 
                      : product.cover_image_path 
                        ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${product.cover_image_path}` 
                        : product.image_url;

                    const socialText = `Check out Dr. Aman Agrawal's premium homeopathy treatment program: "${product.title}"! Get a special discount with my exclusive code ${primaryCode} at checkout: ${link}`;
                    const emailSubject = `Homeopathy Care: ${product.title}`;
                    const emailBody = `Hello,\n\nI highly recommend checking out "${product.title}" by Dr. Aman Agrawal. It is a premium homeopathy program.\n\nYou can use my code "${primaryCode}" at checkout to get an exclusive discount.\n\nLink to program: ${link}\n\nBest regards!`;

                    const isExpanded = expandedProduct === product.id;

                    return (
                      <div key={product.id} className="bg-slate-950/40 rounded-2.5xl border border-slate-850 overflow-hidden shadow-xl flex flex-col p-5 gap-4 hover:border-slate-800 hover:bg-slate-950/60 transition-all">
                        <div className="w-full h-48 bg-slate-900 rounded-xl overflow-hidden shrink-0 border border-slate-850 flex items-center justify-center relative shadow-inner">
                          {imageSrc ? (
                            <img src={imageSrc} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <ShoppingBag className="w-8 h-8 text-slate-700" />
                          )}
                        </div>
                        <div className="flex-1 flex flex-col justify-between min-w-0 space-y-3">
                          <div>
                            <h4 className="font-extrabold text-sm text-white truncate pr-1" title={product.title}>
                              {product.title}
                            </h4>
                            <p className="text-xs font-bold text-slate-450 mt-1">Retail: {formatPrice(product.price)}</p>
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-emerald-450 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg mt-2.5">
                              Comms: {formatPrice(estimatedEarnings)}
                            </span>
                          </div>
                          
                          <div className="flex gap-2 pt-2">
                            <button 
                              onClick={() => copyToClipboard(product.id, link)}
                              className={`flex-1 h-9.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95 border ${
                                copied === product.id 
                                  ? "bg-emerald-600 border-emerald-600 text-white" 
                                  : "bg-slate-900 border-slate-800 text-slate-350 hover:bg-white hover:text-slate-900 hover:border-white"
                              }`}
                            >
                              {copied === product.id ? (
                                <><Check className="w-3.5 h-3.5" /> Copied!</>
                              ) : (
                                <><LinkIcon className="w-3.5 h-3.5" /> Copy Link</>
                              )}
                            </button>
                            
                            <button
                              onClick={() => setExpandedProduct(isExpanded ? null : product.id)}
                              className="h-9.5 px-3.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-350 hover:text-white hover:border-slate-705 flex items-center justify-center text-[10px] font-black uppercase tracking-wider transition-all"
                            >
                              Swipe Copy {isExpanded ? "▲" : "▼"}
                            </button>
                          </div>
                        </div>

                        {/* Collapsible Swipe Assets */}
                        {isExpanded && (
                          <div className="border-t border-slate-850/80 pt-3 mt-1 space-y-3 animate-in slide-in-from-top-1.5 duration-200">
                            {/* Social Post Swipe */}
                            <div className="space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Social Post Swipe</span>
                                <button
                                  onClick={() => copyTextSwipe(`social-${product.id}`, socialText)}
                                  className="text-[9px] font-black text-emerald-450 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20"
                                >
                                  {copiedTextType === `social-${product.id}` ? "Copied!" : "Copy Post"}
                                </button>
                              </div>
                              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-850 text-[11px] font-medium text-slate-300 max-h-16 overflow-y-auto select-text leading-relaxed">
                                {socialText}
                              </div>
                            </div>

                            {/* Email Swipe */}
                            <div className="space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Email Campaign Swipe</span>
                                <button
                                  onClick={() => copyTextSwipe(`email-${product.id}`, emailBody)}
                                  className="text-[9px] font-black text-emerald-455 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20"
                                >
                                  {copiedTextType === `email-${product.id}` ? "Copied!" : "Copy Body"}
                                </button>
                              </div>
                              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-850 text-[11px] font-medium text-slate-300 max-h-20 overflow-y-auto select-text leading-relaxed whitespace-pre-line">
                                <strong>Subject:</strong> {emailSubject}
                                <br/><br/>
                                {emailBody}
                              </div>
                            </div>
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-amber-950/20 border border-amber-900/30 rounded-2.5xl p-8 text-center shadow-xl max-w-md mx-auto">
                  <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-amber-500">Generating Tracking Code</h4>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">Your affiliate parameters are being updated by the system.</p>
                </div>
              )}
            </div>
          )}

          {/* Active Tab View: Ledger */}
          {activeTab === "ledger" && (
            <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-350">
              <div>
                <h3 className="text-2xl font-black text-white tracking-tight">Activity Ledger</h3>
                <p className="text-xs text-slate-450 mt-0.5">Transparent conversions tracking and pay-out status logs</p>
              </div>

              <div className="bg-slate-950/40 rounded-2.5xl border border-slate-850 shadow-xl overflow-hidden select-text">
                {attributions.length === 0 ? (
                  <div className="p-12 text-center flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-850 flex items-center justify-center mb-4">
                      <Target className="w-6 h-6 text-slate-500" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-300">No conversions recorded yet</h4>
                    <p className="text-xs text-slate-450 mt-2 max-w-[240px] mx-auto leading-relaxed">Referral payouts will register here automatically once orders are completed.</p>
                  </div>
                ) : (
                  <div>
                    {/* Desktop Table Header */}
                    <div className="hidden sm:grid sm:grid-cols-4 sm:gap-4 px-6 py-4 bg-slate-950/80 border-b border-slate-850 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      <div>Product Type</div>
                      <div>Date Created</div>
                      <div>Status</div>
                      <div className="text-right">Commission</div>
                    </div>

                    <div className="divide-y divide-slate-850/60">
                      {attributions.map((attr) => (
                        <div key={attr.id}>
                          {/* Desktop Row */}
                          <div className="hidden sm:grid sm:grid-cols-4 sm:gap-4 sm:items-center px-6 py-4.5 hover:bg-slate-950/20 transition-colors">
                            <div className="text-xs font-black text-slate-200 truncate uppercase tracking-wider">
                              {attr.product_type ? attr.product_type.replace('_', ' ') : 'Commission'}
                            </div>
                            <div className="text-xs text-slate-400 flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-500" />
                              {new Date(attr.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                            <div>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] uppercase tracking-widest font-black ${
                                attr.status === 'paid' 
                                  ? 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/20' 
                                  : 'bg-amber-500/10 text-amber-450 border border-amber-500/20'
                              }`}>{attr.status}</span>
                            </div>
                            <div className="text-right text-sm font-black text-emerald-400">
                              +{formatPrice(attr.commission_amount)}
                            </div>
                          </div>

                          {/* Mobile View Card */}
                          <div className="sm:hidden p-4 flex items-center justify-between hover:bg-slate-950/20 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className={`w-8.5 h-8.5 rounded-full flex items-center justify-center border shrink-0 ${
                                attr.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-450 border-amber-500/20'
                              }`}>
                                {attr.status === 'paid' ? <Check className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                              </div>
                              <div>
                                <p className="text-xs font-black text-white truncate max-w-[140px] uppercase tracking-wide">
                                  {attr.product_type ? attr.product_type.replace('_', ' ') : 'Commission'}
                                </p>
                                <p className="text-[9px] text-slate-500 mt-0.5 flex items-center gap-1 font-semibold">
                                  <Calendar className="w-3 h-3 text-slate-500" />
                                  {new Date(attr.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-black text-emerald-400">+{formatPrice(attr.commission_amount)}</p>
                              <span className={`inline-block text-[9px] uppercase tracking-widest font-black mt-0.5 ${
                                attr.status === 'paid' ? 'text-emerald-405' : 'text-amber-455'
                              }`}>{attr.status}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Active Tab View: Payouts Ledger & Receipt Lightbox */}
          {activeTab === "payouts" && (
            <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-350">
              <div>
                <h3 className="text-2xl font-black text-white tracking-tight">Monthly Payouts</h3>
                <p className="text-xs text-slate-450 mt-0.5">Logs of cleared payouts, admin remarks, and payment receipts</p>
              </div>

              {/* Payout Stats Summary Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 select-none">
                <div className="bg-slate-950/40 border border-slate-850 p-5 md:p-6 rounded-2.5xl shadow-xl space-y-1">
                  <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider">Unpaid balance</span>
                  <span className="font-black text-2xl text-amber-500 block">{formatPrice(pendingCommission)}</span>
                  <span className="text-[9px] font-bold text-slate-500 block">Clears in next monthly payout</span>
                </div>
                <div className="bg-slate-950/40 border border-slate-850 p-5 md:p-6 rounded-2.5xl shadow-xl space-y-1">
                  <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider">Total Paid Out</span>
                  <span className="font-black text-2xl text-emerald-400 block">{formatPrice(totalClearedPayouts)}</span>
                  <span className="text-[9px] font-bold text-emerald-500/80 block">Historically paid out</span>
                </div>
              </div>

              {/* Payouts list */}
              <div className="bg-slate-950/40 rounded-2.5xl border border-slate-850 shadow-xl overflow-hidden select-text">
                {payouts.length === 0 ? (
                  <div className="p-12 text-center flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-850 flex items-center justify-center mb-4">
                      <Wallet className="w-6 h-6 text-slate-500" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-300">No payouts cleared yet</h4>
                    <p className="text-xs text-slate-450 mt-2 max-w-[240px] mx-auto leading-relaxed">Your monthly payout confirmations and receipts will display here once processed.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-850/60 p-4 md:p-6 space-y-4">
                    {payouts.map((payout) => (
                      <div key={payout.id} className="p-5 bg-slate-900/30 hover:bg-slate-900/50 transition-all border border-slate-850/80 rounded-2xl space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="bg-emerald-500/10 text-emerald-400 text-[9px] font-black uppercase px-2.5 py-0.5 rounded border border-emerald-500/20">
                              Cleared
                            </span>
                            <span className="text-[10px] text-slate-450 font-bold flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-500" />
                              {new Date(payout.paid_at || payout.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                          <span className="font-black text-lg text-white">{formatPrice(payout.amount)}</span>
                        </div>

                        {/* Reference and payment method */}
                        <div className="text-[10px] text-slate-350 font-semibold flex justify-between bg-slate-950/50 p-2.5 rounded-lg border border-slate-850 gap-4">
                          <span><strong>Method:</strong> {payout.payment_method === 'upi' ? 'UPI' : 'Bank Transfer'}</span>
                          <span className="truncate max-w-[200px]"><strong>Ref:</strong> {payout.transaction_reference || "N/A"}</span>
                        </div>

                        {/* Admin Remarks */}
                        {payout.admin_remarks && (
                          <div className="text-[10px] text-slate-400 bg-slate-950/20 p-2.5 rounded-lg border border-slate-850/60 italic">
                            &ldquo;{payout.admin_remarks}&rdquo;
                          </div>
                        )}

                        {/* View Screenshot button */}
                        {payout.receipt_url && (
                          <button
                            onClick={() => setSelectedReceipt(payout.receipt_url)}
                            className="w-full h-9 rounded-xl border border-slate-800 text-slate-300 hover:bg-white hover:text-slate-900 hover:border-white flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-wider transition-all"
                          >
                            <Eye className="w-3.5 h-3.5" /> View Payment Receipt
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur-md border-t border-slate-850 pt-2 pb-4.5 flex justify-around items-center z-45 shadow-[0_-4px_12px_rgba(0,0,0,0.2)]">
        <button 
          onClick={() => setActiveTab("overview")}
          className={`flex flex-col items-center gap-1 transition-all duration-200 px-3 py-1 rounded-xl relative ${
            activeTab === 'overview' ? 'text-emerald-400 scale-105' : 'text-slate-450 hover:text-slate-300'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[8px] font-bold uppercase tracking-wider">Home</span>
          {activeTab === 'overview' && <span className="absolute -bottom-1.5 w-1 h-1 bg-emerald-400 rounded-full"></span>}
        </button>
        
        <button 
          onClick={() => setActiveTab("promote")}
          className={`flex flex-col items-center gap-1 transition-all duration-200 px-3 py-1 rounded-xl relative ${
            activeTab === 'promote' ? 'text-emerald-400 scale-105' : 'text-slate-450 hover:text-slate-300'
          }`}
        >
          <Compass className="w-5 h-5" />
          <span className="text-[8px] font-bold uppercase tracking-wider">Promote</span>
          {activeTab === 'promote' && <span className="absolute -bottom-1.5 w-1 h-1 bg-emerald-400 rounded-full"></span>}
        </button>
        
        <button 
          onClick={() => setActiveTab("ledger")}
          className={`flex flex-col items-center gap-1 transition-all duration-200 px-3 py-1 rounded-xl relative ${
            activeTab === 'ledger' ? 'text-emerald-400 scale-105' : 'text-slate-450 hover:text-slate-300'
          }`}
        >
          <FileText className="w-5 h-5" />
          <span className="text-[8px] font-bold uppercase tracking-wider">Ledger</span>
          {activeTab === 'ledger' && <span className="absolute -bottom-1.5 w-1 h-1 bg-emerald-400 rounded-full"></span>}
        </button>

        <button 
          onClick={() => setActiveTab("payouts")}
          className={`flex flex-col items-center gap-1 transition-all duration-200 px-3 py-1 rounded-xl relative ${
            activeTab === 'payouts' ? 'text-emerald-450 scale-105' : 'text-slate-450 hover:text-slate-300'
          }`}
        >
          <Wallet className="w-5 h-5" />
          <span className="text-[8px] font-bold uppercase tracking-wider">Payouts</span>
          {activeTab === 'payouts' && <span className="absolute -bottom-1.5 w-1 h-1 bg-emerald-400 rounded-full"></span>}
        </button>
      </nav>

      {/* Lightbox Screenshot Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-4.5 border-b border-slate-805 bg-slate-950 flex justify-between items-center shrink-0">
              <span className="text-xs font-black text-white uppercase tracking-wider">Payment Proof Screenshot</span>
              <button 
                onClick={() => setSelectedReceipt(null)}
                className="w-8 h-8 rounded-full bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center font-bold text-sm transition-colors"
              >
                ×
              </button>
            </div>
            <div className="p-6 flex items-center justify-center bg-slate-955">
              <img src={selectedReceipt} alt="Payment Receipt" className="max-w-full max-h-120 object-contain rounded-xl shadow border border-slate-800 select-text" />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

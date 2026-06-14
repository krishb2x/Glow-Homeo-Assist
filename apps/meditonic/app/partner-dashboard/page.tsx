"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "../../lib/supabase-browser";
import { 
  Copy, Check, LogOut, DollarSign, 
  ShoppingBag, Loader2, Sparkles, Target, Link as LinkIcon, 
  Wallet, Activity, TrendingUp, Clock, Home, Compass, FileText, Share2, Award, Calendar, ChevronRight
} from "lucide-react";
import { formatPrice } from "../../lib/utils";

type TabType = "overview" | "promote" | "ledger";

export default function PartnerDashboard() {
  const router = useRouter();
  const [partner, setPartner] = useState<any>(null);
  const [codes, setCodes] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [attributions, setAttributions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState("");
  const [greeting, setGreeting] = useState("Welcome");
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [timeString, setTimeString] = useState("09:41 AM");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");

    // Dynamic Clock inside Mobile Status Bar
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; 
      setTimeString(`${hours}:${minutes} ${ampm}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);

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
          .select("id, title, slug, price, cover_image_path, image_url")
          .eq("clinic_id", "595cd444-e89c-4d1f-b31f-27f76f59e0d7") 
          .eq("is_active", true)
          .order("display_order", { ascending: true });

        if (productsData) {
          setProducts(productsData);
        }

      } catch (err) {
        console.error(err);
        router.push("/partner-login");
      } finally {
        setLoading(false);
      }
    };

    fetchPartnerData();
    return () => clearInterval(interval);
  }, [router]);

  const copyToClipboard = (id: string, link: string) => {
    navigator.clipboard.writeText(link);
    setCopied(id);
    setTimeout(() => setCopied(""), 2000);
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
  const partnerCommission = codes.length > 0 && codes[0].commission_rate ? codes[0].commission_rate : partner.base_commission_rate;
  
  const pendingCommission = attributions
    .filter(a => a.status === 'pending')
    .reduce((sum, a) => sum + (a.commission_amount || 0), 0);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center font-sans md:py-6 select-none animate-in fade-in duration-500">
      
      {/* Phone Simulator Frame Shell on Desktop */}
      <div className="w-full md:max-w-md md:h-[840px] bg-slate-50 flex flex-col relative overflow-hidden md:rounded-[40px] md:shadow-2xl md:border-[10px] md:border-slate-800">
        
        {/* Notch - Speaker Notch Simulator */}
        <div className="hidden md:block absolute top-0 left-1/2 -translate-x-1/2 w-36 h-5.5 bg-slate-850 rounded-b-2xl z-55">
          <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-16 h-1 bg-slate-850 rounded-full"></div>
          <div className="absolute top-1 right-8 w-2 h-2 bg-slate-900 rounded-full border border-slate-950"></div>
        </div>

        {/* Dynamic Mobile OS Status Bar (Desktop Mockup Only) */}
        <div className="hidden md:flex items-center justify-between px-6 pt-5 pb-2 bg-white text-slate-800 text-[11px] shrink-0 select-none font-bold z-50">
          <div>{timeString}</div>
          <div className="flex items-center gap-2">
            <span className="flex items-end gap-0.5 h-2.5">
              <span className="w-0.5 h-1.2 bg-slate-850 rounded-sm"></span>
              <span className="w-0.5 h-1.6 bg-slate-850 rounded-sm"></span>
              <span className="w-0.5 h-2 bg-slate-850 rounded-sm"></span>
              <span className="w-0.5 h-2.4 bg-slate-850 rounded-sm"></span>
            </span>
            <span className="text-[10px] font-black tracking-tighter">5G</span>
            {/* Battery Indicator */}
            <div className="flex items-center border border-slate-700 rounded-md p-0.5 w-6 h-3 relative">
              <div className="bg-emerald-600 h-full w-4/5 rounded-[1px]"></div>
              <div className="absolute -right-0.5 top-[3px] w-0.5 h-1 bg-slate-700 rounded-r-[1px]"></div>
            </div>
          </div>
        </div>

        {/* Dynamic App Header */}
        <header className="sticky top-0 z-40 bg-white border-b border-slate-100 px-5 pt-4 pb-3 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9.5 h-9.5 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-600 to-teal-800 flex items-center justify-center text-white font-serif font-black shadow-md shadow-emerald-500/20 text-sm">
              M
            </div>
            <div>
              <span className="text-[9px] font-black text-slate-400 block uppercase tracking-widest leading-none">MediTonic</span>
              <span className="font-black text-sm text-slate-800 tracking-tight mt-0.5 block">Partner Hub</span>
            </div>
          </div>
          <button 
            onClick={handleLogout} 
            className="w-9 h-9 rounded-xl bg-slate-50 text-slate-500 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-all active:scale-95 border border-slate-100 shadow-sm"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </header>

        {/* Scrollable Screen Viewport */}
        <div className="flex-1 overflow-y-auto px-5 py-5 pb-28 space-y-5 bg-slate-50">
          
          {activeTab === "overview" && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
              
              {/* Profile Card Header */}
              <div className="flex items-center gap-3.5 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl"></div>
                <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 border border-emerald-400 flex items-center justify-center text-white font-black text-xl shadow-inner">
                  {name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-1 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500 animate-pulse" /> {greeting}
                  </div>
                  <h2 className="text-base font-black text-slate-800 leading-tight">Hey, {firstName}!</h2>
                </div>
              </div>

              {/* Unique Code card box */}
              {primaryCode && (
                <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent p-4 rounded-2xl border border-emerald-500/20 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-extrabold text-slate-400 block uppercase tracking-wider">YOUR TRACKING CODE</span>
                    <span className="font-mono font-black text-xl text-slate-800 tracking-widest">{primaryCode}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-extrabold text-slate-400 block uppercase tracking-wider">COMMISSION RATE</span>
                    <span className="font-black text-emerald-600 text-lg">{partnerCommission}%</span>
                  </div>
                </div>
              )}

              {/* Main metric panels grid */}
              <div className="grid grid-cols-2 gap-4">
                
                {/* Total Lifetime commission payout card */}
                <div className="col-span-2 bg-gradient-to-br from-emerald-600 via-teal-700 to-teal-800 p-5 rounded-3xl relative overflow-hidden shadow-lg shadow-teal-950/15 flex flex-col justify-between h-36 hover:shadow-xl transition-all">
                  <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                  <div className="flex items-center justify-between z-10">
                    <span className="text-[10px] font-black uppercase tracking-wider text-teal-200">Total Earnings</span>
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/10">
                      <Wallet className="w-4 h-4 text-emerald-200" />
                    </div>
                  </div>
                  <div className="z-10 mt-2">
                    <h3 className="text-3xl font-black text-white tracking-tight">{formatPrice(partner.total_commission)}</h3>
                    <p className="text-[10px] font-semibold text-emerald-200 flex items-center gap-1 mt-1.5">
                      <TrendingUp className="w-3.5 h-3.5" /> Lifetime Earned Cash
                    </p>
                  </div>
                </div>

                {/* Sales count count widget */}
                <div className="bg-white p-4 rounded-2.5xl border border-slate-100 shadow-sm flex flex-col justify-between h-30 hover:border-slate-200 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Sales</span>
                    <div className="w-7.5 h-7.5 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100">
                      <ShoppingBag className="w-3.5 h-3.5 text-blue-500" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900">{partner.total_orders}</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mt-1">Conversions</p>
                  </div>
                </div>

                {/* Pending ledger next cycle widget */}
                <div className="bg-white p-4 rounded-2.5xl border border-slate-100 shadow-sm flex flex-col justify-between h-30 hover:border-slate-200 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Pending Ledger</span>
                    <div className="w-7.5 h-7.5 rounded-full bg-amber-50 flex items-center justify-center border border-amber-100">
                      <Activity className="w-3.5 h-3.5 text-amber-500" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-amber-600">{formatPrice(pendingCommission)}</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mt-1">Next Payout</p>
                  </div>
                </div>
              </div>

              {/* Instructions onboarding card */}
              <div className="bg-gradient-to-r from-emerald-500 to-teal-650 p-5 rounded-2.5xl text-white shadow-md relative overflow-hidden">
                <div className="absolute right-0 bottom-0 translate-y-4 translate-x-4 opacity-15">
                  <Award className="w-24 h-24 text-white" />
                </div>
                <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 mb-1.5 text-emerald-100">
                  <Target className="w-4 h-4" /> Share & Earn
                </h4>
                <p className="text-xs text-white/90 leading-relaxed font-medium">
                  Navigate to the <strong className="text-emerald-100">Promote</strong> tab below, extract your unique tracking URLs, and share them to accumulate commissions.
                </p>
              </div>

            </div>
          )}

          {activeTab === "promote" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div>
                <h3 className="text-lg font-black text-slate-800">Promote Products</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Estimated commissions per successful order attributions</p>
              </div>

              {primaryCode ? (
                <div className="space-y-3.5">
                  {products.map((product) => {
                    const link = `https://meditonic.glowhomeo.com/ebooks/${product.slug}?ref=${primaryCode}`;
                    const estimatedEarnings = (product.price * partnerCommission) / 100;
                    const imageSrc = product.cover_image_path?.startsWith('http') 
                      ? product.cover_image_path 
                      : product.cover_image_path 
                        ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${product.cover_image_path}` 
                        : product.image_url;

                    return (
                      <div key={product.id} className="bg-white rounded-2.5xl border border-slate-100 overflow-hidden shadow-sm flex p-3.5 gap-4 hover:border-slate-200 transition-colors">
                        <div className="w-20 h-24 bg-slate-50 rounded-xl overflow-hidden shrink-0 border border-slate-100 flex items-center justify-center relative shadow-inner">
                          {imageSrc ? (
                            <img src={imageSrc} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <ShoppingBag className="w-6 h-6 text-slate-300" />
                          )}
                        </div>
                        <div className="flex-1 flex flex-col justify-between min-w-0">
                          <div>
                            <h4 className="font-extrabold text-sm text-slate-800 truncate pr-1" title={product.title}>
                              {product.title}
                            </h4>
                            <p className="text-[11px] font-bold text-slate-400 mt-0.5">Retail: {formatPrice(product.price)}</p>
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-500/10 border border-emerald-500/10 px-2.5 py-0.5 rounded-lg mt-2">
                              Comms: {formatPrice(estimatedEarnings)}
                            </span>
                          </div>
                          
                          <button 
                            onClick={() => copyToClipboard(product.id, link)}
                            className={`w-full h-9 mt-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95 border ${
                              copied === product.id 
                                ? "bg-emerald-600 border-emerald-600 text-white shadow-sm" 
                                : "bg-slate-100 border-slate-100 text-slate-650 hover:bg-slate-900 hover:text-white"
                            }`}
                          >
                            {copied === product.id ? (
                              <><Check className="w-3.5 h-3.5" /> Copied!</>
                            ) : (
                              <><LinkIcon className="w-3.5 h-3.5" /> Copy Promo Link</>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 text-center shadow-sm">
                  <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-amber-800">Generating Tracking Code</h4>
                  <p className="text-xs text-amber-700/80 mt-1">Your code is being generated by the system. Please wait a moment.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "ledger" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div>
                <h3 className="text-lg font-black text-slate-805 text-slate-800">Activity Ledger</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Transparent conversions tracking and pay-out status logs</p>
              </div>

              <div className="bg-white rounded-2.5xl border border-slate-100 shadow-sm overflow-hidden">
                {attributions.length === 0 ? (
                  <div className="p-8 text-center flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mb-3">
                      <Target className="w-6 h-6 text-slate-300" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-700">No conversions recorded</h4>
                    <p className="text-xs text-slate-400 mt-1.5 max-w-[200px] mx-auto leading-relaxed">Referral payouts will register here automatically once orders are completed.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {attributions.map((attr) => (
                      <div key={attr.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-8.5 h-8.5 rounded-full flex items-center justify-center border shrink-0 ${
                            attr.status === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                          }`}>
                            {attr.status === 'paid' ? <Check className="w-4.5 h-4.5" /> : <Clock className="w-4.5 h-4.5" />}
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-800 truncate max-w-[140px] uppercase tracking-wide">
                              {attr.product_type ? attr.product_type.replace('_', ' ') : 'Commission'}
                            </p>
                            <p className="text-[9px] text-slate-400 mt-0.5 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(attr.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-emerald-600">+{formatPrice(attr.commission_amount)}</p>
                          <span className={`inline-block text-[9px] uppercase tracking-widest font-black mt-0.5 ${
                            attr.status === 'paid' ? 'text-emerald-600' : 'text-amber-600'
                          }`}>{attr.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Bottom App Navigation Bar (Fixed bottom inside mobile viewport mockup) */}
        <nav className="absolute bottom-0 left-0 w-full bg-white/95 backdrop-blur-md border-t border-slate-100 pt-3 pb-3 md:pb-6 flex flex-col items-center shrink-0 z-40 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
          <div className="flex justify-around items-center w-full">
            <button 
              onClick={() => setActiveTab("overview")}
              className={`flex flex-col items-center gap-1 transition-all duration-250 px-4 py-1 rounded-xl relative ${
                activeTab === 'overview' ? 'text-emerald-600 scale-105' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Home className="w-5.5 h-5.5" />
              <span className="text-[9px] font-black uppercase tracking-wider">Home</span>
              {activeTab === 'overview' && <span className="absolute -bottom-1.5 w-1.2 h-1.2 bg-emerald-600 rounded-full"></span>}
            </button>
            
            <button 
              onClick={() => setActiveTab("promote")}
              className={`flex flex-col items-center gap-1 transition-all duration-250 px-4 py-1 rounded-xl relative ${
                activeTab === 'promote' ? 'text-emerald-600 scale-105' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Compass className="w-5.5 h-5.5" />
              <span className="text-[9px] font-black uppercase tracking-wider">Promote</span>
              {activeTab === 'promote' && <span className="absolute -bottom-1.5 w-1.2 h-1.2 bg-emerald-600 rounded-full"></span>}
            </button>
            
            <button 
              onClick={() => setActiveTab("ledger")}
              className={`flex flex-col items-center gap-1 transition-all duration-250 px-4 py-1 rounded-xl relative ${
                activeTab === 'ledger' ? 'text-emerald-600 scale-105' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <FileText className="w-5.5 h-5.5" />
              <span className="text-[9px] font-black uppercase tracking-wider">Ledger</span>
              {activeTab === 'ledger' && <span className="absolute -bottom-1.5 w-1.2 h-1.2 bg-emerald-600 rounded-full"></span>}
            </button>
          </div>
          
          {/* iOS Home Pill indicator (Desktop mockup simulation only) */}
          <div className="hidden md:block w-32 h-1.2 bg-slate-300 rounded-full mt-4"></div>
        </nav>

      </div>
    </div>
  );
}

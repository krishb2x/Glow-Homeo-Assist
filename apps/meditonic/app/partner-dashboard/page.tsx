"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "../../lib/supabase-browser";
import { 
  Copy, Check, LogOut, DollarSign, 
  ShoppingBag, Loader2, Sparkles, Target, Link as LinkIcon, Wallet, Activity, TrendingUp, Clock
} from "lucide-react";
import { formatPrice } from "../../lib/utils";

export default function PartnerDashboard() {
  const router = useRouter();
  const [partner, setPartner] = useState<any>(null);
  const [codes, setCodes] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [attributions, setAttributions] = useState<any[]>([]);
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
          .eq("clinic_id", "595cd444-e89c-4d1f-b31f-27f76f59e0d7") // BRAND.clinicId
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
  }, [router]);

  const copyToClipboard = (id: string, link: string) => {
    navigator.clipboard.writeText(link);
    setCopied(id);
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
        <Loader2 className="w-12 h-12 animate-spin text-emerald-500 mb-6 drop-shadow-md" />
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    );
  }

  const name = partner?.mt_partner_applications?.name || "Partner";
  const firstName = name.split(" ")[0];
  const revenue = partner.total_revenue || 0;
  
  // Use the first active code as the primary tracking ID
  const primaryCode = codes.length > 0 ? codes[0].code : null;
  const partnerCommission = codes.length > 0 && codes[0].commission_rate ? codes[0].commission_rate : partner.base_commission_rate;
  
  const pendingCommission = attributions
    .filter(a => a.status === 'pending')
    .reduce((sum, a) => sum + (a.commission_amount || 0), 0);
    
  const paidCommission = attributions
    .filter(a => a.status === 'paid')
    .reduce((sum, a) => sum + (a.commission_amount || 0), 0);

  return (
    <div className="min-h-[100dvh] bg-[#F8FAFC] pb-16 font-sans w-full overflow-x-hidden relative">
      
      {/* Dynamic Background Elements for depth */}
      <div className="absolute top-0 left-0 w-full h-[400px] bg-gradient-to-b from-emerald-900/5 to-transparent -z-10 pointer-events-none"></div>
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] -z-10 pointer-events-none"></div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-white/20 shadow-sm">
        <div className="px-4 md:px-8 h-16 flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-700 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-md shadow-emerald-500/20 ring-1 ring-white/50">
              M
            </div>
            <span className="font-bold text-slate-800 tracking-tight flex items-center gap-2">
              Partner Hub
              <span className="hidden sm:inline-flex px-2 py-0.5 bg-emerald-100/80 text-emerald-800 text-[10px] uppercase font-black tracking-widest rounded-full border border-emerald-200/50">
                Beta
              </span>
            </span>
          </div>
          <button 
            onClick={handleLogout} 
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100/80 text-sm font-bold text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-all active:scale-95"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      <main className="px-4 pt-8 md:pt-12 max-w-7xl mx-auto space-y-12">
        
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-full shadow-sm mb-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">{greeting}</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight animate-in fade-in slide-in-from-bottom-4 duration-700">
              {firstName}
            </h1>
          </div>
          
          {primaryCode && (
            <div className="flex items-center gap-3 bg-white p-2 pl-4 rounded-2xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-right-8 duration-700">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global Tracking ID</span>
                <span className="font-mono font-bold text-slate-800">{primaryCode}</span>
              </div>
              <div className="h-8 w-[1px] bg-slate-200 mx-1"></div>
              <div className="flex flex-col pr-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Base Rate</span>
                <span className="font-bold text-emerald-600">{partnerCommission}%</span>
              </div>
            </div>
          )}
        </div>

        {/* PERFORMANCE METRICS (Glassmorphism & Gradients) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 relative overflow-hidden shadow-xl shadow-slate-900/10 group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
            <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-blue-500/20 rounded-full blur-xl"></div>
            
            <div className="relative z-10 flex flex-col h-full justify-between gap-6">
              <div className="flex items-center gap-3">
                <div className="bg-white/10 p-2.5 rounded-xl backdrop-blur-sm border border-white/10 text-emerald-400">
                  <Wallet className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-slate-300">Total Earnings</span>
              </div>
              <div>
                <h3 className="text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-sm">
                  {formatPrice(partner.total_commission)}
                </h3>
                <div className="flex items-center gap-2 mt-2 text-sm font-medium text-emerald-400">
                  <TrendingUp className="w-4 h-4" /> Lifetime generated
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-slate-300 transition-colors">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-[100px] -z-0 transition-transform group-hover:scale-110 duration-500"></div>
            <div className="relative z-10 flex flex-col h-full justify-between gap-6">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2.5 rounded-xl text-blue-600">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Conversions</span>
              </div>
              <div>
                <h3 className="text-4xl font-black text-slate-900 tracking-tight">
                  {partner.total_orders}
                </h3>
                <div className="text-sm font-semibold text-slate-400 mt-2">Successful sales</div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-6 border border-amber-200/60 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/60 rounded-bl-[100px] -z-0"></div>
            <div className="relative z-10 flex flex-col h-full justify-between gap-6">
              <div className="flex items-center gap-3 text-amber-700">
                <div className="bg-white/80 p-2.5 rounded-xl shadow-sm border border-amber-100">
                  <Activity className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest">Pending Payout</span>
              </div>
              <div>
                <h3 className="text-4xl font-black text-amber-900 tracking-tight">
                  {formatPrice(pendingCommission)}
                </h3>
                <div className="text-sm font-bold text-amber-700/60 mt-2">Awaiting next cycle</div>
              </div>
            </div>
          </div>
        </div>

        {/* PRODUCTS MARKETPLACE */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Promote Products</h2>
          </div>
          
          {primaryCode ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => {
                const link = `https://meditonic.glowhomeo.com/ebooks/${product.slug}?ref=${primaryCode}`;
                const estimatedEarnings = (product.price * partnerCommission) / 100;
                const imageSrc = product.cover_image_path?.startsWith('http') 
                  ? product.cover_image_path 
                  : product.cover_image_path 
                    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${product.cover_image_path}` 
                    : product.image_url;

                return (
                  <div key={product.id} className="bg-white rounded-[24px] border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col group">
                    <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
                      {imageSrc ? (
                        <img src={imageSrc} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300"><ShoppingBag className="w-12 h-12" /></div>
                      )}
                      
                      {/* Commission Badge overlay */}
                      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/50 shadow-sm flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="font-bold text-emerald-700 text-sm">{formatPrice(estimatedEarnings)} <span className="text-slate-400 text-xs">/sale</span></span>
                      </div>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between gap-6">
                      <div>
                        <h3 className="font-bold text-lg text-slate-900 mb-2 leading-tight" title={product.title}>
                          {product.title}
                        </h3>
                        <div className="text-slate-500 font-semibold text-sm">Retail: {formatPrice(product.price)}</div>
                      </div>
                      
                      <button 
                        onClick={() => copyToClipboard(product.id, link)}
                        className={`w-full h-12 rounded-xl text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 ${
                          copied === product.id 
                            ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25" 
                            : "bg-slate-100 text-slate-700 hover:bg-slate-900 hover:text-white"
                        }`}
                      >
                        {copied === product.id ? (
                          <><Check className="w-4 h-4" /> Link Copied!</>
                        ) : (
                          <><LinkIcon className="w-4 h-4" /> Copy Affiliate Link</>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-amber-50/80 backdrop-blur-sm border border-amber-200/80 rounded-3xl p-8 text-center shadow-sm max-w-2xl mx-auto">
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
              <h3 className="text-xl font-bold text-amber-900 mb-2">Generating Tracking ID</h3>
              <p className="text-amber-700/80 font-medium">Your account is active. The system is securely generating your unique tracking code. This usually takes a few minutes.</p>
            </div>
          )}

          {/* TRANSPARENCY LEDGER */}
          <div className="pt-8">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-6">Recent Activity</h2>
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              {attributions.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4">
                    <Target className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-1">No sales recorded yet</h3>
                  <p className="text-slate-500">Share your links above to start earning commissions!</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {attributions.slice(0, 10).map((attr) => (
                    <div key={attr.id} className="p-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${
                          attr.status === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                        }`}>
                          {attr.status === 'paid' ? <Check className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{attr.product_type ? attr.product_type.replace('_', ' ').toUpperCase() : 'PRODUCT SALE'}</p>
                          <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">{new Date(attr.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-emerald-600">+{formatPrice(attr.commission_amount)}</p>
                        <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mt-1">{attr.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}

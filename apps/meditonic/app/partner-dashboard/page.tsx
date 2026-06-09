"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { 
  Copy, Check, LogOut, DollarSign, 
  ShoppingBag, Loader2, Sparkles, Target, Link as LinkIcon
} from "lucide-react";
import { formatPrice } from "@/lib/utils";

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
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mb-4" />
        <p className="text-slate-500 font-medium animate-pulse">Loading dashboard...</p>
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
          <div className="flex items-center justify-between">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              {firstName}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-full border border-emerald-200">
                <Sparkles className="w-3 h-3" /> Partner
              </span>
            </h1>
            {primaryCode && (
              <div className="hidden sm:flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium">
                Tracking ID: <span className="font-mono text-emerald-400">{primaryCode}</span>
              </div>
            )}
          </div>
        </div>

        {/* PERFORMANCE METRICS */}
        <h2 className="text-lg font-bold text-slate-900 mb-4 px-1">Performance</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-10">
          
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

          <div className="bg-amber-50/50 rounded-2xl p-4 md:p-5 border border-amber-200/50 shadow-sm col-span-1">
            <div className="flex items-center gap-2 mb-3 text-amber-600">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Pending</span>
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
              {formatPrice(pendingCommission)}
            </h3>
          </div>
        </div>

        {/* PRODUCTS TO PROMOTE (THE NEW MARKETPLACE) */}
        <div className="mb-4 px-1 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Products to Promote</h2>
          {primaryCode && (
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
              Commission: {partnerCommission}%
            </span>
          )}
        </div>
        
        {primaryCode ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
            {products.map((product) => {
              const link = `https://meditonic.glowhomeo.com/ebooks/${product.slug}?ref=${primaryCode}`;
              const estimatedEarnings = (product.price * partnerCommission) / 100;
              const imageSrc = product.cover_image_path?.startsWith('http') 
                ? product.cover_image_path 
                : product.cover_image_path 
                  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${product.cover_image_path}` 
                  : product.image_url;

              return (
                <div key={product.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col hover:shadow-md transition-shadow">
                  <div className="flex p-4 gap-4">
                    <div className="w-20 h-24 shrink-0 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center">
                      {imageSrc ? (
                        <img src={imageSrc} alt={product.title} className="w-full h-full object-cover" />
                      ) : (
                        <ShoppingBag className="w-8 h-8 text-slate-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <h3 className="font-bold text-slate-900 text-sm mb-1 leading-tight line-clamp-2" title={product.title}>
                        {product.title}
                      </h3>
                      <div className="text-slate-500 text-xs mb-2">Retail: {formatPrice(product.price)}</div>
                      <div className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2 py-1 rounded w-fit">
                        Earn {formatPrice(estimatedEarnings)}
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-slate-100 p-3 bg-slate-50 mt-auto">
                    <button 
                      onClick={() => copyToClipboard(product.id, link)}
                      className={`w-full py-2.5 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                        copied === product.id 
                          ? "bg-emerald-600 text-white" 
                          : "bg-white border border-slate-300 text-slate-700 hover:border-emerald-500 hover:text-emerald-700"
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
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-10 text-center">
            <h3 className="font-semibold text-amber-800 mb-1">Tracking ID Pending</h3>
            <p className="text-sm text-amber-700">Your account is active, but your primary tracking code is still being generated. Please contact support if this persists.</p>
          </div>
        )}

        {/* TRANSPARENCY LEDGER */}
        <h2 className="text-lg font-bold text-slate-900 mb-4 px-1 mt-4">Recent Sales</h2>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
          {attributions.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">No sales recorded yet. Start promoting your links!</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {attributions.slice(0, 10).map((attr) => (
                <div key={attr.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{attr.product_type ? attr.product_type.replace('_', ' ') : 'Product Sale'}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{new Date(attr.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-600">+{formatPrice(attr.commission_amount)}</p>
                    <p className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">{attr.status}</p>
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

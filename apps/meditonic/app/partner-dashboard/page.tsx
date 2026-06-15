"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "../../lib/supabase-browser";
import { 
  Copy, Check, LogOut, Loader2, Sparkles, Target, Link as LinkIcon, 
  Wallet, Activity, TrendingUp, Home, Compass, FileText, Calendar, Clock, Eye, ShoppingBag
} from "lucide-react";
import { formatPrice } from "../../lib/utils";
import { findReferralOverride } from "../../lib/referrals/product-mapping";
import Link from "next/link";

type TabType = "overview" | "promote" | "ledger" | "payouts";

export default function PartnerDashboard() {
  const router = useRouter();
  const [partner, setPartner] = useState<any>(null);
  const [codes, setCodes] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [refProducts, setRefProducts] = useState<any[]>([]);
  const [attributions, setAttributions] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState("");
  const [greeting, setGreeting] = useState("Welcome");
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  // UX Copy & Expanded State
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

        // Fetch referral products mapping if code exists
        let refProductsData: any[] = [];
        if (codesData && codesData.length > 0) {
          const { data: rpData } = await supabase
            .from("mt_referral_products")
            .select("*")
            .eq("referral_code_id", codesData[0].id);
          if (rpData) {
            refProductsData = rpData;
          }
        }
        setRefProducts(refProductsData);

        const { data: attrData } = await supabase
          .from("mt_order_attributions")
          .select("*")
          .eq("partner_id", partnerData.id)
          .order("created_at", { ascending: false });

        if (attrData) {
          setAttributions(attrData);
        }

        const { data: productsData } = await supabase
          .from("mt_products")
          .select("id, title, slug, price, cover_image_path, image_url, product_type")
          .eq("clinic_id", "595cd444-e89c-4d1f-b31f-27f76f59e0d7") 
          .eq("is_active", true)
          .order("display_order", { ascending: true });

        if (productsData) {
          setProducts(productsData);
        }

        const { data: consultData } = await supabase
          .from("mt_consultation_fees")
          .select("id, label, type, price")
          .eq("is_active", true)
          .order("price", { ascending: true });

        if (consultData) {
          setConsultations(consultData);
        }

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
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-700 mb-4" />
        <p className="text-slate-500 text-sm font-semibold animate-pulse">Launching Partner Hub...</p>
      </div>
    );
  }

  const name = partner?.mt_partner_applications?.name || "Partner";
  const firstName = name.split(" ")[0];
  
  const primaryCode = codes.length > 0 ? codes[0].code : null;
  const partnerCommission = partner?.base_commission_rate || 10;
  const referralLink = primaryCode ? `https://glowhomeo.com/?ref=${primaryCode}` : "";
  
  const pendingCommission = attributions
    .filter(a => a.status === 'pending')
    .reduce((sum, a) => sum + (a.commission_amount || 0), 0);

  const totalClearedPayouts = payouts
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-800">
      
      {/* Left Sidebar - Desktop (Matching Admin Sidebar layout) */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-slate-900 text-white z-40 border-r border-slate-800">
        {/* Brand Logo & Title */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-700 flex items-center justify-center text-white font-serif font-black shadow-md shadow-emerald-700/20 text-sm shrink-0">
            M
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 block uppercase tracking-widest leading-none">MediTonic</span>
            <span className="font-extrabold text-sm text-white tracking-tight mt-0.5 block">Partner Hub</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          <button
            onClick={() => setActiveTab("overview")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'overview'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Home className="w-5 h-5 shrink-0" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => setActiveTab("promote")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'promote'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Compass className="w-5 h-5 shrink-0" />
            <span>Promote</span>
          </button>

          <button
            onClick={() => setActiveTab("ledger")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'ledger'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FileText className="w-5 h-5 shrink-0" />
            <span>Ledger</span>
          </button>

          <button
            onClick={() => setActiveTab("payouts")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'payouts'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Wallet className="w-5 h-5 shrink-0" />
            <span>Payouts</span>
          </button>
        </nav>

        {/* Profile Card & Logout */}
        <div className="p-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="w-9 h-9 rounded-xl bg-emerald-800 flex items-center justify-center text-white font-black text-sm">
              {name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate leading-tight">{name}</p>
              <p className="text-[10px] text-slate-500 truncate mt-0.5">Partner</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider border border-slate-800 text-slate-400 hover:text-white hover:bg-rose-600/10 hover:border-rose-600/20 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden bg-slate-900 border-b border-slate-800 px-4 py-3.5 flex items-center justify-between sticky top-0 z-40 select-none">
        <div className="flex items-center gap-2.5">
          <div className="w-8.5 h-8.5 rounded-lg bg-emerald-700 flex items-center justify-center text-white font-serif font-black text-xs shadow-md shadow-emerald-700/15">
            M
          </div>
          <div>
            <span className="text-[8px] font-black text-slate-400 block uppercase tracking-widest leading-none">MediTonic</span>
            <span className="font-extrabold text-xs text-white tracking-tight mt-0.5 block">Partner Hub</span>
          </div>
        </div>
        <button 
          onClick={handleLogout} 
          className="w-8.5 h-8.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-all border border-slate-700"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </header>

      {/* Main Content Workspace */}
      <main className="flex-1 md:ml-64 flex flex-col min-h-screen bg-slate-50">
        <div className="max-w-4xl w-full mx-auto px-4 py-6 md:p-8 pb-24 md:pb-8 space-y-6">
          
          {/* Active Tab View: Home/Overview */}
          {activeTab === "overview" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* Profile Card Header */}
              <div className="flex items-center gap-4 bg-white p-5 md:p-6 rounded-3xl border border-slate-200/60 shadow-sm relative overflow-hidden">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-850 font-black text-xl">
                  {name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-1 text-slate-455 text-[10px] font-bold uppercase tracking-wider leading-none">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> {greeting}
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 leading-tight mt-1">Hey, {firstName}!</h2>
                </div>
              </div>

              {/* Unique Code & Referral Link Card */}
              {primaryCode && (
                <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">YOUR TRACKING CODE</span>
                      <span className="font-mono font-black text-2.5xl text-emerald-700 tracking-wider">{primaryCode}</span>
                    </div>
                    <div className="space-y-1 sm:text-right">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">BASE COMMISSION RATE</span>
                      <span className="font-bold text-slate-800 text-xl">{partnerCommission}%</span>
                    </div>
                  </div>

                  {/* Referral Link Copy Area */}
                  {referralLink && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-455 block uppercase tracking-wider">YOUR REFERRAL LINK</span>
                      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1.5 pl-4 pr-1.5">
                        <span className="font-mono text-xs font-semibold text-slate-600 truncate flex-1">{referralLink}</span>
                        <button
                          onClick={() => copyToClipboard("ref-link", referralLink)}
                          className={`h-9 px-4 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all border shrink-0 ${
                            copied === "ref-link"
                              ? "bg-emerald-700 border-emerald-700 text-white"
                              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {copied === "ref-link" ? (
                            <><Check className="w-3.5 h-3.5" /> Copied</>
                          ) : (
                            <><Copy className="w-3.5 h-3.5" /> Copy Link</>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Main metric panels grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                
                {/* Total Lifetime commission payout card */}
                <div className="bg-white border border-slate-200/80 p-6 rounded-3xl shadow-sm flex flex-col justify-between h-36 hover:border-emerald-600/35 transition-colors relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100">
                      <Wallet className="w-4 h-4 text-emerald-700" />
                    </div>
                  </div>
                  <div className="mt-auto">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Earnings</span>
                    <h3 className="text-2.5xl font-black text-slate-900 tracking-tight mt-1">{formatPrice(partner?.total_commission || 0)}</h3>
                    <p className="text-[9px] font-semibold text-emerald-700 flex items-center gap-1.5 mt-1.5">
                      <TrendingUp className="w-3.5 h-3.5" /> Lifetime paid out
                    </p>
                  </div>
                </div>

                {/* Sales count widget */}
                <div className="bg-white border border-slate-200/80 p-6 rounded-3xl shadow-sm flex flex-col justify-between h-36 hover:border-emerald-600/35 transition-colors relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100">
                      <ShoppingBag className="w-4 h-4 text-blue-600" />
                    </div>
                  </div>
                  <div className="mt-auto">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Sales</span>
                    <h3 className="text-2.5xl font-black text-slate-900 tracking-tight mt-1">{partner?.total_orders || 0}</h3>
                    <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wide mt-1.5">Conversions</p>
                  </div>
                </div>

                {/* Pending ledger next cycle widget */}
                <div className="bg-white border border-slate-200/80 p-6 rounded-3xl shadow-sm flex flex-col justify-between h-36 hover:border-emerald-600/35 transition-colors relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4">
                    <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center border border-amber-100">
                      <Activity className="w-4 h-4 text-amber-700" />
                    </div>
                  </div>
                  <div className="mt-auto">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Pending Ledger</span>
                    <h3 className="text-2.5xl font-black text-amber-600 tracking-tight mt-1">{formatPrice(pendingCommission)}</h3>
                    <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wide mt-1.5">Next pay cycle</p>
                  </div>
                </div>
              </div>

              {/* Simple Help Onboarding card */}
              <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-sm relative overflow-hidden">
                <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 mb-2 text-emerald-400">
                  <Target className="w-4 h-4" /> Share & Earn
                </h4>
                <p className="text-sm text-slate-300 leading-relaxed font-medium">
                  Use your unique code <strong className="text-emerald-400">{primaryCode}</strong> to refer clients, or share the direct link. View marketing assets in the <strong className="text-white hover:underline cursor-pointer" onClick={() => setActiveTab("promote")}>Promote</strong> tab.
                </p>
              </div>

            </div>
          )}

          {/* Active Tab View: Promote & Marketing Assets */}
          {activeTab === "promote" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Promote Products</h3>
                <p className="text-xs text-slate-455 mt-0.5">Quickly copy unique landing links and email templates</p>
              </div>

              {primaryCode ? (
                <div className="space-y-8">
                  {/* Products Section */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Programs & Treatment Kits</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {products.map((product) => {
                        const config = findReferralOverride(refProducts, product.id, product.product_type);
                        const isActive = config ? config.is_active : true;
                        if (!isActive) return null;

                        const commType = config?.commission_type || "percentage";
                        const commVal = config ? Number(config.commission_value) : partnerCommission;
                        const discType = config?.discount_type || "percentage";
                        const discVal = config ? Number(config.discount_value) : 10;

                        const isPhysical = product.product_type === 'PHYSICAL_BOOK' || product.product_type === 'TREATMENT_KIT';
                        const link = `https://meditonic.glowhomeo.com/${isPhysical ? 'store' : 'ebooks'}/${product.slug}?ref=${primaryCode}`;
                        
                        const estimatedEarnings = commType === "percentage" 
                          ? (product.price * commVal) / 100 
                          : commVal;

                        const discountText = discType === "percentage" 
                          ? `${discVal}% off` 
                          : `₹${discVal} off`;

                        const imageSrc = product.cover_image_path?.startsWith('http') 
                          ? product.cover_image_path 
                          : product.cover_image_path 
                            ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${product.cover_image_path}` 
                            : product.image_url;

                        const socialText = `Check out Dr. Aman Agrawal's premium homeopathy treatment program: "${product.title}"! Get ${discountText} with my exclusive link: ${link}`;
                        const emailSubject = `Homeopathy Care: ${product.title}`;
                        const emailBody = `Hello,\n\nI highly recommend checking out "${product.title}" by Dr. Aman Agrawal. It is a premium homeopathy program.\n\nYou can use my link to get an exclusive ${discountText}.\n\nLink to program: ${link}\n\nBest regards!`;

                        const isExpanded = expandedProduct === product.id;

                        return (
                          <div key={product.id} className="bg-white rounded-3xl border border-slate-200/60 p-5 shadow-sm flex flex-col gap-4">
                            <div className="w-full h-40 bg-slate-50 rounded-xl overflow-hidden shrink-0 border border-slate-200/60 flex items-center justify-center relative">
                              {imageSrc ? (
                                <img src={imageSrc} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <ShoppingBag className="w-8 h-8 text-slate-300" />
                              )}
                            </div>
                            <div className="flex-1 flex flex-col justify-between min-w-0 space-y-3">
                              <div>
                                <h4 className="font-bold text-sm text-slate-900 truncate pr-1" title={product.title}>
                                  {product.title}
                                </h4>
                                <p className="text-xs font-semibold text-slate-550 mt-1">Price: {formatPrice(product.price)} ({discountText} buyer discount)</p>
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg mt-2.5">
                                  Earn {commType === "percentage" ? `${commVal}%` : formatPrice(commVal)} ({formatPrice(estimatedEarnings)}) commission
                                </span>
                              </div>
                              
                              <div className="flex gap-2 pt-2">
                                <button 
                                  onClick={() => copyToClipboard(product.id, link)}
                                  className={`flex-1 h-9 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all border ${
                                    copied === product.id 
                                      ? "bg-emerald-700 border-emerald-700 text-white" 
                                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                                  }`}
                                >
                                  {copied === product.id ? (
                                    <><Check className="w-3.5 h-3.5" /> Copied</>
                                  ) : (
                                    <><LinkIcon className="w-3.5 h-3.5" /> Copy Link</>
                                  )}
                                </button>
                                
                                <button
                                  onClick={() => setExpandedProduct(isExpanded ? null : product.id)}
                                  className="h-9 px-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 flex items-center justify-center text-[10px] font-bold uppercase tracking-wider transition-all"
                                >
                                  Share Copy {isExpanded ? "▲" : "▼"}
                                </button>
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="border-t border-slate-100 pt-3 mt-1 space-y-3 animate-in slide-in-from-top-1.5 duration-200">
                                <div className="space-y-1">
                                  <div className="flex justify-between items-center">
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Social Post Copy</span>
                                    <button
                                      onClick={() => copyTextSwipe(`social-${product.id}`, socialText)}
                                      className="text-[9px] font-bold text-emerald-755 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100"
                                    >
                                      {copiedTextType === `social-${product.id}` ? "Copied!" : "Copy"}
                                    </button>
                                  </div>
                                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11px] text-slate-600 max-h-16 overflow-y-auto select-text leading-relaxed">
                                    {socialText}
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <div className="flex justify-between items-center">
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Email Campaign Body</span>
                                    <button
                                      onClick={() => copyTextSwipe(`email-${product.id}`, emailBody)}
                                      className="text-[9px] font-bold text-emerald-760 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100"
                                    >
                                      {copiedTextType === `email-${product.id}` ? "Copied!" : "Copy"}
                                    </button>
                                  </div>
                                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11px] text-slate-600 max-h-20 overflow-y-auto select-text leading-relaxed whitespace-pre-line">
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
                  </div>

                  {/* Consultations Section */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Consultations & Booking Fees</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {consultations.map((c) => {
                        const config = findReferralOverride(refProducts, c.id, "consultation");
                        const isActive = config ? config.is_active : true;
                        if (!isActive) return null;

                        const commType = config?.commission_type || "percentage";
                        const commVal = config ? Number(config.commission_value) : partnerCommission;
                        const discType = config?.discount_type || "percentage";
                        const discVal = config ? Number(config.discount_value) : 10;

                        const link = `https://meditonic.glowhomeo.com/book-consultation?ref=${primaryCode}`;
                        
                        const estimatedEarnings = commType === "percentage" 
                          ? (c.price * commVal) / 100 
                          : commVal;

                        const discountText = discType === "percentage" 
                          ? `${discVal}% off` 
                          : `₹${discVal} off`;

                        return (
                          <div key={c.id} className="bg-white rounded-3xl border border-slate-200/60 p-5 shadow-sm flex flex-col justify-between gap-4">
                            <div>
                              <h4 className="font-bold text-sm text-slate-900 truncate pr-1" title={c.label || c.type}>
                                {c.label || c.type}
                              </h4>
                              <p className="text-xs font-semibold text-slate-550 mt-1">Price: {formatPrice(c.price)} ({discountText} buyer discount)</p>
                              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg mt-2.5">
                                Earn {commType === "percentage" ? `${commVal}%` : formatPrice(commVal)} ({formatPrice(estimatedEarnings)}) commission
                              </span>
                            </div>
                            
                            <div className="flex gap-2 pt-2">
                              <button 
                                onClick={() => copyToClipboard(c.id, link)}
                                className={`flex-1 h-9 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all border ${
                                  copied === c.id 
                                    ? "bg-emerald-700 border-emerald-700 text-white" 
                                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                                }`}
                              >
                                {copied === c.id ? (
                                  <><Check className="w-3.5 h-3.5" /> Copied</>
                                ) : (
                                  <><LinkIcon className="w-3.5 h-3.5" /> Copy Link</>
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-3xl p-8 text-center max-w-md mx-auto shadow-sm">
                  <Loader2 className="w-8 h-8 animate-spin text-amber-600 mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-amber-700">Generating Codes</h4>
                  <p className="text-xs text-slate-500 mt-1">Affiliate settings are currently being loaded.</p>
                </div>
              )}
            </div>
          )}

          {/* Active Tab View: Ledger */}
          {activeTab === "ledger" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Activity Ledger</h3>
                <p className="text-xs text-slate-455 mt-0.5">Transparent logs of referred conversions</p>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden select-text">
                {attributions.length === 0 ? (
                  <div className="p-12 text-center flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200/60 flex items-center justify-center mb-4">
                      <Target className="w-5 h-5 text-slate-400" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800">No conversions recorded</h4>
                    <p className="text-xs text-slate-500 mt-2 max-w-[240px] mx-auto leading-relaxed">Conversions register here automatically once orders are completed.</p>
                  </div>
                ) : (
                  <div>
                    {/* Desktop Table Header */}
                    <div className="hidden sm:grid sm:grid-cols-4 sm:gap-4 px-6 py-4 bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-450">
                      <div>Product Type</div>
                      <div>Date</div>
                      <div>Status</div>
                      <div className="text-right">Commission</div>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {attributions.map((attr) => (
                        <div key={attr.id}>
                          {/* Desktop Row */}
                          <div className="hidden sm:grid sm:grid-cols-4 sm:gap-4 sm:items-center px-6 py-4 hover:bg-slate-50/50 transition-colors">
                            <div className="text-xs font-bold text-slate-800 truncate uppercase tracking-wide">
                              {attr.product_type ? attr.product_type.replace('_', ' ') : 'Commission'}
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              {new Date(attr.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                            <div>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-bold border ${
                                attr.status === 'paid' 
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-100' 
                                  : 'bg-amber-50 text-amber-800 border-amber-100'
                              }`}>{attr.status}</span>
                            </div>
                            <div className="text-right text-sm font-bold text-emerald-700">
                              +{formatPrice(attr.commission_amount)}
                            </div>
                          </div>

                          {/* Mobile View Card (Simple list layout) */}
                          <div className="sm:hidden p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className={`w-8.5 h-8.5 rounded-full flex items-center justify-center border shrink-0 ${
                                attr.status === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                              }`}>
                                {attr.status === 'paid' ? <Check className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-800 truncate max-w-[140px] uppercase tracking-wide">
                                  {attr.product_type ? attr.product_type.replace('_', ' ') : 'Commission'}
                                </p>
                                <p className="text-[9px] text-slate-400 mt-0.5 flex items-center gap-1 font-semibold">
                                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                  {new Date(attr.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-emerald-705">+{formatPrice(attr.commission_amount)}</p>
                              <span className={`inline-block text-[9px] uppercase tracking-wider font-bold mt-0.5 ${
                                attr.status === 'paid' ? 'text-emerald-700' : 'text-amber-700'
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
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Monthly Payouts</h3>
                <p className="text-xs text-slate-455 mt-0.5">Logs of cleared payouts and receipt confirmations</p>
              </div>

              {/* Payout Stats Summary Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 select-none">
                <div className="bg-white border border-slate-200/60 p-5 rounded-3xl shadow-sm space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Unpaid balance</span>
                  <span className="font-black text-2xl text-amber-600 block">{formatPrice(pendingCommission)}</span>
                  <span className="text-[9px] font-semibold text-slate-400 block">Clears in next monthly payout</span>
                </div>
                <div className="bg-white border border-slate-200/60 p-5 rounded-3xl shadow-sm space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Total Paid Out</span>
                  <span className="font-black text-2xl text-emerald-700 block">{formatPrice(totalClearedPayouts)}</span>
                  <span className="text-[9px] font-semibold text-emerald-650 block">Historically paid out</span>
                </div>
              </div>

              {/* Payouts list */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden select-text">
                {payouts.length === 0 ? (
                  <div className="p-12 text-center flex flex-col items-center">
                    <div className="w-5 h-5 rounded-full bg-slate-50 border border-slate-200/60 flex items-center justify-center mb-4">
                      <Wallet className="w-5 h-5 text-slate-400" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800">No payouts cleared yet</h4>
                    <p className="text-xs text-slate-500 mt-2 max-w-[240px] mx-auto leading-relaxed">Monthly payout records will display here once they are processed.</p>
                  </div>
                ) : (
                  <div className="p-4 md:p-6 space-y-4">
                    {payouts.map((payout) => (
                      <div key={payout.id} className="p-5 bg-slate-50 hover:bg-slate-100/40 transition-all border border-slate-200/60 rounded-2xl space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="bg-emerald-50 text-emerald-800 text-[9px] font-bold uppercase px-2.5 py-0.5 rounded border border-emerald-100">
                              Cleared
                            </span>
                            <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              {new Date(payout.paid_at || payout.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                          <span className="font-bold text-lg text-slate-800">{formatPrice(payout.amount)}</span>
                        </div>

                        {/* Reference and payment method */}
                        <div className="text-[10px] text-slate-555 font-semibold flex justify-between bg-white p-2.5 rounded-lg border border-slate-200/60 gap-4">
                          <span><strong>Method:</strong> {payout.payment_method === 'upi' ? 'UPI' : 'Bank Transfer'}</span>
                          <span className="truncate max-w-[200px]"><strong>Ref:</strong> {payout.transaction_reference || "N/A"}</span>
                        </div>

                        {/* Admin Remarks */}
                        {payout.admin_remarks && (
                          <div className="text-[10px] text-slate-500 bg-slate-100/50 p-2.5 rounded-lg border border-slate-200/40 italic">
                            &ldquo;{payout.admin_remarks}&rdquo;
                          </div>
                        )}

                        {/* View Screenshot button */}
                        {payout.receipt_url && (
                          <button
                            onClick={() => setSelectedReceipt(payout.receipt_url)}
                            className="w-full h-9 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-all"
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

      {/* Mobile Bottom Navigation Bar (Sleek light-themed toolbar) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 pt-2 pb-4.5 flex justify-around items-center z-45 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <button 
          onClick={() => setActiveTab("overview")}
          className={`flex flex-col items-center gap-1 transition-all duration-200 px-3 py-1 rounded-xl relative ${
            activeTab === 'overview' ? 'text-emerald-700 scale-105' : 'text-slate-450 hover:text-slate-650'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[8px] font-bold uppercase tracking-wider">Home</span>
          {activeTab === 'overview' && <span className="absolute -bottom-1.5 w-1 h-1 bg-emerald-700 rounded-full"></span>}
        </button>
        
        <button 
          onClick={() => setActiveTab("promote")}
          className={`flex flex-col items-center gap-1 transition-all duration-200 px-3 py-1 rounded-xl relative ${
            activeTab === 'promote' ? 'text-emerald-700 scale-105' : 'text-slate-455 hover:text-slate-655'
          }`}
        >
          <Compass className="w-5 h-5" />
          <span className="text-[8px] font-bold uppercase tracking-wider">Promote</span>
          {activeTab === 'promote' && <span className="absolute -bottom-1.5 w-1 h-1 bg-emerald-700 rounded-full"></span>}
        </button>
        
        <button 
          onClick={() => setActiveTab("ledger")}
          className={`flex flex-col items-center gap-1 transition-all duration-200 px-3 py-1 rounded-xl relative ${
            activeTab === 'ledger' ? 'text-emerald-700 scale-105' : 'text-slate-450 hover:text-slate-650'
          }`}
        >
          <FileText className="w-5 h-5" />
          <span className="text-[8px] font-bold uppercase tracking-wider">Ledger</span>
          {activeTab === 'ledger' && <span className="absolute -bottom-1.5 w-1 h-1 bg-emerald-700 rounded-full"></span>}
        </button>

        <button 
          onClick={() => setActiveTab("payouts")}
          className={`flex flex-col items-center gap-1 transition-all duration-200 px-3 py-1 rounded-xl relative ${
            activeTab === 'payouts' ? 'text-emerald-700 scale-105' : 'text-slate-450 hover:text-slate-650'
          }`}
        >
          <Wallet className="w-5 h-5" />
          <span className="text-[8px] font-bold uppercase tracking-wider">Payouts</span>
          {activeTab === 'payouts' && <span className="absolute -bottom-1.5 w-1 h-1 bg-emerald-700 rounded-full"></span>}
        </button>
      </nav>

      {/* Lightbox Receipt Proof Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Payment Proof Receipt</span>
              <button 
                onClick={() => setSelectedReceipt(null)}
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-350 text-slate-500 hover:text-slate-800 flex items-center justify-center font-bold text-sm transition-colors"
              >
                ×
              </button>
            </div>
            <div className="p-6 flex items-center justify-center bg-slate-50">
              <img src={selectedReceipt} alt="Payment Receipt" className="max-w-full max-h-120 object-contain rounded-xl shadow border border-slate-200 select-text" />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

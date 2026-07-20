import React from "react";
import { fetchActiveHomepage } from "../lib/cms";
import { LandingPageRenderer } from "../components/store/LandingPageRenderer";
import { createAdminClient } from "../lib/supabase";
import { BRAND } from "../lib/constants";
import HeroBanner from "../components/sections/HeroBanner";
import { ProductCard, ComboCard } from "../components/store/ProductCard";
import Link from "next/link";
import { ShieldCheck, Truck, ArrowRight, Download, Users, Landmark, Play, Mail } from "lucide-react";
import TestimonialCarousel from "../components/sections/TestimonialCarousel";

// Custom YouTube SVG Icon because older lucide-react package versions lack it
const Youtube = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={props.className}
    width={props.width || "24"}
    height={props.height || "24"}
  >
    <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.517 3.545 12 3.545 12 3.545s-7.517 0-9.388.508a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.871.508 9.388.508 9.388.508s7.517 0 9.388-.508a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

export const dynamic = "force-dynamic";

export default async function Home() {
  const page = await fetchActiveHomepage();

  // If we have a dynamic CMS page built, render it!
  if (page) {
    return <LandingPageRenderer page={page} />;
  }

  // Fallback: If no CMS page is found (e.g. before initial setup), render default premium hardcoded layout
  const supabase = createAdminClient();
  
  const { data: products } = await supabase
    .from("mt_products")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  const catalog = products || [];
  
  // Categorize for homepage sections
  const bestSellers = catalog.filter((p) => p.is_bestseller && !p.is_bundle).slice(0, 4);
  const newReleases = catalog.filter((p) => p.is_new_release && !p.is_bundle).slice(0, 4);
  const bundles = catalog.filter((p) => p.is_bundle).slice(0, 3);

  return (
    <div className="flex flex-col min-h-screen bg-white">
      
      {/* 1. Hero Banner Section */}
      <HeroBanner config={null} />

      {/* 2. Trust Strip Section */}
      <section className="py-6 border-y border-slate-100 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            
            <div className="flex flex-col items-center p-2">
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">Secure Checkout</h4>
              <p className="text-xs text-slate-500 mt-1">100% Secure SSL encrypted checkout payments.</p>
            </div>

            <div className="flex flex-col items-center p-2">
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                <Truck className="w-5 h-5 text-emerald-600" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">Fast Shipping</h4>
              <p className="text-xs text-slate-500 mt-1">Physical books delivered straight to your door.</p>
            </div>

            <div className="flex flex-col items-center p-2">
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                <Download className="w-5 h-5 text-emerald-600" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">Instant eBook Delivery</h4>
              <p className="text-xs text-slate-500 mt-1">Secure download links emailed immediately.</p>
            </div>

            <div className="flex flex-col items-center p-2">
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                <Landmark className="w-5 h-5 text-emerald-600" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">COD Available</h4>
              <p className="text-xs text-slate-500 mt-1">Cash on Delivery option for physical books.</p>
            </div>

          </div>
        </div>
      </section>

      {/* 3. Shop by Category / Format Grid */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
              Shop by Category
            </h2>
            <p className="mt-3 text-lg text-slate-500">
              Choose your preferred format and level up your medical training.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Physical Books Card */}
            <div className="group relative rounded-3xl overflow-hidden border border-slate-100 bg-slate-50/50 p-8 flex flex-col justify-between hover:shadow-lg transition-all duration-300 min-h-[250px]">
              <div>
                <span className="text-3xl">📘</span>
                <h3 className="font-display text-xl font-bold text-slate-800 mt-4">Physical Books</h3>
                <p className="text-slate-500 text-sm mt-2">
                  Premium hardcopy paperbacks & reference manuals with high-quality printing.
                </p>
              </div>
              <Link 
                href="/store" 
                className="mt-6 font-bold text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1 group-hover:gap-2 transition-all"
              >
                Browse Collection <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* eBooks Card */}
            <div className="group relative rounded-3xl overflow-hidden border border-slate-100 bg-slate-50/50 p-8 flex flex-col justify-between hover:shadow-lg transition-all duration-300 min-h-[250px]">
              <div>
                <span className="text-3xl">📱</span>
                <h3 className="font-display text-xl font-bold text-slate-800 mt-4">eBooks (PDF)</h3>
                <p className="text-slate-500 text-sm mt-2">
                  Instant digital downloads. Optimized for tablets, laptops, and mobile reading.
                </p>
              </div>
              <Link 
                href="/ebooks" 
                className="mt-6 font-bold text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1 group-hover:gap-2 transition-all"
              >
                Browse Collection <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Bundle Deals Card */}
            <div className="group relative rounded-3xl overflow-hidden border border-slate-100 bg-emerald-50/20 p-8 flex flex-col justify-between hover:shadow-lg transition-all duration-300 min-h-[250px]">
              <div>
                <span className="text-3xl">🎁</span>
                <h3 className="font-display text-xl font-bold text-emerald-950 mt-4">Bundles & Combo Offers</h3>
                <p className="text-emerald-800/70 text-sm mt-2">
                  Exclusive bundle offers. Get all books in a collection together at massive discounts.
                </p>
              </div>
              <Link 
                href="/store?category=bundles" 
                className="mt-6 font-bold text-sm text-emerald-700 hover:text-emerald-800 flex items-center gap-1 group-hover:gap-2 transition-all"
              >
                View All Offers <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* 4. Best Sellers Section */}
      {bestSellers.length > 0 && (
        <section className="py-16 sm:py-24 bg-slate-50/30 border-y border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-12">
              <div>
                <h2 className="font-display text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
                  Best Sellers
                </h2>
                <p className="mt-2 text-base text-slate-500">
                  Authoritative reference guides most loved by clinicians.
                </p>
              </div>
              <Link 
                href="/store" 
                className="hidden sm:flex items-center gap-1 text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                Shop Best Sellers <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {bestSellers.map((book) => (
                <ProductCard key={book.id} product={book} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 5. Combo Deals Section */}
      {bundles.length > 0 && (
        <section className="py-16 sm:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="font-display text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
                Combo Packs & Bundles
              </h2>
              <p className="mt-3 text-lg text-slate-500">
                Maximize savings. Access complete reference bundles instantly.
              </p>
            </div>

            <div className="flex flex-col gap-6 max-w-4xl mx-auto">
              {bundles.map((bundle) => (
                <ComboCard key={bundle.id} product={bundle} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 6. Customer Reviews Section */}
      <section className="py-16 sm:py-24 bg-slate-50/50 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
              What Medical Students & Clinicians Say
            </h2>
            <p className="mt-3 text-lg text-slate-500">
              Trusted by 5,000+ practitioners, interns, and students worldwide.
            </p>
          </div>
          
          <TestimonialCarousel />
        </div>
      </section>

      {/* 7. YouTube Community Section */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-red-600 to-rose-700 rounded-[2.5rem] p-8 sm:p-12 lg:p-16 text-white relative overflow-hidden shadow-xl border border-red-500/20">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mt-48 blur-3xl pointer-events-none"></div>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
              
              <div className="lg:col-span-8 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 bg-white/10 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-white/15">
                  <Youtube className="w-4.5 h-4.5 text-white fill-current" />
                  YouTube Community
                </div>
                <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black leading-tight tracking-tight">
                  Join 1.4 Million+ Healthcare Learners
                </h2>
                <p className="text-white/80 text-base sm:text-lg mt-4 max-w-2xl leading-relaxed">
                  Subscribe to Dr. Aman Agrawal's channel for daily lessons on clinical practice guidelines, common drug uses, injection procedures, and laboratory report readings.
                </p>
              </div>

              <div className="lg:col-span-4 flex items-center justify-center">
                <a 
                  href={BRAND.social.youtube_meditonic}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 bg-white text-red-700 hover:bg-slate-50 font-bold px-8 py-4.5 rounded-2xl shadow-lg transition-transform hover:scale-[1.02] active:scale-95 text-base"
                >
                  <Play className="w-5 h-5 fill-current" />
                  Watch on YouTube
                </a>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* 8. Newsletter Section */}
      <section className="py-16 sm:py-24 bg-slate-50 border-t border-slate-100">
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <Mail className="w-6 h-6 text-emerald-600" />
          </div>
          <h2 className="font-display text-2xl font-bold text-slate-800">Stay Updated</h2>
          <p className="text-sm text-slate-500 mt-2">
            Get the latest medical articles, study notes, and exclusive discounts on new books delivered straight to your inbox.
          </p>
          
          <form onSubmit={(e) => e.preventDefault()} className="mt-6 flex gap-2">
            <input 
              type="email" 
              placeholder="Enter your email" 
              required
              className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500"
            />
            <button 
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-2xl text-sm shadow-sm transition-all"
            >
              Subscribe
            </button>
          </form>
        </div>
      </section>

    </div>
  );
}

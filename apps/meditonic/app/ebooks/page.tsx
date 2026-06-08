import React from "react";
import { createPublicClient } from "@/lib/supabase";
import { BRAND } from "@/lib/constants";
import { ProductCard } from "@/components/store/ProductCard";
import { BundleUpsellStrip } from "@/components/store/BundleUpsellStrip";
import { BookOpen, Sparkles, Search } from "lucide-react";

export const revalidate = 60; // Revalidate every minute

export default async function StorefrontPage() {
  const supabase = createPublicClient();
  
  // We query mt_products now. 
  // Fallback to mt_ebooks if mt_products doesn't exist yet, to prevent breaking if user hasn't run SQL
  let data: any[] | null = null;
  let error = null;
  
  const productsReq = await supabase
    .from("mt_products")
    .select("*")
    .eq("clinic_id", BRAND.clinicId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
    
  if (productsReq.error && productsReq.error.code === '42P01') { // table not found
    console.log("mt_products not found, falling back to mt_ebooks");
    const fallbackReq = await supabase
      .from("mt_ebooks")
      .select("*")
      .eq("clinic_id", BRAND.clinicId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    data = fallbackReq.data;
  } else {
    data = productsReq.data;
  }

  const catalog = data || [];
  const combos = catalog.filter(e => e.is_combo);
  
  // Try to find the Triple Bundle
  const tripleBundle = combos.find(c => c.slug === 'triple-bundle') || combos[0];
  const otherCombos = combos.filter(c => c.id !== tripleBundle?.id);
  
  const individual = catalog.filter(e => !e.is_combo);
  const hardCopies = catalog.filter(e => e.type === 'hardcopy');
  
  const diagnosticBooks = individual.filter(e => e.category === 'diagnostic');
  const medicineBooks = individual.filter(e => e.category === 'medicine');
  const gynePediaBooks = individual.filter(e => e.category === 'gyne_pedia');

  const diagnosticBundle = combos.find(c => c.slug.includes('diagnostic'));
  const medicineBundle = combos.find(c => c.slug.includes('medicine'));
  const gyneBundle = combos.find(c => c.slug.includes('gyne'));

  return (
    <div className="flex flex-col min-h-screen bg-white pb-32 pt-[52px]">
      {/* Store Hero */}
      <section className="bg-[#1B6B5C] px-4 py-12 text-center text-white relative">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent"></div>
        <div className="relative z-10 max-w-xl mx-auto">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white mb-4">
            <Sparkles className="h-3 w-3" /> LEARN FROM DR. AMAN
          </div>
          <h1 className="font-display text-4xl mb-3">Premium Medical eBooks</h1>
          <p className="text-sm text-white/65 mb-8 max-w-md mx-auto">
            Clinical guides for students, practitioners, and curious minds. Instant PDF access or Pan-India delivery.
          </p>
          
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
            <input 
              type="text" 
              placeholder="Search books, topics..." 
              className="w-full bg-white/10 border border-white/20 rounded-full py-3 pl-12 pr-4 text-sm text-white placeholder:text-white/50 focus:outline-none focus:bg-white/20 transition-all"
            />
          </div>
        </div>
      </section>

      {/* Filter Bar */}
      <div className="sticky top-[52px] z-30 bg-white border-b border-mt-border py-3 px-4 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 max-w-6xl mx-auto">
          {['All Books', 'Bundles', 'Diagnostic', 'Medicine', 'Gyne & Pedia', 'Hard Copy'].map(filter => (
            <button 
              key={filter}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all border
                ${filter === 'All Books' 
                  ? 'bg-[#1B6B5C] text-white border-[#1B6B5C]' 
                  : 'bg-white text-mt-text-secondary border-mt-border hover:border-[#1B6B5C] hover:text-[#1B6B5C]'}`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 w-full pt-8">
        
        {/* Bundles Section */}
        <section className="mb-10">
          {tripleBundle && <ProductCard product={tripleBundle} />}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {otherCombos.map(combo => <ProductCard key={combo.id} product={combo} />)}
            {hardCopies.map(hc => <ProductCard key={hc.id} product={hc} />)}
          </div>
        </section>

        {/* Trust Strip */}
        <section className="bg-white border border-mt-border rounded-xl p-4 mb-12 shadow-sm">
          <h4 className="text-[11px] font-bold text-mt-text-secondary uppercase tracking-wider mb-4 text-center">Why students trust MediTonic books</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center text-blue-600"><Sparkles className="w-4 h-4"/></div>
              <p className="text-[10px] text-mt-text font-medium leading-tight">Instant PDF delivered to your email</p>
            </div>
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-8 h-8 bg-green-50 rounded-full flex items-center justify-center text-green-600"><Sparkles className="w-4 h-4"/></div>
              <p className="text-[10px] text-mt-text font-medium leading-tight">Secure payment · Razorpay / UPI</p>
            </div>
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-8 h-8 bg-purple-50 rounded-full flex items-center justify-center text-purple-600"><Sparkles className="w-4 h-4"/></div>
              <p className="text-[10px] text-mt-text font-medium leading-tight">Lifetime access — download anytime</p>
            </div>
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-8 h-8 bg-orange-50 rounded-full flex items-center justify-center text-orange-600"><Sparkles className="w-4 h-4"/></div>
              <p className="text-[10px] text-mt-text font-medium leading-tight">Hard copies delivered Pan-India · 5–7 days</p>
            </div>
          </div>
        </section>

        {/* Diagnostic Series */}
        {diagnosticBooks.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl text-mt-text">Diagnostic Series</h2>
              <span className="bg-[#E1F5EE] text-[#085041] px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
                {diagnosticBooks.length} books · ₹150 each
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {diagnosticBooks.map(book => <ProductCard key={book.id} product={book} />)}
            </div>
            {diagnosticBundle && (
              <BundleUpsellStrip seriesCategory="diagnostic" seriesBooks={diagnosticBooks} bundleProduct={diagnosticBundle} />
            )}
          </section>
        )}

        {/* Medicine Series */}
        {medicineBooks.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl text-mt-text">Medicine Series</h2>
              <span className="bg-[#e6f1fb] text-[#0C447C] px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
                {medicineBooks.length} books · ₹150 each
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {medicineBooks.map(book => <ProductCard key={book.id} product={book} />)}
            </div>
            {medicineBundle && (
              <BundleUpsellStrip seriesCategory="medicine" seriesBooks={medicineBooks} bundleProduct={medicineBundle} />
            )}
          </section>
        )}

        {/* Gyne Series */}
        {gynePediaBooks.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl text-mt-text">Gyne & Pedia Series</h2>
              <span className="bg-[#faeeda] text-[#633806] px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
                {gynePediaBooks.length} books · ₹150 each
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {gynePediaBooks.map(book => <ProductCard key={book.id} product={book} />)}
            </div>
            {gyneBundle && (
              <BundleUpsellStrip seriesCategory="gyne_pedia" seriesBooks={gynePediaBooks} bundleProduct={gyneBundle} />
            )}
          </section>
        )}

        {/* Delivery Info Note */}
        <section className="bg-[#E1F5EE] border border-[#1B6B5C]/20 rounded-xl p-6 text-[#085041] flex flex-col md:flex-row gap-4 items-start md:items-center">
          <BookOpen className="w-10 h-10 shrink-0" />
          <div>
            <h3 className="font-bold text-sm mb-1">How you receive your book</h3>
            <p className="text-xs opacity-90">
              <strong>Digital (PDF):</strong> You will receive an instant download link to your email within 60 seconds of successful payment.
            </p>
            <p className="text-xs opacity-90 mt-1">
              <strong>Physical (Hard Copy):</strong> Books are printed on demand. Expect delivery Pan-India within 5-7 business days via our courier partners.
            </p>
          </div>
        </section>

      </div>
    </div>
  );
}

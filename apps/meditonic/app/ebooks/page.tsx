import React from "react";
import { createPublicClient } from "../../lib/supabase";
import { BRAND } from "../../lib/constants";
import { ProductCard, ComboCard } from "../../components/store/ProductCard";
import { Users, PlaySquare, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StorefrontPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const resolvedParams = await searchParams;
  const activeCategory = resolvedParams.category;

  const supabase = createPublicClient();
  
  let query = supabase
    .from("mt_products")
    .select("*")
    .eq("clinic_id", BRAND.clinicId)
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (activeCategory) {
    query = query.eq("category", activeCategory);
  }

  const { data, error } = await query;
    
  if (error) {
    console.error("Failed to fetch products:", error);
  }

  const catalog = data || [];
  
  // Extract all available categories for the sidebar/filter menu
  // Using a separate query or just extracting from all products if we don't filter in DB.
  // Actually, let's fetch all categories so the menu is always full.
  const { data: allProducts } = await supabase
    .from("mt_products")
    .select("category")
    .eq("clinic_id", BRAND.clinicId)
    .eq("is_active", true);
    
  const categories = Array.from(new Set((allProducts || []).map(p => p.category).filter(Boolean)));

  // Categorization via proper flags
  const bundles = catalog.filter(e => e.is_bundle);
  const bestSellers = catalog.filter(e => e.is_bestseller && !e.is_bundle);
  const newReleases = catalog.filter(e => e.is_new_release && !e.is_bundle);
  const featured = catalog.filter(e => e.is_featured && !e.is_bundle && !e.is_bestseller && !e.is_new_release);
  const others = catalog.filter(e => !e.is_bundle && !e.is_bestseller && !e.is_new_release && !e.is_featured);

  return (
    <div className="flex flex-col min-h-screen bg-[#FDFDFD] pb-32 pt-[52px]">
      
      {/* Minimalist Trust Strip */}
      <div className="bg-white border-b border-mt-border py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12 text-sm">
          <div className="flex items-center gap-2 font-semibold text-mt-text">
            <ShieldCheck className="w-5 h-5 text-mt-primary" />
            <span>Dr. Aman Agrawal</span>
          </div>
          <div className="hidden md:block w-px h-4 bg-mt-border"></div>
          <div className="flex items-center gap-2 font-medium text-mt-text-secondary">
            <Users className="w-5 h-5 text-blue-600" />
            <span>5,000+ Patients Treated</span>
          </div>
          <div className="hidden md:block w-px h-4 bg-mt-border"></div>
          <div className="flex items-center gap-2 font-medium text-mt-text-secondary">
            <PlaySquare className="w-5 h-5 text-[#FF0000]" fill="#FF0000" strokeWidth={1} />
            <span>1.4M+ Healthcare YouTube Community</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-10 md:pt-12">
        
        <div className="flex flex-col lg:flex-row gap-10">
          
          {/* Sidebar / Categories */}
          {categories.length > 0 && (
            <div className="w-full lg:w-64 shrink-0">
              <div className="sticky top-24 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <h3 className="font-display text-lg font-bold text-slate-800 mb-4">Collections</h3>
                <ul className="space-y-2">
                  <li>
                    <a href="/ebooks" className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${!activeCategory ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                      All Resources
                    </a>
                  </li>
                  {categories.map(cat => (
                    <li key={cat}>
                      <a href={`/ebooks?category=${encodeURIComponent(cat)}`} className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeCategory === cat ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                        {cat}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Main Feed */}
          <div className="flex-1 min-w-0">
            {catalog.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-xl border border-slate-100">
                <p className="text-slate-500 font-medium">No resources found for this collection.</p>
              </div>
            ) : (
              <>
                {/* Bundles */}
                {bundles.length > 0 && (
                  <section className="mb-16">
                    <h2 className="font-display text-2xl md:text-3xl text-mt-text font-bold mb-6 flex items-center gap-2">
                      💎 Premium Bundles
                    </h2>
                    <div className="flex flex-col gap-6">
                      {bundles.map(bundle => <ComboCard key={bundle.id} product={bundle} />)}
                    </div>
                  </section>
                )}

                {/* Best Sellers */}
                {bestSellers.length > 0 && (
                  <section className="mb-16">
                    <h2 className="font-display text-2xl text-mt-text font-bold mb-6 flex items-center gap-2">
                      🔥 Best Sellers
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                      {bestSellers.map(book => <ProductCard key={book.id} product={book} />)}
                    </div>
                  </section>
                )}

                {/* New Releases */}
                {newReleases.length > 0 && (
                  <section className="mb-16">
                    <h2 className="font-display text-2xl text-mt-text font-bold mb-6 flex items-center gap-2">
                      ✨ New Releases
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                      {newReleases.map(book => <ProductCard key={book.id} product={book} />)}
                    </div>
                  </section>
                )}

                {/* Featured */}
                {featured.length > 0 && (
                  <section className="mb-16">
                    <h2 className="font-display text-2xl text-mt-text font-bold mb-6 flex items-center gap-2">
                      ⭐ Featured Books
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                      {featured.map(book => <ProductCard key={book.id} product={book} />)}
                    </div>
                  </section>
                )}

                {/* All Others (If active category is set, or just the rest) */}
                {others.length > 0 && (
                  <section className="mb-16">
                    <h2 className="font-display text-2xl text-mt-text font-bold mb-6 flex items-center gap-2">
                      {activeCategory ? `${activeCategory} Collection` : 'More Resources'}
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                      {others.map(book => <ProductCard key={book.id} product={book} />)}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

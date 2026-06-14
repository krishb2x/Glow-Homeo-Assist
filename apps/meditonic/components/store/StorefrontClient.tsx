"use client";

import React, { useState } from "react";
import { ProductCard, ComboCard } from "./ProductCard";
import { Search, X, Layers, Flame, Sparkles, BookOpen } from "lucide-react";

interface StorefrontClientProps {
  initialCatalog: any[];
  categories: string[];
}

// Helper to format category names for display
export const formatCategoryName = (cat: string) => {
  if (!cat) return "";
  if (cat.toLowerCase() === "gyne_pedia") return "Gyne & Pedia";
  return cat
    .replace(/[_\-]/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export default function StorefrontClient({ initialCatalog, categories }: StorefrontClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("");

  // Real-time filtering
  const filteredCatalog = initialCatalog.filter((item) => {
    const matchesCategory = !activeCategory || item.category === activeCategory;
    const matchesSearch =
      !searchQuery ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.summary && item.summary.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Categorization via flags
  const bundles = filteredCatalog.filter((e) => e.is_bundle);
  const bestSellers = filteredCatalog.filter((e) => e.is_bestseller && !e.is_bundle);
  const newReleases = filteredCatalog.filter((e) => e.is_new_release && !e.is_bundle);
  const featured = filteredCatalog.filter((e) => e.is_featured && !e.is_bundle && !e.is_bestseller && !e.is_new_release);
  const others = filteredCatalog.filter((e) => !e.is_bundle && !e.is_bestseller && !e.is_new_release && !e.is_featured);

  return (
    <div className="flex flex-col lg:flex-row gap-8 lg:gap-10">
      
      {/* 1. Desktop Sidebar - sticky left column */}
      {categories.length > 0 && (
        <div className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-24 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="font-display text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4 text-mt-primary" />
              Collections
            </h3>
            <ul className="space-y-1.5">
              <li>
                <button
                  onClick={() => setActiveCategory("")}
                  className={`w-full text-left px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                    !activeCategory
                      ? "bg-mt-primary-bg text-mt-primary font-semibold"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  All Resources
                </button>
              </li>
              {categories.map((cat) => (
                <li key={cat}>
                  <button
                    onClick={() => setActiveCategory(cat)}
                    className={`w-full text-left px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                      activeCategory === cat
                        ? "bg-mt-primary-bg text-mt-primary font-semibold"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {formatCategoryName(cat)}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* 2. Main Feed & Mobile Controls */}
      <div className="flex-1 min-w-0">
        
        {/* Search Bar - styled to feel extremely premium */}
        <div className="relative mb-3.5 md:mb-5">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search eBooks, bundles, or concerns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-10 py-3 bg-white border border-slate-200/80 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-mt-primary/10 focus:border-mt-primary transition-all shadow-sm placeholder-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Mobile Horizontal Category Tabs */}
        {categories.length > 0 && (
          <div 
            className="flex lg:hidden overflow-x-auto gap-2 pb-2.5 mb-3 -mx-4 px-4 scrollbar-none"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            <button
              onClick={() => setActiveCategory("")}
              className={`px-3.5 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all shadow-sm ${
                !activeCategory
                  ? "bg-mt-primary text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all shadow-sm ${
                  activeCategory === cat
                    ? "bg-mt-primary text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {formatCategoryName(cat)}
              </button>
            ))}
          </div>
        )}

        {/* Product Sections */}
        {filteredCatalog.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-100 p-8 shadow-sm">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium mb-1">No resources matches your filter.</p>
            <p className="text-slate-400 text-xs">Try adjusting your search query or choosing another collection.</p>
          </div>
        ) : (
          <>
            {/* Bundles */}
            {bundles.length > 0 && (
              <section className="mb-12 md:mb-16">
                <h2 className="font-display text-xl md:text-2xl text-mt-text font-bold mb-5 flex items-center gap-2">
                  <span className="text-lg">💎</span> Premium Bundles
                </h2>
                <div className="flex flex-col gap-5">
                  {bundles.map((bundle) => (
                    <ComboCard key={bundle.id} product={bundle} />
                  ))}
                </div>
              </section>
            )}

            {/* Best Sellers */}
            {bestSellers.length > 0 && (
              <section className="mb-12 md:mb-16">
                <h2 className="font-display text-xl md:text-2xl text-mt-text font-bold mb-5 flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-500" fill="currentColor" />
                  Best Sellers
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5">
                  {bestSellers.map((book) => (
                    <ProductCard key={book.id} product={book} />
                  ))}
                </div>
              </section>
            )}

            {/* New Releases */}
            {newReleases.length > 0 && (
              <section className="mb-12 md:mb-16">
                <h2 className="font-display text-xl md:text-2xl text-mt-text font-bold mb-5 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-500" fill="currentColor" />
                  New Releases
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5">
                  {newReleases.map((book) => (
                    <ProductCard key={book.id} product={book} />
                  ))}
                </div>
              </section>
            )}

            {/* Featured */}
            {featured.length > 0 && (
              <section className="mb-12 md:mb-16">
                <h2 className="font-display text-xl md:text-2xl text-mt-text font-bold mb-5 flex items-center gap-2">
                  <span className="text-lg">⭐</span> Featured Books
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5">
                  {featured.map((book) => (
                    <ProductCard key={book.id} product={book} />
                  ))}
                </div>
              </section>
            )}

            {/* All Others */}
            {others.length > 0 && (
              <section className="mb-12 md:mb-16">
                <h2 className="font-display text-xl md:text-2xl text-mt-text font-bold mb-5">
                  {activeCategory ? `${activeCategory} Collection` : "More Resources"}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5">
                  {others.map((book) => (
                    <ProductCard key={book.id} product={book} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

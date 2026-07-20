"use client";

import React, { useState, useMemo } from "react";
import { ProductCard, ComboCard } from "./ProductCard";
import { Search, X, SlidersHorizontal, BookOpen, Check } from "lucide-react";
import { BOOK_COLLECTIONS } from "../../lib/constants";
import { formatPrice } from "../../lib/utils";

interface StorefrontClientProps {
  initialCatalog: any[];
  categories: string[];
}

// Helper to format category names for display
export const formatCategoryName = (cat: string) => {
  if (!cat) return "";
  const matched = BOOK_COLLECTIONS.find(c => c.id === cat.toLowerCase());
  if (matched) return matched.label;
  
  if (cat.toLowerCase() === "gyne_pedia") return "Gyne & Pedia";
  return cat
    .replace(/[_\-]/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export default function StorefrontClient({ initialCatalog, categories }: StorefrontClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("relevance");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Toggle helpers
  const handleCategoryToggle = (catId: string) => {
    setSelectedCategories(prev => 
      prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]
    );
  };

  const handleFormatToggle = (formatId: string) => {
    setSelectedFormats(prev => 
      prev.includes(formatId) ? prev.filter(f => f !== formatId) : [...prev, formatId]
    );
  };

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setSelectedFormats([]);
    setPriceRange("all");
    setSortBy("relevance");
    setSearchQuery("");
  };

  // Memoized filtered and sorted catalog
  const processedCatalog = useMemo(() => {
    let result = [...initialCatalog];

    // 1. Filter by Search Query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(item => 
        item.title.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q))
      );
    }

    // 2. Filter by Category
    if (selectedCategories.length > 0) {
      result = result.filter(item => {
        const itemCat = item.category?.toLowerCase() || "";
        return selectedCategories.some(c => c.toLowerCase() === itemCat);
      });
    }

    // 3. Filter by Format (Digital Specific formats)
    if (selectedFormats.length > 0) {
      result = result.filter(item => {
        const format = (item.metadata?.format || item.product_type || item.type || "").toLowerCase();
        const isCombo = format.includes('combo') || format.includes('bundle') || item.is_bundle;
        const isEpub = format.includes('epub');
        const isKindle = format.includes('kindle');
        const isPdf = !isCombo && !isEpub && !isKindle;

        return (
          (selectedFormats.includes('combo') && isCombo) ||
          (selectedFormats.includes('pdf') && isPdf) ||
          (selectedFormats.includes('epub') && isEpub) ||
          (selectedFormats.includes('kindle') && isKindle)
        );
      });
    }

    // 4. Filter by Price Range
    if (priceRange !== "all") {
      result = result.filter(item => {
        const price = item.price;
        if (priceRange === "under_500") return price < 500;
        if (priceRange === "500_1000") return price >= 500 && price <= 1000;
        if (priceRange === "1000_2000") return price >= 1000 && price <= 2000;
        if (priceRange === "over_2000") return price > 2000;
        return true;
      });
    }

    // 5. Sort Catalog
    if (sortBy === "price_asc") {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price_desc") {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === "rating") {
      result.sort((a, b) => (b.metadata?.rating || 5.0) - (a.metadata?.rating || 5.0));
    }

    return result;
  }, [initialCatalog, searchQuery, selectedCategories, selectedFormats, priceRange, sortBy]);

  // Active filter count
  const activeFiltersCount = (selectedCategories.length > 0 ? 1 : 0) + 
                             (selectedFormats.length > 0 ? 1 : 0) + 
                             (priceRange !== "all" ? 1 : 0) + 
                             (searchQuery ? 1 : 0);

  // Shared Sidebar/Drawer Content
  const renderFilterContent = () => (
    <div className="space-y-7">
      
      {/* Category Selection */}
      <div>
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-3.5 flex items-center justify-between">
          <span>Categories</span>
          {selectedCategories.length > 0 && (
            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              {selectedCategories.length} selected
            </span>
          )}
        </h4>
        <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1 scrollbar-none">
          {categories.map((cat) => {
            const isChecked = selectedCategories.includes(cat);
            return (
              <label 
                key={cat} 
                className="flex items-center gap-3 text-sm text-slate-600 hover:text-slate-900 cursor-pointer select-none py-0.5"
              >
                <div 
                  className={`w-4.5 h-4.5 border rounded flex items-center justify-center transition-all ${
                    isChecked 
                      ? "bg-emerald-600 border-emerald-600 text-white" 
                      : "border-slate-300 bg-white hover:border-slate-400"
                  }`}
                >
                  {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
                <input 
                  type="checkbox" 
                  checked={isChecked} 
                  onChange={() => handleCategoryToggle(cat)}
                  className="sr-only" 
                />
                <span className="font-medium text-slate-700 truncate">{formatCategoryName(cat)}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Book Formats Selection */}
      <div>
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-3.5">
          eBook Formats
        </h4>
        <div className="space-y-2.5">
          {[
            { id: 'pdf', label: '📱 PDF eBook' },
            { id: 'epub', label: '📱 EPUB' },
            { id: 'kindle', label: '📖 Kindle' },
            { id: 'combo', label: '🎁 eBook Combo' }
          ].map((fmt) => {
            const isChecked = selectedFormats.includes(fmt.id);
            return (
              <label 
                key={fmt.id} 
                className="flex items-center gap-3 text-sm text-slate-600 hover:text-slate-900 cursor-pointer select-none py-0.5"
              >
                <div 
                  className={`w-4.5 h-4.5 border rounded flex items-center justify-center transition-all ${
                    isChecked 
                      ? "bg-emerald-600 border-emerald-600 text-white" 
                      : "border-slate-300 bg-white hover:border-slate-400"
                  }`}
                >
                  {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
                <input 
                  type="checkbox" 
                  checked={isChecked} 
                  onChange={() => handleFormatToggle(fmt.id)}
                  className="sr-only" 
                />
                <span className="font-medium text-slate-700">{fmt.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Price Ranges */}
      <div>
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-3.5">
          Price Range
        </h4>
        <div className="space-y-2">
          {[
            { id: 'all', label: 'Any Price' },
            { id: 'under_500', label: 'Under ' + formatPrice(500) },
            { id: '500_1000', label: formatPrice(500) + ' - ' + formatPrice(1000) },
            { id: '1000_2000', label: formatPrice(1000) + ' - ' + formatPrice(2000) },
            { id: 'over_2000', label: 'Over ' + formatPrice(2000) }
          ].map((range) => (
            <label 
              key={range.id} 
              className="flex items-center gap-3 text-sm text-slate-600 hover:text-slate-900 cursor-pointer select-none py-1"
            >
              <input 
                type="radio" 
                name="priceRange"
                checked={priceRange === range.id} 
                onChange={() => setPriceRange(range.id)}
                className="w-4 h-4 text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer"
              />
              <span className={`font-medium ${priceRange === range.id ? "text-emerald-700 font-semibold" : "text-slate-700"}`}>
                {range.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Sorting */}
      <div>
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-3.5">
          Sort By
        </h4>
        <div className="space-y-2">
          {[
            { id: 'relevance', label: 'Popularity' },
            { id: 'price_asc', label: 'Price: Low to High' },
            { id: 'price_desc', label: 'Price: High to Low' },
            { id: 'rating', label: 'Avg. Customer Review' }
          ].map((sortOption) => (
            <label 
              key={sortOption.id} 
              className="flex items-center gap-3 text-sm text-slate-600 hover:text-slate-900 cursor-pointer select-none py-1"
            >
              <input 
                type="radio" 
                name="sortBy"
                checked={sortBy === sortOption.id} 
                onChange={() => setSortBy(sortOption.id)}
                className="w-4 h-4 text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer"
              />
              <span className={`font-medium ${sortBy === sortOption.id ? "text-emerald-700 font-semibold" : "text-slate-700"}`}>
                {sortOption.label}
              </span>
            </label>
          ))}
        </div>
      </div>
      
    </div>
  );

  return (
    <div className="w-full flex flex-col gap-6">
      
      {/* Top Search Bar & Mobile Filter Trigger */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between w-full max-w-7xl mx-auto pb-4 border-b border-slate-100">
        
        {/* Search */}
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search digital eBooks, study guides..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-10 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all placeholder-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Results Counter & Actions */}
        <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-500 tracking-wide uppercase">
            Showing {processedCatalog.length} results
          </span>

          {/* Mobile Filter Button */}
          <button
            onClick={() => setMobileFiltersOpen(true)}
            className="lg:hidden flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-2xl text-xs font-bold text-slate-700 shadow-sm transition-all"
          >
            <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
            <span>Filters & Sort</span>
            {activeFiltersCount > 0 && (
              <span className="w-5 h-5 bg-emerald-600 text-white rounded-full flex items-center justify-center text-[10px] font-black">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="flex flex-col lg:flex-row gap-8 items-start w-full">
        
        {/* Desktop Sidebar (Left side, sticky) */}
        <aside className="hidden lg:block w-64 shrink-0 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm sticky top-24 self-start">
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
            <h3 className="font-display font-bold text-base text-slate-800">Filters</h3>
            {activeFiltersCount > 0 && (
              <button 
                onClick={clearAllFilters}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                Clear All
              </button>
            )}
          </div>
          {renderFilterContent()}
        </aside>

        {/* Catalog Grid */}
        <div className="flex-1 w-full">
          {processedCatalog.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 p-8 shadow-sm max-w-xl mx-auto mt-8">
              <BookOpen className="w-14 h-14 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 font-bold text-lg mb-1.5">No books matched your criteria</p>
              <p className="text-slate-400 text-xs sm:text-sm">Try resetting your filters or adjusting your search term to find what you need.</p>
              <button 
                onClick={clearAllFilters}
                className="mt-6 px-6 py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs rounded-2xl transition-all"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="space-y-12">
              {/* Premium Combos & Bundles (only show if any combo exists in the filtered results) */}
              {processedCatalog.some(e => e.is_bundle) && (
                <section className="bg-emerald-50/20 border border-emerald-100/40 rounded-3xl p-5 sm:p-7">
                  <h2 className="font-display text-lg sm:text-xl text-emerald-900 font-extrabold mb-5 flex items-center gap-2">
                    <span>💎</span> Premium Combos & Bundles
                  </h2>
                  <div className="flex flex-col gap-6">
                    {processedCatalog.filter(e => e.is_bundle).map((combo) => (
                      <ComboCard key={combo.id} product={combo} />
                    ))}
                  </div>
                </section>
              )}

              {/* Standard Individual Books Grid */}
              {processedCatalog.some(e => !e.is_bundle) && (
                <section>
                  <h2 className="font-display text-lg sm:text-xl text-slate-800 font-extrabold mb-5 flex items-center gap-2">
                    📚 Store Selection
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                    {processedCatalog.filter(e => !e.is_bundle).map((book) => (
                      <ProductCard key={book.id} product={book} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Mobile Drawer Filter / Modal Sheet */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden lg:hidden" aria-modal="true" role="dialog">
          {/* Backdrop overlay */}
          <div 
            onClick={() => setMobileFiltersOpen(false)}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300"
          />

          {/* Drawer container */}
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] bg-white rounded-t-3xl shadow-2xl flex flex-col transform transition-transform duration-300 ease-out translate-y-0">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="font-display font-extrabold text-slate-800 text-base">Filter & Sort</h3>
                {activeFiltersCount > 0 && (
                  <p className="text-[10px] text-emerald-600 font-bold mt-0.5">{activeFiltersCount} filters active</p>
                )}
              </div>
              <div className="flex items-center gap-4">
                {activeFiltersCount > 0 && (
                  <button 
                    onClick={() => {
                      clearAllFilters();
                      setMobileFiltersOpen(false);
                    }}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800"
                  >
                    Clear All
                  </button>
                )}
                <button 
                  onClick={() => setMobileFiltersOpen(false)}
                  className="p-1 rounded-full bg-slate-50 hover:bg-slate-100 transition-colors"
                  aria-label="Close filters"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
            </div>

            {/* Scrollable Filters Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 select-none scrollbar-none">
              {renderFilterContent()}
            </div>

            {/* Sticky Actions Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-4 shrink-0 rounded-b-t-none">
              <span className="text-xs font-bold text-slate-500">
                {processedCatalog.length} Results
              </span>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="flex-1 max-w-[200px] bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-2xl text-xs font-black text-center shadow-md transition-all uppercase tracking-wider"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

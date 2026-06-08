import React from "react";
import { createPublicClient } from "@/lib/supabase";
import { BRAND } from "@/lib/constants";
import { ProductCard, ComboCard } from "@/components/store/ProductCard";
import { Users, PlaySquare, ShieldCheck } from "lucide-react";

export const revalidate = 60; // Revalidate every minute

export default async function StorefrontPage() {
  const supabase = createPublicClient();
  
  // Single Source of Truth: ONLY query mt_ebooks
  const { data, error } = await supabase
    .from("mt_ebooks")
    .select("*")
    .eq("clinic_id", BRAND.clinicId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });
    
  if (error) {
    console.error("Failed to fetch products:", error);
  }

  const catalog = data || [];
  
  // Categorization
  // Assuming 'slug' or 'title' determines combos if is_combo column is not present. But mt_ebooks does not have is_combo.
  // Wait, let me just pass all of them as individual for now, or check if they have a 'bundle' in the title.
  const combos = catalog.filter(e => e.title.toLowerCase().includes('bundle') || e.title.toLowerCase().includes('combo'));
  const bestSellers = catalog.filter(e => e.price > 500 && !combos.find(c => c.id === e.id));
  const individual = catalog.filter(e => !combos.find(c => c.id === e.id));
  
  const diagnosticBooks = individual.filter(e => e.title.toLowerCase().includes('diagnos') || e.title.toLowerCase().includes('test'));
  const medicineBooks = individual.filter(e => e.title.toLowerCase().includes('medicine') || e.title.toLowerCase().includes('materia'));
  const gynePediaBooks = individual.filter(e => e.title.toLowerCase().includes('gyne') || e.title.toLowerCase().includes('pedia'));

  return (
    <div className="flex flex-col min-h-screen bg-[#FDFDFD] pb-32 pt-[52px]">
      
      {/* 
        Minimalist Trust Strip (As requested by User) 
      */}
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-10 md:pt-16">
        
        {/* Bundles / Combo Section (Featured Top) */}
        {combos.length > 0 && (
          <section className="mb-16 md:mb-24">
            <h2 className="font-display text-2xl md:text-3xl text-mt-text font-bold mb-6">Complete Bundles</h2>
            <div className="flex flex-col gap-8">
              {combos.map(combo => <ComboCard key={combo.id} product={combo} />)}
            </div>
          </section>
        )}

        {/* Best Sellers */}
        {bestSellers.length > 0 && (
          <section className="mb-16 md:mb-20">
            <h2 className="font-display text-2xl text-mt-text font-bold mb-6">Best Sellers</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
              {bestSellers.map(book => <ProductCard key={book.id} product={book} />)}
            </div>
          </section>
        )}

        {/* Diagnostic Series */}
        {diagnosticBooks.length > 0 && (
          <section className="mb-16 md:mb-20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-2xl text-mt-text font-bold">Diagnostic Guides</h2>
              <span className="text-sm font-semibold text-mt-text-tertiary hidden sm:block">
                {diagnosticBooks.length} Products
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
              {diagnosticBooks.map(book => <ProductCard key={book.id} product={book} />)}
            </div>
          </section>
        )}

        {/* Medicine Series */}
        {medicineBooks.length > 0 && (
          <section className="mb-16 md:mb-20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-2xl text-mt-text font-bold">Medicine Notes</h2>
              <span className="text-sm font-semibold text-mt-text-tertiary hidden sm:block">
                {medicineBooks.length} Products
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
              {medicineBooks.map(book => <ProductCard key={book.id} product={book} />)}
            </div>
          </section>
        )}

        {/* Gyne & Pedia Series */}
        {gynePediaBooks.length > 0 && (
          <section className="mb-16 md:mb-20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-2xl text-mt-text font-bold">Gynecology & Pediatrics</h2>
              <span className="text-sm font-semibold text-mt-text-tertiary hidden sm:block">
                {gynePediaBooks.length} Products
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
              {gynePediaBooks.map(book => <ProductCard key={book.id} product={book} />)}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}

import React from "react";
import { createPublicClient } from "../../lib/supabase";
import { BRAND } from "../../lib/constants";
import { Users, PlaySquare, ShieldCheck } from "lucide-react";
import StorefrontClientPhysical from "../../components/store/StorefrontClientPhysical";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shop Medical Books & Handbooks - Dr. Aman Agrawal | MediTonic",
  description: "Browse and order high-quality hardcopy medical guidebooks, clinical practice manuals, and diagnosis reference books by Dr. Aman Agrawal. Cash on Delivery available.",
};

export default async function PhysicalStorePage() {
  const supabase = createPublicClient();
  
  // Fetch active products that are physical books or physical bundle deals
  const { data, error } = await supabase
    .from("mt_products")
    .select("*")
    .eq("clinic_id", BRAND.clinicId)
    .eq("is_active", true)
    .or("product_type.eq.PHYSICAL_BOOK,is_bundle.eq.true")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });
    
  if (error) {
    console.error("Failed to fetch physical products:", error);
  }

  const catalog = data || [];
  
  // Extract all categories present in the current physical catalog
  const categories = Array.from(
    new Set(catalog.map((p) => p.category).filter(Boolean))
  );

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/20 pb-32 pt-0">
      
      {/* Minimalist Trust Strip */}
      <div className="bg-white border-b border-slate-100 py-2.5 shadow-sm">
        <div 
          className="max-w-7xl mx-auto px-4 flex flex-row items-center justify-start md:justify-center flex-nowrap overflow-x-auto scrollbar-none gap-x-4 text-[11px] sm:text-xs md:text-sm whitespace-nowrap"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <div className="flex items-center gap-1.5 font-semibold text-slate-800 shrink-0">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Authoritative Guides</span>
          </div>
          <div className="w-px h-3.5 bg-slate-200 shrink-0"></div>
          <div className="flex items-center gap-1.5 font-medium text-slate-600 shrink-0">
            <Users className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>5,000+ Practitioners Trained</span>
          </div>
          <div className="w-px h-3.5 bg-slate-200 shrink-0"></div>
          <div className="flex items-center gap-1.5 font-medium text-slate-600 shrink-0">
            <PlaySquare className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>1.4M+ YouTube Subscribers</span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-8">
        
        {/* Header */}
        <div className="mb-10 text-center md:text-left">
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Physical Book Store
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-500 max-w-2xl">
            Get high-quality printed paperbacks and clinical practice guides shipped directly to your clinic or home.
          </p>
        </div>

        {/* Catalog and Filtering Interface */}
        <StorefrontClientPhysical initialCatalog={catalog} categories={categories} />
      </div>

    </div>
  );
}

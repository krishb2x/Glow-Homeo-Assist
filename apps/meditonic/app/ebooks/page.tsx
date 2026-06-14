import React from "react";
import { createPublicClient } from "../../lib/supabase";
import { BRAND } from "../../lib/constants";
import { Users, PlaySquare, ShieldCheck } from "lucide-react";
import StorefrontClient from "../../components/store/StorefrontClient";

export const dynamic = "force-dynamic";

export default async function StorefrontPage() {
  const supabase = createPublicClient();
  
  const { data, error } = await supabase
    .from("mt_products")
    .select("*")
    .eq("clinic_id", BRAND.clinicId)
    .eq("is_active", true)
    .not("product_type", "in", '("PHYSICAL_BOOK","TREATMENT_KIT")')
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });
    
  if (error) {
    console.error("Failed to fetch products:", error);
  }

  const catalog = data || [];
  
  // Extract all available categories for the sidebar/filter menu
  const { data: allProducts } = await supabase
    .from("mt_products")
    .select("category")
    .eq("clinic_id", BRAND.clinicId)
    .eq("is_active", true)
    .not("product_type", "in", '("PHYSICAL_BOOK","TREATMENT_KIT")');
    
  const categories = Array.from(
    new Set((allProducts || []).map((p) => p.category).filter(Boolean))
  );

  return (
    <div className="flex flex-col min-h-screen bg-[#FDFDFD] pb-32 pt-0 sm:pt-4 md:pt-[52px]">
      
      {/* Minimalist Trust Strip */}
      <div className="bg-white border-b border-mt-border py-1.5 sm:py-2.5">
        <div 
          className="max-w-7xl mx-auto px-4 flex flex-row items-center justify-start md:justify-center flex-nowrap overflow-x-auto scrollbar-none gap-x-3 text-[10px] sm:text-xs md:text-sm whitespace-nowrap"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <div className="flex items-center gap-1 font-semibold text-mt-text shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 md:w-5 md:h-5 text-mt-primary shrink-0" />
            <span>Dr. Aman Agrawal</span>
          </div>
          <div className="w-px h-3 bg-mt-border shrink-0"></div>
          <div className="flex items-center gap-1 font-medium text-mt-text-secondary shrink-0">
            <Users className="w-3.5 h-3.5 md:w-5 md:h-5 text-blue-600 shrink-0" />
            <span>5,000+ Patients Treated</span>
          </div>
          <div className="w-px h-3 bg-mt-border shrink-0"></div>
          <div className="flex items-center gap-1 font-medium text-mt-text-secondary shrink-0">
            <PlaySquare className="w-3.5 h-3.5 md:w-5 md:h-5 text-[#FF0000] shrink-0" fill="#FF0000" strokeWidth={1} />
            <span>1.4M+ YouTube Community</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-3 sm:pt-6 md:pt-10">
        <StorefrontClient initialCatalog={catalog} categories={categories} />
      </div>

    </div>
  );
}

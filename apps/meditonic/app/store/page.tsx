import React from "react";
import { createPublicClient } from "@/lib/supabase";
import { BRAND } from "@/lib/constants";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { formatPrice } from "@/lib/utils";

export const revalidate = 60;

export default async function YouTubeStoreLinkPage() {
  const supabase = createPublicClient();
  
  // Fetch top 3 converting products (Triple Bundle + 2 other bundles/books)
  const { data: products } = await supabase
    .from("mt_ebooks") // Fallback table
    .select("*")
    .eq("clinic_id", BRAND.clinicId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .limit(4);

  if (!products || products.length === 0) {
    return <div>Store coming soon</div>;
  }

  return (
    <div className="min-h-screen bg-[#1B6B5C] flex flex-col items-center py-16 px-4">
      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-2xl mb-6">
        <span className="text-[#1B6B5C] font-display font-bold text-3xl">M</span>
      </div>
      
      <h1 className="text-white font-display text-2xl mb-2 text-center">Dr. Aman Agrawal</h1>
      <p className="text-white/80 text-sm mb-10 text-center max-w-sm">
        Premium medical guides for students and practitioners.
      </p>

      <div className="w-full max-w-md space-y-4">
        {products.map((product) => (
          <Link 
            key={product.id}
            href={`/ebooks/${product.slug}?utm_source=youtube&utm_campaign=link_in_bio`}
            className="block w-full bg-white rounded-xl p-4 shadow-lg hover:scale-[1.02] active:scale-95 transition-transform"
          >
            <div className="flex gap-4 items-center">
              <div className="w-16 h-24 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                 {product.image_url ? (
                   <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                 ) : (
                   <div className="w-full h-full bg-[#1B6B5C]/10" />
                 )}
              </div>
              <div className="flex-1">
                {product.is_combo && (
                  <span className="text-[9px] bg-[#E1F5EE] text-[#1B6B5C] font-bold px-2 py-0.5 rounded uppercase tracking-wider mb-1 inline-block">
                    {product.badge || 'Bundle'}
                  </span>
                )}
                <h3 className="font-bold text-sm text-gray-900 leading-tight mb-2">{product.title}</h3>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#1B6B5C]">{formatPrice(product.price)}</span>
                  <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center">
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <Link href="/ebooks" className="mt-12 text-white/60 text-sm hover:text-white transition-colors underline underline-offset-4">
        View All Books & Guides
      </Link>
    </div>
  );
}

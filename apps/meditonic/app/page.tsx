import { createAdminClient } from "../lib/supabase";
import HeroBanner from "../components/sections/HeroBanner";
import CTABand from "../components/sections/CTABand";
import StorefrontClient from "../components/store/StorefrontClient";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = createAdminClient();
  const { data: config } = await supabase.from("mt_storefront_config").select("*").limit(1).single();

  const { data: products } = await supabase
    .from("mt_products")
    .select("*")
    .eq("status", "PUBLISHED")
    .order("display_order", { ascending: true });

  const categories = Array.from(new Set(products?.map((p: any) => p.category).filter(Boolean)));

  return (
    <>
      <HeroBanner config={config} />
      
      {/* Featured Products Section */}
      <section className="py-20 bg-white" id="featured-products">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Featured Collection</h2>
            <p className="mt-4 text-lg text-slate-500">Discover our latest releases and best-selling bundles.</p>
          </div>
          
          <StorefrontClient initialCatalog={products || []} categories={categories as string[]} />
        </div>
      </section>

      <CTABand />
    </>
  );
}

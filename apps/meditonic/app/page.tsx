import { fetchActiveHomepage } from "../lib/cms";
import { LandingPageRenderer } from "../components/store/LandingPageRenderer";
import StorefrontClient from "../components/store/StorefrontClient";
import { createAdminClient } from "../lib/supabase";

export const dynamic = "force-dynamic";

export default async function Home() {
  const page = await fetchActiveHomepage();

  // If we have a dynamic CMS page built, render it!
  if (page) {
    return <LandingPageRenderer page={page} />;
  }

  // Fallback: If no CMS page is found (e.g. before initial setup), render default hardcoded layout
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
      {/* Featured Products Section Fallback */}
      <section className="py-20 bg-white" id="featured-products">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Store Catalog</h2>
            <p className="mt-4 text-lg text-slate-500">Discover our latest releases and best-selling books.</p>
          </div>
          
          <StorefrontClient initialCatalog={products || []} categories={categories as string[]} />
        </div>
      </section>
    </>
  );
}

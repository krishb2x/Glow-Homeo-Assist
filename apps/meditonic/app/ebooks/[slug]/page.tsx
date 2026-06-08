import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, FileText, Layers, Truck } from "lucide-react";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { Card, CardContent } from "@/components/ui/Card";
import { formatPrice } from "@/lib/utils";
import CTABand from "@/components/sections/CTABand";
import { createPublicClient } from "@/lib/supabase";
import { BRAND } from "@/lib/constants";
import LandingBuyButton from "@/components/store/LandingBuyButton";
import { Metadata } from "next";

export const revalidate = 60;

// Dynamic Metadata Generation for SEO and Ads
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const supabase = createPublicClient();
  
  const { data: product } = await supabase
    .from("mt_ebooks") // fallback check, assume mt_products will be used later
    .select("title, description, image_url")
    .eq("slug", resolvedParams.slug)
    .single();

  if (!product) return {};

  return {
    title: `${product.title} - Dr. Aman Agrawal | MediTonic`,
    description: product.description?.substring(0, 160),
    openGraph: {
      title: product.title,
      description: product.description?.substring(0, 160),
      url: `https://meditonic.glowhomeo.com/ebooks/${resolvedParams.slug}`,
      images: [
        {
          url: product.image_url || `https://meditonic.glowhomeo.com/og-default.jpg`,
          width: 1200,
          height: 630,
        }
      ],
      type: "website",
    }
  };
}

export default async function StoreProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = await params;
  const supabase = createPublicClient();

  const { data: product, error } = await supabase
    .from("mt_ebooks") // Using fallback table name here until user runs SQL
    .select("*")
    .eq("slug", resolvedParams.slug)
    .eq("clinic_id", BRAND.clinicId)
    .single();

  if (error || !product) {
    notFound();
  }

  let metadata: any = {};
  if (product.metadata) {
    metadata = typeof product.metadata === 'string' ? JSON.parse(product.metadata) : product.metadata;
  }

  const isCombo = product.is_combo;
  const isPhysical = product.type === 'hardcopy' || metadata.format === 'Hard Copy';

  return (
    <div className="flex flex-col pt-[52px]">
      <section className="bg-mt-primary-bg pt-12 pb-16">
        <div className="section-container">
          <ScrollReveal direction="up">
            <Link 
              href="/ebooks" 
              className="inline-flex items-center text-sm font-semibold text-mt-primary hover:text-mt-primary-dark mb-8"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Store
            </Link>
          </ScrollReveal>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <ScrollReveal direction="right">
              <div className={`relative ${isCombo ? 'aspect-[3/2]' : 'aspect-[3/4]'} max-w-md mx-auto lg:mx-0 overflow-hidden rounded-xl shadow-2xl`}>
                {product.badge && (
                  <div className="absolute top-4 left-4 z-20 bg-mt-primary text-white text-sm font-bold px-4 py-1.5 rounded-full uppercase tracking-wider">
                    {product.badge}
                  </div>
                )}
                <img
                  src={product.image_url || `https://placehold.co/${isCombo ? '600x400' : '400x520'}/064E3B/ffffff?text=${encodeURIComponent(product.title)}`}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              </div>
            </ScrollReveal>
            
            <ScrollReveal direction="left" className="flex flex-col h-full">
              <div className="mb-2">
                <span className="inline-block bg-white text-mt-primary text-xs font-semibold px-3 py-1 rounded-full border border-mt-border uppercase tracking-wider">
                  {isCombo ? 'Combo Bundle' : product.category.replace('_', ' ')}
                </span>
              </div>
              
              <h1 className="font-display text-4xl text-mt-text mb-4 leading-tight">
                {product.title}
              </h1>
              
              <div className="mb-6 flex items-baseline gap-3 flex-wrap">
                <span className="font-display text-4xl font-bold text-[#1B6B5C]">
                  {formatPrice(product.price)}
                </span>
                {product.original_price && product.original_price > product.price && (
                  <span className="text-xl text-mt-text-tertiary line-through">
                    {formatPrice(product.original_price)}
                  </span>
                )}
                {product.original_price && product.price < product.original_price && (
                  <span className="text-sm font-bold text-green-700 bg-green-100 px-3 py-1.5 rounded-full ml-auto md:ml-4">
                    Save {formatPrice(product.original_price - product.price)}
                  </span>
                )}
              </div>
              
              <div className="prose prose-mt-primary text-mt-text-secondary mb-8">
                <p className="text-lg">{product.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                {metadata.pages && (
                  <div className="bg-white p-4 rounded-xl border border-mt-border flex flex-col items-center justify-center text-center">
                    <FileText className="h-6 w-6 text-mt-secondary mb-2" />
                    <span className="text-sm font-semibold text-mt-text">{metadata.pages} Pages</span>
                    <span className="text-xs text-mt-text-secondary">Comprehensive</span>
                  </div>
                )}
                {metadata.books && (
                  <div className="bg-white p-4 rounded-xl border border-mt-border flex flex-col items-center justify-center text-center">
                    <Layers className="h-6 w-6 text-mt-secondary mb-2" />
                    <span className="text-sm font-semibold text-mt-text">{metadata.books} Books</span>
                    <span className="text-xs text-mt-text-secondary">Included</span>
                  </div>
                )}
                <div className="bg-white p-4 rounded-xl border border-mt-border flex flex-col items-center justify-center text-center">
                  <Truck className="h-6 w-6 text-mt-secondary mb-2" />
                  <span className="text-sm font-semibold text-mt-text">{isPhysical ? 'Physical Copy' : 'Instant PDF'}</span>
                  <span className="text-xs text-mt-text-secondary">{isPhysical ? 'Home Delivery' : 'Digital Access'}</span>
                </div>
              </div>
              
              <Card className="border-[#1B6B5C]/20 shadow-lg mt-auto overflow-hidden bg-[#E1F5EE]">
                <CardContent className="p-6">
                  {/* Buy Button integrating with Cart State */}
                  <LandingBuyButton product={product as any} />
                </CardContent>
              </Card>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <CTABand />
    </div>
  );
}

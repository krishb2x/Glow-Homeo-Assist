import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, FileText, Layers, Truck, Star, ShieldCheck, Zap, Lock, BookOpen } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { createPublicClient } from "@/lib/supabase";
import { BRAND } from "@/lib/constants";
import LandingBuyButton from "@/components/store/LandingBuyButton";
import ProductGallery from "@/components/store/ProductGallery";
import VerifiedReviewsGallery from "./VerifiedReviewsGallery";
import PreviewVideo from "./PreviewVideo";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const supabase = createPublicClient();
  
  const { data: product } = await supabase
    .from("mt_products")
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
    .from("mt_products")
    .select("*")
    .eq("slug", resolvedParams.slug)
    .eq("clinic_id", BRAND.clinicId)
    .single();

  if (error || !product) {
    notFound();
  }

  // Fetch Upsell Relationship
  const { data: relationships } = await supabase
    .from("mt_product_relationships")
    .select(`
      related_product_id,
      related_product:mt_products!related_product_id (
        id, title, price, original_price, cover_image_path, image_url, slug, is_bundle
      )
    `)
    .eq("product_id", product.id)
    .eq("relationship_type", "upsell")
    .order("sort_order", { ascending: true })
    .limit(1);

  const upsell = relationships?.[0]?.related_product as any;

  let metadata: any = {};
  if (product.metadata) {
    metadata = typeof product.metadata === 'string' ? JSON.parse(product.metadata) : product.metadata;
  }

  const isCombo = product.product_type === 'BUNDLE' || product.is_combo;
  const isPhysical = product.product_type === 'PHYSICAL_BOOK' || product.type === 'hardcopy';
  const rating = metadata.rating || 5.0;
  const author = metadata.author || "Dr. Aman Agrawal";
  const imageSrc = product.cover_image_path || product.image_url;
  const reviewCount = metadata.verified_reviews?.length || 12; // Fallback to 12 if none

  return (
    <div className="flex flex-col min-h-screen bg-[#FDFDFD] pt-[52px]">
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16">
          <Link 
            href="/ebooks" 
            className="inline-flex items-center text-sm font-semibold text-mt-text-secondary hover:text-mt-primary mb-8 transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Store
          </Link>
          
          <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
            {/* Left Column: Gallery */}
            <div className="w-full lg:w-5/12 flex flex-col gap-4">
              <ProductGallery 
                title={product.title} 
                coverImage={imageSrc} 
                galleryImages={metadata.gallery_image_paths || []} 
                isCombo={isCombo} 
                // Note: videoUrl is removed here because we now use a dedicated PreviewVideo component
              />
            </div>

            {/* Right Column: Product Details (Mobile First Restructure) */}
            <div className="w-full lg:w-7/12 flex flex-col">
              
              {/* 1. Badges & Tags */}
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {product.metadata?.bestseller && (
                  <span className="bg-yellow-400 text-yellow-950 text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wide">
                    Bestseller
                  </span>
                )}
                {product.metadata?.custom_badge && (
                  <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wide">
                    {product.metadata.custom_badge}
                  </span>
                )}
                <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wide border border-slate-200">
                  {isPhysical ? 'Physical Book' : 'Digital PDF'}
                </span>
                {isCombo && (
                  <span className="bg-[#1B6B5C]/10 text-[#1B6B5C] text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wide">
                    Premium Bundle
                  </span>
                )}
              </div>
              
              {/* 2. Title */}
              <h1 className="font-display text-3xl md:text-4xl lg:text-5xl text-mt-text mb-4 leading-tight">
                {product.title}
              </h1>
              
              {/* 3. Rating / Verified Reviews Count */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 mb-6">
                <a href="#reviews" className="flex items-center gap-2 hover:bg-slate-50 px-2 py-1 -ml-2 rounded transition-colors w-fit">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
                  </div>
                  <span className="text-sm font-semibold text-mt-text underline underline-offset-2">{rating.toFixed(1)}</span>
                  <span className="text-sm text-mt-text-secondary">({reviewCount} reviews)</span>
                </a>
                <div className="hidden sm:block w-px h-4 bg-mt-border"></div>
                <div className="text-sm font-medium text-mt-text-secondary">
                  By <span className="text-mt-text font-bold">{author}</span>
                </div>
              </div>
              
              {/* 4. Price */}
              <div className="mb-6 flex items-baseline gap-3 bg-slate-50 border border-slate-100 p-4 rounded-xl">
                <span className="font-display text-4xl font-bold text-[#1B6B5C]">
                  {formatPrice(product.price)}
                </span>
                {product.original_price && product.original_price > product.price && (
                  <div className="flex flex-col">
                    <span className="text-lg text-mt-text-tertiary line-through font-medium">
                      {formatPrice(product.original_price)}
                    </span>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded w-fit mt-0.5">
                      Save {Math.round(((product.original_price - product.price) / product.original_price) * 100)}%
                    </span>
                  </div>
                )}
              </div>

              {/* 5. Buy Now Button & PDF Preview (Above the fold) */}
              <div className="flex flex-col gap-3 w-full mb-8">
                
                {/* UPSELL CARD */}
                {upsell && (
                  <div className="mb-2 w-full bg-emerald-50 border-2 border-emerald-500 rounded-xl p-4 relative overflow-hidden shadow-sm">
                    <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
                      Highly Recommended
                    </div>
                    <h4 className="font-bold text-emerald-900 mb-1 pr-24">Upgrade & Save!</h4>
                    <p className="text-sm text-emerald-700 mb-3">
                      Add the <span className="font-semibold">{upsell.title}</span> to your order and save instantly.
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-900 text-lg">{formatPrice(upsell.price)}</span>
                        {upsell.original_price && upsell.original_price > upsell.price && (
                          <span className="text-xs text-emerald-600 line-through">{formatPrice(upsell.original_price)}</span>
                        )}
                      </div>
                      <Link 
                        href={`/ebooks/${upsell.slug}`}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-4 rounded-lg transition-colors"
                      >
                        View Bundle
                      </Link>
                    </div>
                  </div>
                )}

                <LandingBuyButton product={product as any} />
                
                {metadata.preview_pdf_path && (
                  <a
                    href={metadata.preview_pdf_path.startsWith('http') ? metadata.preview_pdf_path : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${metadata.preview_pdf_path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-4 px-6 rounded-xl border-2 border-slate-200 text-slate-700 font-bold text-center hover:border-mt-primary hover:text-mt-primary hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                  >
                    <BookOpen className="w-5 h-5" />
                    Read Free Sample Chapter
                  </a>
                )}
              </div>

              {/* 6. Trust Badges */}
              <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-10 py-4 border-y border-slate-100">
                <div className="flex flex-col items-center justify-center text-center gap-1.5 p-2">
                  <div className="bg-emerald-50 text-emerald-600 p-2 rounded-full">
                    <Lock className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold text-slate-700 leading-tight">Secure Payment</span>
                </div>
                <div className="flex flex-col items-center justify-center text-center gap-1.5 p-2">
                  <div className="bg-blue-50 text-blue-600 p-2 rounded-full">
                    <Zap className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold text-slate-700 leading-tight">Instant Access</span>
                </div>
                <div className="flex flex-col items-center justify-center text-center gap-1.5 p-2">
                  <div className="bg-purple-50 text-purple-600 p-2 rounded-full">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold text-slate-700 leading-tight">Lifetime Updates</span>
                </div>
              </div>
              
              {/* 7. Dedicated Preview Video (Moved Above Description) */}
              {metadata.preview_video_url && (
                <div className="mb-10">
                  <PreviewVideo videoUrl={metadata.preview_video_url} title={product.title} />
                </div>
              )}

              {/* Description */}
              <div className="prose prose-mt-primary text-mt-text-secondary mb-12 max-w-none">
                <div className="text-base leading-relaxed space-y-4">
                  {product.description?.split('\n').map((line: string, i: number) => (
                    <p key={i} className="m-0">{line}</p>
                  ))}
                </div>
              </div>
              
              {/* Format Details */}
              <div className="grid grid-cols-2 gap-4 mb-12">
                {metadata.pages && (
                  <div className="bg-[#F8F9FA] p-4 rounded-xl border border-mt-border flex flex-col">
                    <FileText className="h-5 w-5 text-mt-secondary mb-2" />
                    <span className="text-sm font-bold text-mt-text">{metadata.pages} Pages</span>
                    <span className="text-xs text-mt-text-secondary">Comprehensive text</span>
                  </div>
                )}
                {metadata.books && (
                  <div className="bg-[#F8F9FA] p-4 rounded-xl border border-mt-border flex flex-col">
                    <Layers className="h-5 w-5 text-mt-secondary mb-2" />
                    <span className="text-sm font-bold text-mt-text">{metadata.books} Books</span>
                    <span className="text-xs text-mt-text-secondary">Included in bundle</span>
                  </div>
                )}
                <div className="bg-[#F8F9FA] p-4 rounded-xl border border-mt-border flex flex-col">
                  <Truck className="h-5 w-5 text-mt-secondary mb-2" />
                  <span className="text-sm font-bold text-mt-text">{isPhysical ? 'Physical Copy' : 'Instant PDF'}</span>
                  <span className="text-xs text-mt-text-secondary">{isPhysical ? 'Home Delivery' : 'Digital Download'}</span>
                </div>
              </div>

              {/* 8. What You'll Learn Cards */}
              {metadata.key_learnings && Array.isArray(metadata.key_learnings) && metadata.key_learnings.length > 0 && (
                <div className="mb-16">
                  <h3 className="font-display text-2xl font-bold text-mt-text mb-6">What you'll learn</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {metadata.key_learnings.map((learning: string, index: number) => (
                      <div key={index} className="flex items-start gap-3 p-4 bg-white border border-slate-200 shadow-sm rounded-xl hover:shadow-md transition-shadow">
                        <div className="bg-emerald-50 p-1.5 rounded-full mt-0.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        </div>
                        <span className="text-sm font-medium text-slate-700 leading-relaxed">{learning}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* 9. Verified Reviews Section */}
          <div id="reviews">
            <VerifiedReviewsGallery reviews={metadata.verified_reviews || []} />
          </div>

          {/* 10. FAQ Section (Basic Fallback Structure if none in DB) */}
          <div className="mt-20 max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="font-display text-3xl font-bold text-mt-text mb-3">Frequently Asked Questions</h2>
            </div>
            <div className="space-y-4">
              <details className="group bg-white border border-slate-200 rounded-xl overflow-hidden [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer items-center justify-between gap-1.5 p-5 text-slate-900 font-semibold">
                  When will I receive the eBook?
                  <span className="relative size-5 shrink-0 transition duration-300 group-open:-rotate-180">
                    <svg xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 opacity-100 group-open:opacity-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                    <svg xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 opacity-0 group-open:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                  </span>
                </summary>
                <div className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">
                  You will receive an email with a direct download link immediately after your payment is successfully processed. You can also download it instantly from your purchase confirmation page.
                </div>
              </details>
              
              <details className="group bg-white border border-slate-200 rounded-xl overflow-hidden [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer items-center justify-between gap-1.5 p-5 text-slate-900 font-semibold">
                  Is my payment secure?
                  <span className="relative size-5 shrink-0 transition duration-300 group-open:-rotate-180">
                    <svg xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 opacity-100 group-open:opacity-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                    <svg xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 opacity-0 group-open:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                  </span>
                </summary>
                <div className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">
                  Yes! We use Razorpay, one of the most trusted and secure payment gateways. Your payment information is fully encrypted and never stored on our servers.
                </div>
              </details>
              
              <details className="group bg-white border border-slate-200 rounded-xl overflow-hidden [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer items-center justify-between gap-1.5 p-5 text-slate-900 font-semibold">
                  Can I read this on my phone/tablet?
                  <span className="relative size-5 shrink-0 transition duration-300 group-open:-rotate-180">
                    <svg xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 opacity-100 group-open:opacity-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                    <svg xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 opacity-0 group-open:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                  </span>
                </summary>
                <div className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">
                  Absolutely. The eBook is delivered in a standard PDF format that can be easily opened and read on any smartphone, tablet, laptop, or desktop computer.
                </div>
              </details>
            </div>
          </div>
        </div>
      </main>

      {/* Sticky Mobile Purchase Action */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 p-4 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.1)] z-40">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xl text-[#1B6B5C]">{formatPrice(product.price)}</span>
              {product.original_price && product.original_price > product.price && (
                <span className="text-xs text-slate-400 line-through">{formatPrice(product.original_price)}</span>
              )}
            </div>
          </div>
          {metadata.preview_pdf_path && (
            <a
              href={metadata.preview_pdf_path.startsWith('http') ? metadata.preview_pdf_path : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${metadata.preview_pdf_path}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-slate-600 flex items-center gap-1.5 hover:text-mt-primary underline underline-offset-2"
            >
              <BookOpen className="w-3.5 h-3.5" /> Free Sample
            </a>
          )}
        </div>
        <LandingBuyButton product={product as any} />
        <div className="flex items-center justify-center gap-2 mt-3 opacity-70">
          <ShieldCheck className="w-3 h-3 text-slate-500" />
          <span className="text-[10px] font-semibold text-slate-500">Secure Checkout via Razorpay</span>
        </div>
      </div>
      
      {/* Spacer for mobile sticky footer */}
      <div className="h-32 md:hidden"></div>
    </div>
  );
}

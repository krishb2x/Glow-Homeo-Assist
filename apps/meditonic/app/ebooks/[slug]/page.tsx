import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, FileText, Layers, Truck, Star } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { createPublicClient } from "@/lib/supabase";
import { BRAND } from "@/lib/constants";
import LandingBuyButton from "@/components/store/LandingBuyButton";
import ProductGallery from "@/components/store/ProductGallery";
import VerifiedReviewsGallery from "./VerifiedReviewsGallery";
import { Metadata } from "next";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const supabase = createPublicClient();
  
  const { data: product } = await supabase
    .from("mt_ebooks")
    .select("title, description, cover_image_path")
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
          url: product.cover_image_path || `https://meditonic.glowhomeo.com/og-default.jpg`,
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
    .from("mt_ebooks")
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

  const isCombo = product.product_type === 'BUNDLE' || product.is_combo;
  const isPhysical = product.product_type === 'PHYSICAL_BOOK' || product.type === 'hardcopy';
  const rating = metadata.rating || 5.0;
  const author = metadata.author || "Dr. Aman Agrawal";
  const imageSrc = product.cover_image_path || product.image_url;

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
            <div className="w-full lg:w-1/2 flex flex-col gap-4">
              <ProductGallery 
                title={product.title} 
                coverImage={imageSrc} 
                galleryImages={product.gallery_image_paths || []} 
                isCombo={isCombo} 
                videoUrl={metadata.preview_video_url} 
              />
            </div>

            {/* Right Column: Product Details */}
            <div className="w-full lg:w-1/2 flex flex-col">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                {product.metadata?.bestseller && (
                  <span className="bg-yellow-400 text-yellow-950 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                    Bestseller
                  </span>
                )}
                {product.metadata?.custom_badge && (
                  <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                    {product.metadata.custom_badge}
                  </span>
                )}
                <span className="bg-black/5 text-mt-text text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                  {isPhysical ? 'Physical Book' : 'Digital PDF'}
                </span>
                {isCombo && (
                  <span className="bg-[#1B6B5C]/10 text-[#1B6B5C] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                    Premium Bundle
                  </span>
                )}
              </div>
              
              <h1 className="font-display text-3xl md:text-4xl lg:text-5xl text-mt-text mb-4 leading-tight">
                {product.title}
              </h1>
              
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 mb-8">
                <div className="flex items-center gap-1.5">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
                  </div>
                  <span className="text-sm font-medium text-mt-text-secondary">{rating.toFixed(1)} Rating</span>
                </div>
                <div className="hidden sm:block w-px h-4 bg-mt-border"></div>
                <div className="text-sm font-medium text-mt-text-secondary">
                  By <span className="text-mt-text">{author}</span>
                </div>
              </div>
              
              <div className="mb-8 flex items-baseline gap-4">
                <span className="font-display text-4xl font-bold text-[#1B6B5C]">
                  {formatPrice(product.price)}
                </span>
                {product.original_price && product.original_price > product.price && (
                  <span className="text-xl text-mt-text-tertiary line-through">
                    {formatPrice(product.original_price)}
                  </span>
                )}
              </div>

              {/* Desktop Buy Button */}
              <div className="hidden md:flex flex-col gap-3 w-full mb-12">
                <LandingBuyButton product={product as any} />
                {product.preview_pdf_path && (
                  <a
                    href={product.preview_pdf_path.startsWith('http') ? product.preview_pdf_path : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${product.preview_pdf_path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-4 px-6 rounded-xl border-2 border-mt-primary text-mt-primary font-bold text-center hover:bg-mt-primary/5 transition-colors flex items-center justify-center gap-2"
                  >
                    <FileText className="w-5 h-5" />
                    Read Free Sample
                  </a>
                )}
                <p className="text-xs text-center text-mt-text-tertiary mt-2">Secure payment via Razorpay. Instant delivery.</p>
              </div>
              
              {/* Description */}
              <div className="prose prose-mt-primary text-mt-text-secondary mb-10 max-w-none whitespace-pre-wrap">
                <p className="text-base md:text-lg leading-relaxed">{product.description}</p>
              </div>
              
              {/* Format Details */}
              <div className="grid grid-cols-2 gap-4 mb-10">
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

              {/* Key Learnings (if available) */}
              {metadata.key_learnings && Array.isArray(metadata.key_learnings) && (
                <div className="mb-12">
                  <h3 className="font-bold text-lg text-mt-text mb-4">What you'll learn</h3>
                  <ul className="space-y-3">
                    {metadata.key_learnings.map((learning: string, index: number) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-mt-primary shrink-0 mt-0.5" />
                        <span className="text-sm text-mt-text-secondary leading-relaxed">{learning}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
          
          {/* Verified Reviews Section */}
          <VerifiedReviewsGallery reviews={metadata.verified_reviews || []} />
        </div>
      </main>

      {/* Sticky Mobile Purchase Action */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-mt-border p-4 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-40">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="flex flex-col">
            <span className="text-sm text-mt-text-secondary font-medium">Total Price</span>
            <span className="font-bold text-lg text-[#1B6B5C]">{formatPrice(product.price)}</span>
          </div>
          {product.preview_pdf_path && (
            <a
              href={product.preview_pdf_path.startsWith('http') ? product.preview_pdf_path : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${product.preview_pdf_path}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg border border-mt-primary text-mt-primary text-sm font-semibold flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Sample
            </a>
          )}
        </div>
        <LandingBuyButton product={product as any} />
      </div>
      {/* Spacer for mobile sticky footer */}
      <div className="h-24 md:hidden"></div>
    </div>
  );
}

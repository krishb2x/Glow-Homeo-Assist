import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, FileText, Layers, Truck } from "lucide-react";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { Card, CardContent } from "@/components/ui/Card";
import { formatPrice } from "@/lib/utils";
import CTABand from "@/components/sections/CTABand";
import { createAdminClient } from "@/lib/supabase";
import { BRAND } from "@/lib/constants";
import CheckoutForm from "./CheckoutForm";
import ReactMarkdown from "react-markdown";

export const revalidate = 60;

export default async function EbookDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = await params;
  const supabase = createAdminClient();

  const { data: ebook, error } = await supabase
    .from("mt_ebooks")
    .select("*")
    .eq("slug", resolvedParams.slug)
    .eq("clinic_id", BRAND.clinicId)
    .single();

  if (error || !ebook) {
    notFound();
  }

  let metadata: any = {};
  if (ebook.metadata) {
    metadata = typeof ebook.metadata === 'string' ? JSON.parse(ebook.metadata) : ebook.metadata;
  }

  const isCombo = ebook.is_combo;
  const isPhysical = metadata.format === 'Hard Copy';

  return (
    <div className="flex flex-col">
      <section className="bg-mt-primary-bg pt-20 pb-16">
        <div className="section-container">
          <ScrollReveal direction="up">
            <Link 
              href="/ebooks" 
              className="inline-flex items-center text-sm font-semibold text-mt-primary hover:text-mt-primary-dark mb-8"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to eBooks
            </Link>
          </ScrollReveal>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <ScrollReveal direction="right">
              <div className={`relative ${isCombo ? 'aspect-[3/2]' : 'aspect-[3/4]'} max-w-md mx-auto lg:mx-0 overflow-hidden rounded-xl shadow-2xl`}>
                {ebook.badge && (
                  <div className="absolute top-4 left-4 z-20 bg-mt-primary text-white text-sm font-bold px-4 py-1.5 rounded-full uppercase tracking-wider">
                    {ebook.badge}
                  </div>
                )}
                <img
                  src={ebook.image_url || `https://placehold.co/${isCombo ? '600x400' : '400x520'}/064E3B/ffffff?text=${encodeURIComponent(ebook.title)}`}
                  alt={ebook.title}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Video Trailer if available */}
              {ebook.video_url && (
                <div className="mt-8">
                  <h3 className="font-display text-lg font-bold mb-4">Video Overview</h3>
                  <div className="relative aspect-video rounded-xl overflow-hidden shadow-lg border border-mt-border">
                    <iframe 
                      src={ebook.video_url} 
                      className="absolute inset-0 w-full h-full"
                      allowFullScreen
                      title="Video Overview"
                    />
                  </div>
                </div>
              )}
            </ScrollReveal>
            
            <ScrollReveal direction="left" className="flex flex-col h-full">
              <div className="mb-2">
                <span className="inline-block bg-white text-mt-primary text-xs font-semibold px-3 py-1 rounded-full border border-mt-border uppercase tracking-wider">
                  {isCombo ? 'Combo Bundle' : ebook.category.replace('_', ' ')}
                </span>
              </div>
              
              <h1 className="font-display text-heading-xl text-mt-text mb-4 leading-tight">
                {ebook.title}
              </h1>
              
              <div className="mb-6 flex items-baseline gap-3 flex-wrap">
                <span className="font-display text-4xl font-bold text-mt-primary">
                  {formatPrice(ebook.price)}
                </span>
                {ebook.original_price && ebook.original_price > ebook.price && (
                  <span className="text-xl text-mt-text-tertiary line-through">
                    {formatPrice(ebook.original_price)}
                  </span>
                )}
                {ebook.original_price && ebook.price < ebook.original_price && (
                  <span className="text-sm font-bold text-green-700 bg-green-100 px-3 py-1.5 rounded-full ml-auto md:ml-4">
                    Save {formatPrice(ebook.original_price - ebook.price)}
                  </span>
                )}
              </div>
              
              <div className="prose prose-mt-primary text-mt-text-secondary mb-8">
                <p className="text-lg">{ebook.description}</p>
                {/* Could map markdown description here if there was one */}
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
              
              <Card className="border-mt-border shadow-lg mt-auto overflow-hidden">
                <div className="bg-mt-primary/5 p-4 border-b border-mt-border/50">
                  <h3 className="font-display font-semibold text-mt-text text-lg">
                    Checkout Details
                  </h3>
                </div>
                <CardContent className="p-6">
                  {/* Client form for interactivity */}
                  <CheckoutForm ebook={ebook} isPhysical={isPhysical} />
                </CardContent>
              </Card>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Book details section */}
      <section className="section-padding bg-white border-t border-mt-border">
        <div className="section-container max-w-4xl mx-auto text-center">
           <h2 className="font-display text-heading-lg mb-8">Why Get This {isCombo ? 'Bundle' : 'Book'}?</h2>
           <p className="text-lg text-mt-text-secondary mb-12">
             Dr. Aman Agrawal's clinical resources are designed to bridge the gap between complex medical textbooks and practical, daily clinical application. Whether you are a student or a practicing physician, these guides serve as an essential reference.
           </p>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-6 w-6 text-mt-success shrink-0" />
                <div>
                  <h4 className="font-bold text-mt-text">Simplified Language</h4>
                  <p className="text-sm text-mt-text-secondary">Complex conditions explained in easy-to-understand terms.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-6 w-6 text-mt-success shrink-0" />
                <div>
                  <h4 className="font-bold text-mt-text">Clinical Focus</h4>
                  <p className="text-sm text-mt-text-secondary">Practical knowledge you can apply in your OPD immediately.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-6 w-6 text-mt-success shrink-0" />
                <div>
                  <h4 className="font-bold text-mt-text">Quick Reference</h4>
                  <p className="text-sm text-mt-text-secondary">Structured for quick lookup during patient consultations.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-6 w-6 text-mt-success shrink-0" />
                <div>
                  <h4 className="font-bold text-mt-text">Trusted Authority</h4>
                  <p className="text-sm text-mt-text-secondary">Compiled from 5+ years of active homeopathic clinical practice.</p>
                </div>
              </div>
           </div>
        </div>
      </section>

      <CTABand />
    </div>
  );
}

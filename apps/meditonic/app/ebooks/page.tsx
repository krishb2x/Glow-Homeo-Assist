import Link from "next/link";
import { BookOpen, CheckCircle2, Star, Sparkles } from "lucide-react";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatPrice } from "@/lib/utils";
import CTABand from "@/components/sections/CTABand";
import { createAdminClient } from "@/lib/supabase";
import { BRAND } from "@/lib/constants";

export const revalidate = 60; // Revalidate every minute

export default async function EbooksPage() {
  const supabase = createAdminClient();
  
  // Fetch active ebooks & combos from Supabase
  const { data: ebooks, error } = await supabase
    .from("mt_ebooks")
    .select("*")
    .eq("clinic_id", BRAND.clinicId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching ebooks:", error);
  }

  const catalog = ebooks || [];
  const combos = catalog.filter(e => e.is_combo);
  
  // Group individual books by category
  const individual = catalog.filter(e => !e.is_combo);
  const diagnosticBooks = individual.filter(e => e.category === 'diagnostic');
  const medicineBooks = individual.filter(e => e.category === 'medicine');
  const gynePediaBooks = individual.filter(e => e.category === 'gyne_pedia');

  const renderBookCard = (ebook: any, isCombo = false) => {
    // Parse metadata safely
    let metadata: any = {};
    if (ebook.metadata) {
       metadata = typeof ebook.metadata === 'string' ? JSON.parse(ebook.metadata) : ebook.metadata;
    }

    return (
      <Card hover className="h-full flex flex-col overflow-hidden group border-mt-border shadow-md" key={ebook.id}>
        <Link href={`/ebooks/${ebook.slug}`} className={`block relative overflow-hidden bg-mt-primary-bg p-6 ${isCombo ? 'aspect-[3/2]' : 'aspect-[3/4]'}`}>
          {ebook.badge && (
            <div className="absolute top-4 left-4 z-20 bg-mt-primary text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              {ebook.badge}
            </div>
          )}
          <div className="absolute inset-0 bg-black/10 mix-blend-multiply opacity-0 transition-opacity group-hover:opacity-100 z-10" />
          <img
            src={ebook.image_url || `https://placehold.co/${isCombo ? '600x400' : '400x520'}/064E3B/ffffff?text=${encodeURIComponent(ebook.title)}`}
            alt={ebook.title}
            className="w-full h-full object-cover rounded-md shadow-lg transition-transform duration-500 group-hover:scale-105"
          />
        </Link>
        
        <CardHeader className="pb-4">
          <CardTitle className="text-xl leading-tight">
            <Link href={`/ebooks/${ebook.slug}`} className="hover:text-mt-primary transition-colors">
              {ebook.title}
            </Link>
          </CardTitle>
          <CardDescription className="mt-2 line-clamp-2">
            {ebook.description}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col pt-0">
          <ul className="mb-6 space-y-2 text-sm text-mt-text-secondary flex-1">
            {metadata.pages && (
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-mt-success shrink-0 mt-0.5" />
                <span>{metadata.pages} Pages Comprehensive Guide</span>
              </li>
            )}
            {metadata.books && (
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-mt-primary shrink-0 mt-0.5" />
                <span className="font-medium text-mt-primary">Includes {metadata.books} Books</span>
              </li>
            )}
            {metadata.format && (
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-mt-success shrink-0 mt-0.5" />
                <span>{metadata.format === 'Hard Copy' ? 'Physical Home Delivery' : 'Instant PDF Download'}</span>
              </li>
            )}
            {metadata.language && (
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-mt-success shrink-0 mt-0.5" />
                <span>Language: {metadata.language}</span>
              </li>
            )}
          </ul>
          
          <div className="flex flex-col border-t border-mt-border pt-4 mt-auto">
            <div className="flex items-end gap-2 mb-4">
              <span className="font-display text-2xl font-bold text-mt-text">{formatPrice(ebook.price)}</span>
              {ebook.original_price && ebook.original_price > ebook.price && (
                <span className="text-sm text-mt-text-tertiary line-through pb-1">{formatPrice(ebook.original_price)}</span>
              )}
              {ebook.original_price && ebook.price < ebook.original_price && (
                <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded-full ml-auto">
                  Save {formatPrice(ebook.original_price - ebook.price)}
                </span>
              )}
            </div>
            <Button asChild size="lg" className="w-full text-base font-bold uppercase tracking-wide">
              <Link href={`/ebooks/${ebook.slug}`}>Buy Now</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex flex-col">
      <section className="bg-mt-primary-bg pt-24 pb-16">
        <div className="section-container text-center">
          <ScrollReveal direction="up">
            <div className="inline-flex items-center gap-2 rounded-full bg-mt-primary/10 px-3 py-1 text-sm font-semibold text-mt-primary mb-6">
              <Sparkles className="h-4 w-4" /> Learn From Dr. Aman
            </div>
            <h1 className="font-display text-display-lg sm:text-display-xl text-mt-text mb-6">
              Premium Medical eBooks
            </h1>
            <p className="mx-auto max-w-2xl text-body-lg text-mt-text-secondary">
              Accelerate your clinical knowledge with Dr. Aman's comprehensive digital guides. 
              Designed for medical students, practitioners, and curious minds.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Combo Bundles Section (High Revenue Priority) */}
      {combos.length > 0 && (
        <section className="section-padding bg-gradient-to-b from-white to-mt-primary-bg/30 border-b border-mt-border">
          <div className="section-container">
            <ScrollReveal direction="up" className="text-center mb-12">
              <h2 className="font-display text-heading-lg text-mt-text mb-4">Combo Bundles (Best Value)</h2>
              <p className="text-mt-text-secondary max-w-2xl mx-auto">
                Save significantly by purchasing our curated bundles. Get the complete collection for your clinic or study.
              </p>
            </ScrollReveal>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {combos.map((combo, idx) => (
                <ScrollReveal key={combo.id} direction="up" delay={0.1 * idx}>
                  {renderBookCard(combo, true)}
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Individual Books Section */}
      <section className="section-padding bg-white min-h-[50vh]">
        <div className="section-container">
          
          {diagnosticBooks.length > 0 && (
            <div className="mb-20">
              <ScrollReveal direction="up">
                <h2 className="font-display text-heading-md text-mt-text mb-8 border-b border-mt-border pb-4">
                  Diagnostic Series
                </h2>
              </ScrollReveal>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {diagnosticBooks.map((ebook, idx) => (
                  <ScrollReveal key={ebook.id} direction="up" delay={0.1 * idx}>
                    {renderBookCard(ebook)}
                  </ScrollReveal>
                ))}
              </div>
            </div>
          )}

          {medicineBooks.length > 0 && (
            <div className="mb-20">
              <ScrollReveal direction="up">
                <h2 className="font-display text-heading-md text-mt-text mb-8 border-b border-mt-border pb-4">
                  Medicine Series
                </h2>
              </ScrollReveal>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {medicineBooks.map((ebook, idx) => (
                  <ScrollReveal key={ebook.id} direction="up" delay={0.1 * idx}>
                    {renderBookCard(ebook)}
                  </ScrollReveal>
                ))}
              </div>
            </div>
          )}

          {gynePediaBooks.length > 0 && (
            <div className="mb-12">
              <ScrollReveal direction="up">
                <h2 className="font-display text-heading-md text-mt-text mb-8 border-b border-mt-border pb-4">
                  Gyne & Pedia Series
                </h2>
              </ScrollReveal>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {gynePediaBooks.map((ebook, idx) => (
                  <ScrollReveal key={ebook.id} direction="up" delay={0.1 * idx}>
                    {renderBookCard(ebook)}
                  </ScrollReveal>
                ))}
              </div>
            </div>
          )}

        </div>
      </section>

      {/* Delivery Info */}
      <section className="py-12 bg-mt-secondary/10 border-t border-mt-secondary/20">
        <div className="section-container text-center max-w-2xl">
          <BookOpen className="h-10 w-10 text-mt-secondary mx-auto mb-4" />
          <h3 className="font-display text-xl font-bold text-mt-text mb-2">Instant PDF Access & Hard Copies</h3>
          <p className="text-sm text-mt-text-secondary">
            Digital purchases provide an instant high-quality PDF download link sent to your email. 
            Physical "Hard Copy Collection" orders are printed on demand and delivered Pan-India within 5-7 business days.
          </p>
        </div>
      </section>

      <CTABand />
    </div>
  );
}

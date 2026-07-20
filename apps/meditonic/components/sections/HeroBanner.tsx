import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ShoppingBag, BookOpen } from "lucide-react";
import { Button } from "../../components/ui/Button";
import ScrollReveal from "../../components/ui/ScrollReveal";

export default function HeroBanner({ config }: { config: any }) {
  const title = config?.hero_title || "Premium Medical Books & eBooks";
  const subtitle = config?.hero_subtitle || "Master clinical practice, diagnostic imaging, medicine, pediatrics, and gynecology with authoritative guides by Dr. Aman Agrawal.";
  const heroImage = config?.hero_banner_url || "/images/hero-products.jpg";

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50/40 via-white to-white pb-16 pt-20 sm:pb-24 lg:pb-32">
      {/* Decorative background gradients */}
      <div className="absolute left-1/2 top-0 -z-10 -ml-24 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/5 blur-3xl lg:-ml-64" />
      <div className="absolute right-0 top-1/2 -z-10 h-[600px] w-[600px] -translate-y-1/2 translate-x-1/3 rounded-full bg-teal-500/5 blur-3xl" />

      {config?.announcement_bar_active && (
        <div className="absolute top-0 left-0 w-full bg-emerald-600 text-white text-center py-2 text-sm font-medium shadow-sm">
          {config.announcement_bar_text || "Special Offer!"}
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-4 sm:mt-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-8 items-center">
          
          {/* Content Column (7 cols on large screens) */}
          <div className="flex flex-col justify-center text-center lg:text-left lg:col-span-6">
            <ScrollReveal direction="up" delay={0.1}>
              <div className="mx-auto mb-6 inline-flex rounded-full bg-emerald-50 px-4 py-1.5 text-xs sm:text-sm font-semibold text-emerald-700 lg:mx-0 shadow-sm border border-emerald-100/50">
                🚀 Dynamic Storefront & Learning Portal
              </div>
            </ScrollReveal>
            
            <ScrollReveal direction="up" delay={0.2}>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 leading-tight">
                {title.split(' ').map((word: string, i: number, arr: string[]) => 
                  i >= arr.length - 2 ? <span key={i} className="text-emerald-600"> {word}</span> : (i === 0 ? word : ' ' + word)
                )}
              </h1>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={0.3}>
              <p className="mt-6 text-base sm:text-lg lg:text-xl text-slate-600 sm:mx-auto sm:max-w-2xl lg:mx-0 text-balance leading-relaxed">
                {subtitle}
              </p>
            </ScrollReveal>

            {/* Dual CTA Buttons */}
            <ScrollReveal direction="up" delay={0.4} className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center lg:justify-start">
              <Button asChild size="lg" className="group bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/10 rounded-2xl py-6 px-8 text-base">
                <Link href="/store">
                  <ShoppingBag className="mr-2.5 h-5 w-5" />
                  Shop Medical Books
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="group border-slate-300 text-slate-700 hover:bg-slate-50 rounded-2xl py-6 px-8 text-base">
                <Link href="/ebooks">
                  <BookOpen className="mr-2.5 h-5 w-5 text-emerald-600" />
                  Explore Ebooks
                </Link>
              </Button>
            </ScrollReveal>
          </div>

          {/* Hero Image Column (5 cols on large screens, responsive wide aspects) */}
          <div className="relative mx-auto w-full max-w-xl lg:max-w-none lg:col-span-6">
            <ScrollReveal direction="left" delay={0.3} className="relative aspect-[3/2] sm:aspect-[4/3] lg:aspect-[3/2] w-full overflow-hidden rounded-3xl shadow-xl border border-slate-100 bg-white">
              <div className="absolute inset-0 bg-gradient-to-t from-black/[0.02] to-transparent z-10 pointer-events-none" />
              <Image
                src={heroImage}
                alt="MediTonic Medical Books Catalog"
                fill
                priority
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="h-full w-full object-cover transition-transform duration-700 hover:scale-[1.02]"
              />
            </ScrollReveal>
          </div>

        </div>
      </div>
    </section>
  );
}

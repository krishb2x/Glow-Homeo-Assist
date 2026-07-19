import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { Button } from "../../components/ui/Button";
import ScrollReveal from "../../components/ui/ScrollReveal";

export default function HeroBanner({ config }: { config: any }) {
  const title = config?.hero_title || "Discover Our Bestselling Books & Combos";
  const subtitle = config?.hero_subtitle || "Expand your knowledge with our curated collection of books and exclusive bundles.";
  const heroImage = config?.hero_banner_url || "/images/hero-products.jpg";

  return (
    <section className="relative overflow-hidden bg-mt-primary-bg pb-16 pt-24 sm:pb-24 lg:pb-32">
      {/* Decorative background shapes */}
      <div className="absolute left-1/2 top-0 -z-10 -ml-24 h-[1000px] w-[1000px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-mt-primary/5 blur-3xl lg:-ml-64" />
      <div className="absolute right-0 top-1/2 -z-10 h-[600px] w-[600px] -translate-y-1/2 translate-x-1/3 rounded-full bg-mt-secondary/10 blur-3xl" />

      {config?.announcement_bar_active && (
        <div className="absolute top-0 left-0 w-full bg-emerald-600 text-white text-center py-2 text-sm font-medium">
          {config.announcement_bar_text || "Special Offer!"}
        </div>
      )}

      <div className="mx-auto max-w-container px-4 sm:px-6 lg:px-8 mt-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-8 items-center">
          
          {/* Content */}
          <div className="flex flex-col justify-center text-center lg:text-left">
            <ScrollReveal direction="up" delay={0.1}>
              <div className="mx-auto mb-6 inline-flex rounded-full bg-mt-primary/10 px-3 py-1 text-sm font-semibold text-mt-primary lg:mx-0">
                New Bestsellers Available Now
              </div>
            </ScrollReveal>
            
            <ScrollReveal direction="up" delay={0.2}>
              <h1 className="font-display text-display-lg text-mt-text sm:text-display-xl leading-tight">
                {title.split(' ').map((word: string, i: number, arr: string[]) => 
                  i === arr.length - 1 ? <span key={i} className="text-mt-primary">{word}</span> : word + ' '
                )}
              </h1>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={0.3}>
              <p className="mt-6 text-xl sm:text-2xl text-mt-text-secondary sm:mx-auto sm:max-w-xl lg:mx-0 text-balance leading-relaxed">
                {subtitle}
              </p>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={0.4} className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center lg:justify-start">
              <Button asChild size="lg" className="group">
                <Link href="/store">
                  <ShoppingBag className="mr-2 h-5 w-5" />
                  Shop Best Sellers
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </ScrollReveal>
          </div>

          {/* Hero Image */}
          <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
            <ScrollReveal direction="left" delay={0.3} className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl shadow-2xl lg:aspect-auto lg:h-[600px]">
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent z-10" />
              <img
                src={heroImage}
                alt="Featured Products"
                className="h-full w-full object-cover"
              />
            </ScrollReveal>
          </div>

        </div>
      </div>
    </section>
  );
}

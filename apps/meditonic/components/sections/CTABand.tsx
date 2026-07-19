import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ScrollReveal from "../../components/ui/ScrollReveal";
import { Button } from "../../components/ui/Button";

export default function CTABand() {
  return (
    <section className="relative overflow-hidden bg-emerald-700 py-20 text-white">
      {/* Decorative patterns */}
      <div className="absolute inset-0 opacity-10">
        <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M0 100 C 20 0 50 0 100 100 Z" fill="currentColor" />
        </svg>
      </div>
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-400/30 blur-3xl" />
      <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-emerald-900/20 blur-3xl" />

      <div className="section-container relative z-10 text-center mx-auto px-4 max-w-4xl">
        <ScrollReveal>
          <h2 className="font-display text-4xl sm:text-5xl font-bold">
            Ready to Expand Your Knowledge?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-emerald-50 opacity-90">
            Browse our complete catalog of books and exclusive bundles. 
            Enjoy fast shipping and exclusive online discounts today.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.2} className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button asChild size="lg" className="w-full bg-white text-emerald-700 hover:bg-emerald-50 sm:w-auto shadow-xl">
            <Link href="#featured-products">
              Shop Now
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          
          <Button asChild variant="outline" size="lg" className="w-full border-white/30 text-white hover:bg-white/10 sm:w-auto">
            <Link href="/about">
              Our Story
            </Link>
          </Button>
        </ScrollReveal>
      </div>
    </section>
  );
}

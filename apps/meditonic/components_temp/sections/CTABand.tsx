import Link from "next/link";
import { ArrowRight, PlayCircle } from "lucide-react";
import ScrollReveal from "../../components/ui/ScrollReveal";
import { Button } from "../../components/ui/Button";
import { BRAND } from "../../lib/constants";

export default function CTABand() {
  return (
    <section className="relative overflow-hidden bg-mt-primary py-20 text-white">
      {/* Decorative patterns */}
      <div className="absolute inset-0 opacity-10">
        <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M0 100 C 20 0 50 0 100 100 Z" fill="currentColor" />
        </svg>
      </div>
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-mt-accent-teal/30 blur-3xl" />
      <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-mt-secondary/20 blur-3xl" />

      <div className="section-container relative z-10 text-center">
        <ScrollReveal>
          <h2 className="font-display text-heading-xl sm:text-display-lg">
            Ready to Begin Your Healing Journey?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-body-lg text-mt-primary-bg opacity-90">
            Book an online or in-clinic consultation with Dr. Aman Agrawal today and 
            take the first step towards lasting, natural health.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.2} className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button asChild size="lg" className="w-full bg-white text-mt-primary hover:bg-mt-primary-bg sm:w-auto shadow-xl">
            <Link href="/book-consultation">
              Book Consultation Now
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          
          <Button asChild variant="outline" size="lg" className="w-full border-white/30 text-white hover:bg-white/10 sm:w-auto">
            <a href={`https://wa.me/${BRAND.whatsapp.replace(/\D/g, "")}?text=Hello%20Dr.%20Aman,%20I%20would%20like%20to%20know%20more%20about%20your%20treatments.`} target="_blank" rel="noopener noreferrer">
              Chat on WhatsApp
            </a>
          </Button>
        </ScrollReveal>
      </div>
    </section>
  );
}

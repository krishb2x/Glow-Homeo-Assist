import Image from "next/image";
import Link from "next/link";
import { ArrowRight, PlayCircle, User } from "lucide-react";
import { Button } from "../../components/ui/Button";
import ScrollReveal from "../../components/ui/ScrollReveal";
import { BRAND } from "../../lib/constants";

export default function HeroBanner() {
  return (
    <section className="relative overflow-hidden bg-mt-primary-bg pb-16 pt-24 sm:pb-24 lg:pb-32">
      {/* Decorative background shapes */}
      <div className="absolute left-1/2 top-0 -z-10 -ml-24 h-[1000px] w-[1000px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-mt-primary/5 blur-3xl lg:-ml-64" />
      <div className="absolute right-0 top-1/2 -z-10 h-[600px] w-[600px] -translate-y-1/2 translate-x-1/3 rounded-full bg-mt-secondary/10 blur-3xl" />

      <div className="mx-auto max-w-container px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-8">
          
          {/* Content */}
          <div className="flex flex-col justify-center text-center lg:text-left">
            <ScrollReveal direction="up" delay={0.1}>
              <div className="mx-auto mb-6 inline-flex rounded-full bg-mt-primary/10 px-3 py-1 text-sm font-semibold text-mt-primary lg:mx-0">
                Healing Beyond Symptoms
              </div>
            </ScrollReveal>
            
            <ScrollReveal direction="up" delay={0.2}>
              <h1 className="font-display text-display-lg text-mt-text sm:text-display-xl leading-tight">
                Heal Naturally.<br/>
                <span className="text-mt-primary">Live Fully.</span>
              </h1>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={0.3}>
              <p className="mt-6 text-xl sm:text-2xl text-mt-text-secondary sm:mx-auto sm:max-w-xl lg:mx-0 text-balance leading-relaxed">
                Restoring <strong className="text-mt-text font-bold">Health, Hormones, and Happiness</strong> through personalized homeopathic care.
              </p>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={0.4} className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center lg:justify-start">
              <Button asChild size="lg" className="group">
                <Link href="/book-consultation">
                  Book Consultation
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="group bg-white/50 backdrop-blur-sm">
                <Link href="/about">
                  <User className="mr-2 h-5 w-5 text-mt-primary" />
                  Know more about Dr. Aman
                </Link>
              </Button>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={0.5} className="mt-10 flex items-center justify-center gap-4 lg:justify-start">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="inline-block h-10 w-10 overflow-hidden rounded-full border-2 border-white bg-gray-200">
                    <img 
                      src={`https://i.pravatar.cc/100?img=${i + 10}`} 
                      alt="Patient avatar" 
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
              <div className="text-sm font-medium text-mt-text-secondary">
                Trusted by <span className="text-mt-text font-bold">3,000+</span> patients
              </div>
            </ScrollReveal>
          </div>

          {/* Hero Image */}
          <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
            <ScrollReveal direction="left" delay={0.3} className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl shadow-2xl lg:aspect-auto lg:h-[600px]">
              {/* Note: In a real app, this would be a high-quality photo of the doctor or clinic */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent z-10" />
              <img
                src="/images/hero-products.jpg"
                alt="MediTonic Natural Herbal Blend - Daily Wellness Formula"
                className="h-full w-full object-cover"
              />
              <div className="absolute bottom-6 left-6 z-20">
                <div className="glass-card flex items-center gap-3 p-3 px-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-mt-success text-white">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-mt-text">{BRAND.doctor}</div>
                    <div className="text-xs font-medium text-mt-text-secondary">{BRAND.qualification}</div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>

        </div>
      </div>
    </section>
  );
}

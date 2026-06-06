import HeroBanner from "@/components/sections/HeroBanner";
import TreatmentGrid from "@/components/sections/TreatmentGrid";
import TestimonialCarousel from "@/components/sections/TestimonialCarousel";
import LearnFromDrAman from "@/components/sections/LearnFromDrAman";
import CTABand from "@/components/sections/CTABand";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { BRAND } from "@/lib/constants";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { CheckCircle2 } from "lucide-react";

export default function Home() {
  return (
    <>
      <HeroBanner />

      {/* Trust & Stats Bar */}
      <section className="border-b border-t border-mt-border bg-white py-8">
        <div className="mx-auto max-w-container px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-8 md:justify-between">
            <ScrollReveal direction="up" delay={0.1} className="flex items-center gap-2">
              <span className="font-display text-2xl font-bold text-mt-primary">6+</span>
              <span className="text-sm font-medium text-mt-text-secondary leading-tight">Years<br/>Experience</span>
            </ScrollReveal>
            <div className="hidden h-10 w-px bg-mt-border md:block" />
            
            <ScrollReveal direction="up" delay={0.2} className="flex items-center gap-2">
              <span className="font-display text-2xl font-bold text-mt-primary">5,000+</span>
              <span className="text-sm font-medium text-mt-text-secondary leading-tight">Patients<br/>Treated</span>
            </ScrollReveal>
            <div className="hidden h-10 w-px bg-mt-border md:block" />
            
            <ScrollReveal direction="up" delay={0.3} className="flex items-center gap-2">
              <span className="font-display text-2xl font-bold text-mt-primary">550+</span>
              <span className="text-sm font-medium text-mt-text-secondary leading-tight">Thyroid<br/>Recoveries</span>
            </ScrollReveal>
            <div className="hidden h-10 w-px bg-mt-border md:block" />
            
            <ScrollReveal direction="up" delay={0.4} className="flex items-center gap-2">
              <span className="font-display text-2xl font-bold text-mt-primary">BHMS</span>
              <span className="text-sm font-medium text-mt-text-secondary leading-tight">Aesthetics<br/>Specialist</span>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Doctor Intro Section */}
      <section className="section-padding bg-mt-bg" id="introduction">
        <div className="section-container">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <ScrollReveal direction="right">
              <div className="relative mx-auto max-w-md lg:mx-0">
                <div className="absolute -left-4 -top-4 h-full w-full rounded-3xl border-2 border-mt-secondary/30" />
                <div className="absolute -bottom-4 -right-4 h-full w-full rounded-3xl bg-mt-primary/5" />
                <div className="relative aspect-[4/5] overflow-hidden rounded-3xl shadow-xl bg-white">
                  {/* Real Image */}
                  <Image
                    src="/images/dr-aman.png"
                    alt={BRAND.doctor}
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="left">
              <div className="inline-flex rounded-full bg-mt-primary/10 px-3 py-1 text-sm font-semibold text-mt-primary mb-4">
                Meet Your Doctor
              </div>
              <h2 className="font-display text-heading-xl text-mt-text sm:text-display-lg mb-6">
                Healing the Root Cause, <span className="text-mt-primary">Not Just Symptoms.</span>
              </h2>
              
              <div className="prose prose-lg text-mt-text-secondary">
                <p>
                  Hello, I am {BRAND.doctor}. With over {BRAND.experience} of experience in classical homeopathy, 
                  my mission is to help you achieve true health without the burden of heavy medications or side effects.
                </p>
                <p>
                  Whether you're struggling with chronic anxiety, stubborn PCOD, or severe sleep disturbances, 
                  my approach focuses on understanding <em>you</em> as a whole person — your physical symptoms, emotional state, and lifestyle.
                </p>
              </div>

              <ul className="mt-8 space-y-3">
                <li className="flex items-center gap-3 text-mt-text-secondary font-medium">
                  <CheckCircle2 className="h-5 w-5 text-mt-success" /> Constitutional Analysis
                </li>
                <li className="flex items-center gap-3 text-mt-text-secondary font-medium">
                  <CheckCircle2 className="h-5 w-5 text-mt-success" /> Individualized Remedies
                </li>
                <li className="flex items-center gap-3 text-mt-text-secondary font-medium">
                  <CheckCircle2 className="h-5 w-5 text-mt-success" /> Sustainable Results
                </li>
              </ul>

              <div className="mt-10">
                <Button asChild size="lg">
                  <Link href="/about">Read Full Biography</Link>
                </Button>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <TreatmentGrid />
      <TestimonialCarousel />
      <LearnFromDrAman />
      <CTABand />
    </>
  );
}

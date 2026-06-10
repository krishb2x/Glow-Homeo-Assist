import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { TREATMENT_CATEGORIES, BRAND } from "@/lib/constants";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { Button } from "@/components/ui/Button";
import CTABand from "@/components/sections/CTABand";

export function generateStaticParams() {
  return TREATMENT_CATEGORIES.map((category) => ({
    slug: category.slug,
  }));
}

export default async function TreatmentDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = await params;
  const treatment = TREATMENT_CATEGORIES.find((c) => c.slug === resolvedParams.slug);

  if (!treatment) {
    notFound();
  }

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="bg-mt-primary-bg pt-20 pb-16">
        <div className="section-container">
          <ScrollReveal direction="up">
            <Link 
              href="/treatments" 
              className="inline-flex items-center text-sm font-semibold text-mt-primary hover:text-mt-primary-dark mb-8"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Treatments
            </Link>
            <h1 className="font-display text-heading-xl sm:text-display-lg text-mt-text mb-4">
              {treatment.title}
            </h1>
            <p className="max-w-3xl text-body-lg text-mt-text-secondary">
              {treatment.shortDesc}
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Content */}
      <section className="section-padding bg-white">
        <div className="section-container">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            
            {/* Main Content */}
            <div className="lg:col-span-2">
              <ScrollReveal direction="up" className="prose prose-lg prose-mt-primary max-w-none">
                <h2>Our Approach to {treatment.title}</h2>
                <p>
                  At {BRAND.name}, we do not view {treatment.title.toLowerCase()} as an isolated issue. 
                  Instead, we look at your entire constitution — your physical symptoms, emotional state, 
                  stress levels, and lifestyle factors.
                </p>
                <p>
                  Conventional medicine often relies on suppressing these symptoms, which can lead to 
                  dependency or side effects. Homeopathy, on the other hand, stimulates your body's 
                  own innate healing mechanisms.
                </p>
                
                <h3>Symptoms We Address</h3>
                <ul className="space-y-2">
                  {treatment.conditions.map((condition) => (
                    <li key={condition} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-mt-success" />
                      <span>{condition}</span>
                    </li>
                  ))}
                </ul>

                <h3>The Treatment Process</h3>
                <ol>
                  <li><strong>Deep Case Taking:</strong> A 45-60 minute consultation to understand your unique constitutional type.</li>
                  <li><strong>Individualized Prescription:</strong> A remedy selected specifically for your symptom picture.</li>
                  <li><strong>Ongoing Monitoring:</strong> Regular follow-ups to track progress and adjust dosage as you heal.</li>
                </ol>
              </ScrollReveal>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <ScrollReveal direction="up" delay={0.2} className="sticky top-28">
                <div className="rounded-2xl border border-mt-border bg-mt-bg p-8 shadow-sm">
                  <h3 className="font-display text-xl font-bold text-mt-text mb-4">
                    Ready to start healing?
                  </h3>
                  <p className="text-sm text-mt-text-secondary mb-6">
                    Book a detailed consultation with Dr. Aman to begin your customized 
                    treatment plan for {treatment.title.toLowerCase()}.
                  </p>
                  <Button asChild className="w-full mb-3">
                    <Link href={`/book-consultation?concern=${treatment.slug}`}>
                      Book Consultation
                    </Link>
                  </Button>
                  <p className="text-center text-xs text-mt-text-tertiary">
                    Available Online & In-Clinic
                  </p>
                </div>
              </ScrollReveal>
            </div>

          </div>
        </div>
      </section>

      <CTABand />
    </div>
  );
}

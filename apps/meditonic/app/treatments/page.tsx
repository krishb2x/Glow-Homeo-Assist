import { TREATMENT_CATEGORIES } from "@/lib/constants";
import { DUMMY_FAQS } from "@/lib/dummy-data";
import { SimpleAccordion } from "@/components/ui/Accordion";
import TreatmentGrid from "@/components/sections/TreatmentGrid";
import ScrollReveal from "@/components/ui/ScrollReveal";
import CTABand from "@/components/sections/CTABand";

export default function TreatmentsPage() {
  return (
    <div className="flex flex-col">
      <section className="bg-mt-primary-bg pt-24 pb-16">
        <div className="section-container text-center">
          <ScrollReveal direction="up">
            <h1 className="font-display text-display-lg sm:text-display-xl text-mt-text mb-6">
              Our Specializations
            </h1>
            <p className="mx-auto max-w-2xl text-body-lg text-mt-text-secondary">
              Dr. Aman Agrawal specializes in constitutional homeopathy for mental health, 
              stress, and hormonal imbalances. Select a condition below to learn about our 
              natural approach to healing.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Grid Section */}
      <TreatmentGrid />

      {/* FAQ Section */}
      <section className="section-padding bg-white border-t border-mt-border">
        <div className="section-container max-w-4xl">
          <ScrollReveal direction="up" className="text-center mb-12">
            <h2 className="font-display text-heading-xl text-mt-text">
              Frequently Asked Questions
            </h2>
            <p className="mt-4 text-mt-text-secondary">
              Common questions about our homeopathic approach.
            </p>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={0.2}>
            <SimpleAccordion items={DUMMY_FAQS} />
          </ScrollReveal>
        </div>
      </section>

      <CTABand />
    </div>
  );
}

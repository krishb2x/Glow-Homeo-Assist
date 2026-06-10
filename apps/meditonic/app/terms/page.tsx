import Link from "next/link";
import { BRAND } from "@/lib/constants";
import ScrollReveal from "@/components/ui/ScrollReveal";
import CTABand from "@/components/sections/CTABand";

export default function TermsPage() {
  const lastUpdated = "June 6, 2026";

  return (
    <div className="flex flex-col">
      <section className="bg-mt-primary-bg pt-24 pb-16">
        <div className="section-container text-center max-w-3xl">
          <ScrollReveal direction="up">
            <h1 className="font-display text-heading-xl sm:text-display-lg text-mt-text mb-4">
              Terms & Conditions
            </h1>
            <p className="text-mt-text-secondary">
              Last updated: {lastUpdated}
            </p>
          </ScrollReveal>
        </div>
      </section>

      <section className="section-padding bg-white">
        <div className="section-container max-w-3xl">
          <ScrollReveal direction="up" className="prose prose-lg prose-mt-primary max-w-none">
            <h2>1. Agreement to Terms</h2>
            <p>
              These Terms and Conditions constitute a legally binding agreement made between you and 
              {BRAND.name} concerning your access to and use of the {BRAND.siteUrl} website as well as 
              any other media form or service connected thereto.
            </p>

            <h2>2. Medical Disclaimer</h2>
            <p>
              <strong>Important:</strong> The information provided on this website is for educational 
              purposes only. It is not intended to be a substitute for professional medical advice, 
              diagnosis, or treatment. Always seek the advice of your physician or other qualified 
              health provider with any questions you may have regarding a medical condition.
            </p>

            <h2>3. Consultations and Treatment</h2>
            <ul>
              <li>Homeopathic treatment outcomes vary from person to person. We do not guarantee specific results.</li>
              <li>You must provide accurate and complete medical history during consultations.</li>
              <li>Online consultations are provided as a convenience but may not be suitable for medical emergencies. In an emergency, visit your nearest hospital immediately.</li>
            </ul>

            <h2>4. Cancellations and Refunds</h2>
            <p>
              Please note our cancellation policy:
            </p>
            <ul>
              <li>Consultations can be rescheduled up to 24 hours before the appointment time without penalty.</li>
              <li>No-shows or cancellations within 24 hours of the appointment will not be refunded.</li>
              <li>Digital products (eBooks) are non-refundable once delivered.</li>
              <li>Treatment programs are billed as a package. Partial refunds are only considered under exceptional medical circumstances at the discretion of the clinic.</li>
            </ul>

            <h2>5. Intellectual Property</h2>
            <p>
              Unless otherwise indicated, the Site is our proprietary property and all source code, 
              databases, functionality, software, website designs, audio, video, text, photographs, 
              and graphics on the Site are owned or controlled by us.
            </p>

            <h2>6. Contact</h2>
            <p>
              In order to resolve a complaint regarding the Site or to receive further information regarding use of the Site, please contact us at:
            </p>
            <p>
              <strong>{BRAND.name}</strong><br />
              Email: <Link href="/contact" className="text-mt-primary hover:underline">Contact us via the website form</Link><br />
              Phone: {BRAND.phone}
            </p>
          </ScrollReveal>
        </div>
      </section>

      <CTABand />
    </div>
  );
}

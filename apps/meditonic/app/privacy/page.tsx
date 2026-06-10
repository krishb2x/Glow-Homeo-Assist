import Link from "next/link";
import { BRAND } from "../../lib/constants";
import ScrollReveal from "../../components/ui/ScrollReveal";
import CTABand from "../../components/sections/CTABand";

export default function PrivacyPolicyPage() {
  const lastUpdated = "June 6, 2026";

  return (
    <div className="flex flex-col">
      <section className="bg-mt-primary-bg pt-24 pb-16">
        <div className="section-container text-center max-w-3xl">
          <ScrollReveal direction="up">
            <h1 className="font-display text-heading-xl sm:text-display-lg text-mt-text mb-4">
              Privacy Policy
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
            <h2>1. Introduction</h2>
            <p>
              At {BRAND.name}, we take your privacy seriously. This Privacy Policy explains how we collect, 
              use, disclose, and safeguard your information when you visit our website 
              ({BRAND.siteUrl}) or use our clinic services.
            </p>

            <h2>2. Information We Collect</h2>
            <p>We may collect personal information that you voluntarily provide to us when you:</p>
            <ul>
              <li>Register on the Website.</li>
              <li>Book a consultation or appointment.</li>
              <li>Purchase an eBook or treatment program.</li>
              <li>Contact us via forms, email, or WhatsApp.</li>
            </ul>
            <p>The personal information that we collect depends on the context of your interactions with us and the Website, the choices you make, and the products and features you use.</p>

            <h2>3. Medical and Health Information</h2>
            <p>
              As a healthcare provider, we collect sensitive medical information during your consultations 
              to provide you with accurate homeopathic treatment. This information is kept strictly confidential 
              and is stored securely. We do not share your medical records with third parties without your 
              explicit consent, except as required by law.
            </p>

            <h2>4. How We Use Your Information</h2>
            <p>We use the information we collect or receive:</p>
            <ul>
              <li>To facilitate account creation and logon process.</li>
              <li>To provide medical consultations and care plans.</li>
              <li>To process your payments and manage your orders.</li>
              <li>To send you administrative information and appointment reminders.</li>
              <li>To respond to your inquiries and offer support.</li>
            </ul>

            <h2>5. Payments</h2>
            <p>
              We use third-party payment processors (e.g., Razorpay) to process payments. We do not store 
              your credit card or bank account details on our servers. All payment data is handled securely 
              by the payment gateway.
            </p>

            <h2>6. Contact Us</h2>
            <p>
              If you have questions or comments about this Privacy Policy, please contact us at:
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

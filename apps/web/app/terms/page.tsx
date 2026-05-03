import type { Metadata } from "next";
import { MarketingLegalLayout } from "../../components/marketing/MarketingLegalLayout";
import { BRAND_NAME, CONTACT_EMAIL } from "../../lib/brand";

export const metadata: Metadata = {
  title: `Terms of use | ${BRAND_NAME}`,
  description: `Terms for using ${BRAND_NAME} software and website.`
};

const LAST = "3 May 2026";

export default function TermsPage(): JSX.Element {
  return (
    <MarketingLegalLayout title="Terms of use" lastUpdated={LAST}>
      <p>
        By accessing or using <strong>{BRAND_NAME}</strong> (“Service”), you agree to these terms. If you do not agree,
        do not use the Service.
      </p>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold text-slate-900">The Service</h2>
        <p>
          {BRAND_NAME} provides software for homeopathy clinics, including scheduling, documentation, prescriptions, and
          related workflows. Features may change as we improve the product. We may offer early access or beta
          functionality; such features are provided as-is until generally released.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold text-slate-900">Accounts</h2>
        <p>
          You are responsible for safeguarding credentials and for all activity under your account. You must provide
          accurate registration information and notify us promptly of unauthorised use.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold text-slate-900">Clinical responsibility</h2>
        <p>
          The Service may include optional AI-assisted tools. You remain solely responsible for clinical decisions,
          prescriptions, and the content of medical records. You must review and approve any AI-generated material
          before relying on it clinically.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold text-slate-900">Acceptable use</h2>
        <p>You agree not to misuse the Service, including by attempting to access data you are not authorised to view, probing for vulnerabilities beyond coordinated disclosure, or using the Service in violation of applicable law.</p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold text-slate-900">Intellectual property</h2>
        <p>
          We retain rights in the Service, branding, and software. You retain rights in the data you submit. We receive
          a limited licence to host and process your data solely to operate the Service for you.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold text-slate-900">Disclaimer</h2>
        <p>
          The Service is provided on an “as is” and “as available” basis to the maximum extent permitted by law. We do
          not warrant uninterrupted or error-free operation. Your exclusive remedies are as set out in these terms and
          any separate agreement you sign with us.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold text-slate-900">Limitation of liability</h2>
        <p>
          To the maximum extent permitted by applicable law, we are not liable for indirect, incidental, special,
          consequential, or punitive damages, or loss of profits, data, or goodwill, arising from your use of the Service.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold text-slate-900">Governing law</h2>
        <p>
          These terms are governed by the laws of India, without regard to conflict-of-law rules. Courts at a venue we
          specify in a future enterprise agreement shall have jurisdiction; until then, reasonable Indian jurisdiction
          applies.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold text-slate-900">Contact</h2>
        <p>
          Questions about these terms:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-hs-primary underline-offset-2 hover:underline">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </section>
    </MarketingLegalLayout>
  );
}

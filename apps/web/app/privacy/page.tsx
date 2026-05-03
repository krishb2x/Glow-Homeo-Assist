import type { Metadata } from "next";
import { MarketingLegalLayout } from "../../components/marketing/MarketingLegalLayout";
import { BRAND_NAME, CONTACT_EMAIL } from "../../lib/brand";

export const metadata: Metadata = {
  title: `Privacy policy | ${BRAND_NAME}`,
  description: `How ${BRAND_NAME} collects, uses, and protects clinic and patient information.`
};

const LAST = "3 May 2026";

export default function PrivacyPage(): JSX.Element {
  return (
    <MarketingLegalLayout title="Privacy policy" lastUpdated={LAST}>
      <p>
        This policy describes how <strong>{BRAND_NAME}</strong> (“we”, “us”) handles information when you use our
        website and clinical software. It is intended to be clear and practical; it does not replace legal advice for
        your practice.
      </p>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold text-slate-900">Who we are</h2>
        <p>
          {BRAND_NAME} is operated in connection with GlowHomeo contact channels published on our website (including{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-hs-primary underline-offset-2 hover:underline">
            {CONTACT_EMAIL}
          </a>
          ). For privacy questions, use that email with the subject line “Privacy”.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold text-slate-900">What we process</h2>
        <p>Depending on how you use the product, we may process:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Account and clinic data</strong> — e.g. name, email, phone, clinic name, role, and identifiers used
            to operate your workspace.
          </li>
          <li>
            <strong>Clinical and operational data you enter</strong> — e.g. patient demographics, case notes,
            prescriptions, appointments, messages, and files you upload, as configured for your clinic.
          </li>
          <li>
            <strong>Technical data</strong> — e.g. IP address, device/browser type, timestamps, and security logs needed
            to run, secure, and debug the service.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold text-slate-900">How we use data</h2>
        <p>We use data to provide and improve {BRAND_NAME}, authenticate users, support onboarding, prevent abuse, and meet legal obligations. Features described on our website (such as optional AI-assisted documentation) only operate within the product flows we publish.</p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold text-slate-900">Where data is stored</h2>
        <p>
          The product is built on secure cloud infrastructure and a managed database provider (e.g. Supabase). Data may be
          processed in regions supported by those providers. Contact us if you need a written summary for your clinic
          records.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold text-slate-900">Sharing</h2>
        <p>
          We do not sell patient lists. We use subprocessors (such as hosting and database providers) strictly to
          operate the service. We may disclose information if required by law or to protect rights and safety.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold text-slate-900">Retention</h2>
        <p>
          We retain information for as long as your account is active and as needed for backups, security, and legal
          compliance. Deletion timelines for specific record types may depend on your clinic’s configuration and
          applicable law.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold text-slate-900">Your responsibilities</h2>
        <p>
          As a healthcare provider, you remain responsible for lawful collection of patient information, consent where
          required, and professional record-keeping. {BRAND_NAME} is a tool to support your practice, not a substitute for
          your professional or legal duties.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold text-slate-900">Contact</h2>
        <p>
          To exercise privacy rights or ask questions, email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-hs-primary underline-offset-2 hover:underline">
            {CONTACT_EMAIL}
          </a>
          . We may need to verify your identity before fulfilling certain requests.
        </p>
      </section>

      <p className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 text-caption-sm text-slate-600">
        This policy may be updated. Material changes will be reflected on this page with a new “Last updated” date.
      </p>
    </MarketingLegalLayout>
  );
}

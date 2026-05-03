import type { Metadata } from "next";
import Link from "next/link";
import { MarketingLegalLayout } from "../../components/marketing/MarketingLegalLayout";
import { BRAND_NAME } from "../../lib/brand";

export const metadata: Metadata = {
  title: `Cookie notice | ${BRAND_NAME}`,
  description: `How ${BRAND_NAME} uses cookies and similar technologies.`
};

const LAST = "3 May 2026";

export default function CookiesPage(): JSX.Element {
  return (
    <MarketingLegalLayout title="Cookie notice" lastUpdated={LAST}>
      <p>
        This notice explains how <strong>{BRAND_NAME}</strong> uses cookies and similar storage on our website and web
        application.
      </p>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold text-slate-900">Essential cookies</h2>
        <p>
          We use cookies and local storage needed to run the Service — for example to keep you signed in, protect
          against cross-site attacks where applicable, and remember preferences. These are strictly necessary for core
          functionality.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold text-slate-900">Analytics and marketing</h2>
        <p>
          We may use privacy-conscious analytics on public marketing pages to understand traffic. We do not use intrusive
          cross-site ad trackers on the signed-in clinical workspace. If this changes, we will update this notice.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold text-slate-900">Your choices</h2>
        <p>
          You can control cookies through your browser settings. Blocking essential cookies may prevent parts of the
          Service from working.
        </p>
      </section>

      <p className="text-caption-sm text-slate-500">
        For how we process personal data more broadly, see our{" "}
        <Link href="/privacy" className="font-medium text-hs-primary underline-offset-2 hover:underline">
          Privacy policy
        </Link>
        .
      </p>
    </MarketingLegalLayout>
  );
}

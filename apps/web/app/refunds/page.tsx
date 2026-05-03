import type { Metadata } from "next";
import { MarketingLegalLayout } from "../../components/marketing/MarketingLegalLayout";
import { BRAND_NAME, CONTACT_EMAIL } from "../../lib/brand";

export const metadata: Metadata = {
  title: `Refunds & billing | ${BRAND_NAME}`,
  description: `Billing, trials, and refund approach for ${BRAND_NAME}.`
};

const LAST = "3 May 2026";

export default function RefundsPage(): JSX.Element {
  return (
    <MarketingLegalLayout title="Refunds & billing" lastUpdated={LAST}>
      <p>
        <strong>{BRAND_NAME}</strong> may be offered on early access, pilot, or subscription terms. The summary below
        applies unless you have a separate written agreement with us.
      </p>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold text-slate-900">Early access</h2>
        <p>
          During early access we may waive or reduce fees. Any special pricing will be confirmed in writing (including
          email) before charges apply.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold text-slate-900">Subscriptions</h2>
        <p>
          If you subscribe to paid plans, billing cycles and renewal terms will be shown at checkout or in your order
          confirmation. You may cancel according to the cancellation process we publish for your plan.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold text-slate-900">Refunds</h2>
        <p>
          Unless otherwise required by law or stated in your order, fees are non-refundable once the billing period has
          started. If you believe a charge is in error, contact us within 14 days at{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-hs-primary underline-offset-2 hover:underline">
            {CONTACT_EMAIL}
          </a>{" "}
          and we will investigate in good faith.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold text-slate-900">Taxes</h2>
        <p>Prices may be exclusive or inclusive of applicable taxes depending on your region; taxes will be shown where required.</p>
      </section>
    </MarketingLegalLayout>
  );
}

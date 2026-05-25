import type { Metadata } from "next";
import { LandingHeader } from "../../components/LandingHeader";
import { MarketingFooter } from "../../components/marketing/MarketingFooter";
import { PricingPlans } from "../../components/marketing/PricingPlans";
import { PlanComparisonTable } from "../../components/marketing/PlanComparisonTable";
import { FAQSection } from "../../components/marketing/FAQSection";
import { BRAND_NAME } from "../../lib/brand";

export const metadata: Metadata = {
  title: `Pricing | ${BRAND_NAME}`,
  description:
    "Simple pricing for homeopathy clinics. One price per clinic, no per-patient fees, no surprise add-ons."
};

export default function PricingPage(): JSX.Element {
  return (
    <div className="bg-white text-slate-900">
      <LandingHeader />

      <main id="main-content" className="relative">
        <section className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-b from-[#f7faf9] via-white to-white px-5 pb-12 pt-14 sm:px-6 sm:pt-20 md:px-10 md:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-hs-primary">
              Pricing
            </p>
            <h1 className="font-heading mt-3 text-balance text-[2rem] font-semibold leading-tight tracking-tight text-slate-900 sm:text-[2.5rem]">
              One price per clinic. Built for practising homeopaths.
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-[0.98rem] leading-relaxed text-slate-500">
              No per-patient fees. The patient care app is included. Choose monthly or annual billing;
              annual saves two months.
            </p>
          </div>
        </section>

        <PricingPlans />

        <PlanComparisonTable />

        {/* ── Comparison detail ─────────────────────────────────────── */}
        <section className="bg-white px-5 py-20 sm:px-6 sm:py-24 md:px-10">
          <div className="mx-auto max-w-5xl">
            <div className="max-w-2xl">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-hs-primary">
                What's included
              </p>
              <h2 className="font-heading mt-3 text-balance text-[1.6rem] font-semibold leading-tight tracking-tight text-slate-900 sm:text-[1.85rem]">
                Every plan includes the core clinical system.
              </h2>
              <p className="mt-3 max-w-xl text-[0.95rem] leading-relaxed text-slate-500">
                We do not hide daily essentials behind higher tiers. The patient care app,
                prescription PDFs, AI notetaker, and full case file are in every plan.
              </p>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: "Unlimited patients",
                  body: "One price for the whole clinic, not per patient. Grow your list without re-budgeting."
                },
                {
                  title: "Patient care app (included)",
                  body: "Branded under your clinic. Reminders, diet, lifestyle, follow-ups, and case history at no extra cost."
                },
                {
                  title: "AI notetaker (included)",
                  body: "Live transcription with doctor-approved notes. Always opt-in; never saves on its own."
                },
                {
                  title: "Prescription delivery",
                  body: "Email, WhatsApp, patient app, or print in every plan, with no per-message fees."
                },
                {
                  title: "Remedy inventory",
                  body: "Track stock and build treatment kits. Get low-stock alerts before you run out."
                },
                {
                  title: "Support that knows the workflow",
                  body: "Onboarding from a team that has built and used homeopathy software in real clinics."
                }
              ].map((it) => (
                <div
                  key={it.title}
                  className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_0_rgba(15,23,42,0.04)]"
                >
                  <p className="font-heading text-[0.92rem] font-semibold text-slate-900">
                    {it.title}
                  </p>
                  <p className="mt-2 text-[0.85rem] leading-relaxed text-slate-500">{it.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Billing FAQ ───────────────────────────────────────────── */}
        <section className="border-t border-slate-100 bg-slate-50/60 px-5 py-20 sm:px-6 sm:py-24 md:px-10">
          <div className="mx-auto max-w-3xl">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-hs-primary">
              Billing questions
            </p>
            <h2 className="font-heading mt-3 text-balance text-[1.6rem] font-semibold leading-tight tracking-tight text-slate-900 sm:text-[1.85rem]">
              The short answers.
            </h2>

            <dl className="mt-8 divide-y divide-slate-200/80">
              {[
                {
                  q: "Is there a free trial?",
                  a: "We offer a structured 90-day guided trial for serious clinics: personal onboarding with check-ins, not a self-serve trial. Apply through the walkthrough."
                },
                {
                  q: "Can I cancel any time?",
                  a: "Yes. Monthly plans cancel at the next billing date. Annual plans can be cancelled and pro-rated on request."
                },
                {
                  q: "How is the clinic seat counted?",
                  a: "A clinic seat covers one practice (one location, one team). Multiple doctors at the same clinic are included up to the seat limit on each plan."
                },
                {
                  q: "What about taxes (GST)?",
                  a: "All prices are exclusive of GST. Indian clinics will see GST added at checkout; international clinics may have local tax obligations."
                },
                {
                  q: "Do you offer a discount for clinics in training or rural setups?",
                  a: "We do. Contact us through the walkthrough form and tell us about your practice. We will discuss options with you."
                }
              ].map((item) => (
                <div key={item.q} className="py-5">
                  <dt className="font-heading text-[0.95rem] font-semibold leading-snug text-slate-900">
                    {item.q}
                  </dt>
                  <dd className="mt-2 text-[0.9rem] leading-relaxed text-slate-600">{item.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <FAQSection />
        <MarketingFooter />
      </main>
    </div>
  );
}

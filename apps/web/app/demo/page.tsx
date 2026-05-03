import type { Metadata } from "next";
import { GlowHomeoIntakeForm } from "../../components/marketing/GlowHomeoIntakeForm";
import { IntakeShell } from "../../components/marketing/IntakeShell";
import { BRAND_NAME } from "../../lib/brand";

export const metadata: Metadata = {
  title: `Book a 20-minute walkthrough | ${BRAND_NAME}`,
  description: "Request a 20-minute walkthrough of GlowHomeo Assist for your clinic."
};

export default function DemoWalkthroughPage(): JSX.Element {
  return (
    <IntakeShell>
      <main id="main-content" className="relative z-[1] px-4 py-10 sm:px-6 sm:py-14 md:py-16">
        <div className="mx-auto max-w-md">
          <p className="text-caption-sm font-semibold uppercase tracking-wide text-hs-primary">Walkthrough</p>
          <h1 className="font-heading mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Book a 20-minute walkthrough
          </h1>
          <p className="mt-3 text-body-sm leading-relaxed text-slate-600">
            Leave your details and we will contact you to schedule a focused session for your clinic.
          </p>
          <div className="mt-8 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-md ring-1 ring-slate-900/[0.03] sm:p-8">
            <GlowHomeoIntakeForm intent="walkthrough" submitLabel="Request walkthrough" />
          </div>
        </div>
      </main>
    </IntakeShell>
  );
}

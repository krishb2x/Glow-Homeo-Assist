import type { Metadata } from "next";
import { GlowHomeoIntakeForm } from "../../components/marketing/GlowHomeoIntakeForm";
import { IntakeShell } from "../../components/marketing/IntakeShell";
import { BRAND_NAME } from "../../lib/brand";

export const metadata: Metadata = {
  title: `Apply for guided trial | ${BRAND_NAME}`,
  description: "Apply for the 90-day guided trial of GlowHomeo Assist with personal onboarding for your homeopathy practice."
};

export default function RequestAccessPage(): JSX.Element {
  return (
    <IntakeShell>
      <main id="main-content" className="relative z-[1] px-4 py-10 sm:px-6 sm:py-14 md:py-16">
        <div className="mx-auto max-w-md">
          <p className="text-caption-sm font-semibold uppercase tracking-wide text-hs-primary">Guided trial</p>
          <h1 className="font-heading mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Apply for 90-day guided trial
          </h1>
          <p className="mt-3 text-body-sm leading-relaxed text-slate-600">
            Submit your details for guided onboarding. We review each application and follow up personally.
          </p>
          <div className="mt-8 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-md ring-1 ring-slate-900/[0.03] sm:p-8">
            <GlowHomeoIntakeForm intent="trial" submitLabel="Submit application" />
          </div>
        </div>
      </main>
    </IntakeShell>
  );
}

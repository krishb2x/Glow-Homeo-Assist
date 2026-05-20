import Link from "next/link";
import type { ReactNode } from "react";
import { LandingHeader } from "../LandingHeader";
import { CONTACT_EMAIL } from "../../lib/brand";

type MarketingLegalLayoutProps = {
  title: string;
  lastUpdated: string;
  children: ReactNode;
};

export function MarketingLegalLayout({ title, lastUpdated, children }: MarketingLegalLayoutProps): JSX.Element {
  return (
    <div className="marketing-page-shell min-h-screen text-slate-900">
      <LandingHeader />
      <main id="main-content" className="relative z-[1] px-4 py-10 sm:px-6 md:px-10 md:py-14">
        <div className="mx-auto max-w-2xl">
          <p className="text-caption-sm font-medium uppercase tracking-wide text-hs-primary">Legal</p>
          <h1 className="font-heading mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
          <p className="mt-2 text-caption-sm text-slate-500">Last updated: {lastUpdated}</p>
          <div className="mt-10 space-y-6 text-body-sm leading-relaxed text-slate-600">{children}</div>
          <nav
            className="mt-14 flex flex-wrap gap-x-6 gap-y-2 border-t border-slate-200 pt-8 text-caption-sm text-slate-500"
            aria-label="Legal pages"
          >
            <Link href="/" className="font-medium text-hs-primary transition hover:underline">
              Home
            </Link>
            <Link href="/privacy" className="transition hover:text-slate-800">
              Privacy
            </Link>
            <Link href="/terms" className="transition hover:text-slate-800">
              Terms
            </Link>
            <Link href="/cookies" className="transition hover:text-slate-800">
              Cookies
            </Link>
            <Link href="/refunds" className="transition hover:text-slate-800">
              Refunds
            </Link>
            <a href={`mailto:${CONTACT_EMAIL}`} className="transition hover:text-slate-800">
              {CONTACT_EMAIL}
            </a>
          </nav>
        </div>
      </main>
    </div>
  );
}

import Link from "next/link";
import { BRAND_NAME, CONTACT_EMAIL, CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL } from "../../lib/brand";
import {
  MARKETING_FOOTER_LEGAL,
  MARKETING_FOOTER_PRODUCT,
  resolveLoginHref
} from "../../lib/marketing-nav";
import { appOrigin } from "../../lib/marketing-urls";

/**
 * Slim, modern marketing footer. Three columns on desktop, stacked on mobile,
 * with the brand block on top so the hierarchy stays clean.
 */
export function MarketingFooter(): JSX.Element {
  const year = new Date().getFullYear();
  const login = resolveLoginHref(appOrigin());

  return (
    <footer
      className="border-t border-slate-100 bg-slate-50/60 px-5 pb-10 pt-14 text-slate-600 sm:px-6 md:px-10"
      role="contentinfo"
    >
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 lg:grid-cols-5 lg:gap-12">
          <div className="lg:col-span-2">
            <Link
              href="/"
              className="font-heading inline-block text-[1.05rem] font-semibold tracking-[-0.018em] text-slate-900"
            >
              {BRAND_NAME}
            </Link>
            <p className="mt-3 max-w-sm text-[0.85rem] leading-relaxed text-slate-500">
              Complete clinic software for homeopathy doctors, designed with practitioners who know
              the daily workflow first-hand.
            </p>
            <div className="mt-5 flex flex-col gap-1.5 text-[0.85rem]">
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="font-medium text-slate-700 hover:text-hs-primary"
              >
                {CONTACT_EMAIL}
              </a>
              <a
                href={`tel:${CONTACT_PHONE_TEL}`}
                className="font-medium text-slate-700 hover:text-hs-primary"
              >
                {CONTACT_PHONE_DISPLAY}
              </a>
            </div>
          </div>

          <nav aria-label="Product" className="lg:col-span-2">
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.16em] text-slate-400">
              Product
            </p>
            <ul className="mt-4 grid grid-cols-2 gap-2 text-[0.86rem]">
              {MARKETING_FOOTER_PRODUCT.map((l) => {
                const isAnchor = l.href.includes("#");
                const Cmp = isAnchor ? "a" : Link;
                return (
                  <li key={l.href}>
                    <Cmp
                      href={l.href}
                      className="text-slate-600 transition-colors hover:text-hs-primary"
                    >
                      {l.label}
                    </Cmp>
                  </li>
                );
              })}
              <li>
                <a
                  href={login}
                  className="text-slate-600 transition-colors hover:text-hs-primary"
                >
                  Log in
                </a>
              </li>
            </ul>
          </nav>

          <nav aria-label="Legal">
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.16em] text-slate-400">
              Legal
            </p>
            <ul className="mt-4 space-y-2 text-[0.86rem]">
              {MARKETING_FOOTER_LEGAL.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-slate-600 transition-colors hover:text-hs-primary"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-12 flex flex-col items-start gap-3 border-t border-slate-200/70 pt-6 text-[0.78rem] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} {BRAND_NAME}. All rights reserved.</p>
          <p>Made for homeopathy doctors in India and beyond.</p>
        </div>
      </div>
    </footer>
  );
}

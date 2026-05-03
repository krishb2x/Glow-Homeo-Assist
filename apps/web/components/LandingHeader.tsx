"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { BRAND_NAME } from "../lib/brand";
import { loginUrl } from "../lib/marketing-urls";

const PRIMARY_NAV = [
  { href: "/#features", label: "Features" },
  { href: "/#consultation", label: "How it works" },
  { href: "/#faq", label: "FAQ" }
] as const;

const navLinkClass =
  "rounded-full px-3 py-2 text-[0.8125rem] font-medium text-slate-600 transition-colors hover:bg-slate-100/90 hover:text-slate-900";

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hs-primary/35 focus-visible:ring-offset-2";

/** Matches `min-h-14` / `sm:min-h-[4.25rem]` below for fixed panel offset */
const MOBILE_NAV_TOP = "top-14 sm:top-[4.25rem]";

export function LandingHeader(): JSX.Element {
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMobile();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen, closeMobile]);

  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <header className="landing-header-sticky">
      <div className="mx-auto flex min-h-14 w-full max-w-7xl items-center gap-3 px-4 sm:min-h-[4.25rem] sm:gap-4 sm:px-6 md:px-10">
        <Link
          href="/"
          className="min-w-0 max-w-[min(100%,11.5rem)] shrink-0 truncate font-heading text-[0.92rem] font-semibold tracking-[-0.02em] text-slate-900 transition-colors hover:text-slate-700 sm:max-w-none sm:overflow-visible sm:whitespace-normal sm:text-[1.02rem]"
        >
          {BRAND_NAME}
        </Link>

        <nav
          className="hidden min-w-0 flex-1 justify-center gap-0.5 px-2 lg:flex lg:px-4"
          aria-label="Primary"
        >
          {PRIMARY_NAV.map((l) => (
            <a key={l.href} href={l.href} className={`${navLinkClass} shrink-0 whitespace-nowrap`}>
              {l.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2 lg:ml-0">
          <a
            href={loginUrl()}
            className={`${navLinkClass} hidden whitespace-nowrap sm:inline-flex sm:min-h-9 sm:items-center`}
          >
            Log in
          </a>

          <button
            type="button"
            className={`inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-white text-slate-800 shadow-sm transition-colors hover:bg-slate-50 lg:hidden ${focusRing}`}
            aria-expanded={mobileOpen}
            aria-controls="landing-mobile-nav"
            onClick={() => setMobileOpen((o) => !o)}
          >
            <span className="sr-only">{mobileOpen ? "Close menu" : "Open menu"}</span>
            {mobileOpen ? <X className="h-5 w-5" strokeWidth={2} aria-hidden /> : <Menu className="h-5 w-5" strokeWidth={2} aria-hidden />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[60] bg-slate-900/40 lg:hidden"
            aria-label="Close menu"
            onClick={closeMobile}
          />
          <div
            id="landing-mobile-nav"
            className={`fixed left-0 right-0 z-[70] max-h-[min(75dvh,calc(100dvh-env(safe-area-inset-bottom,0px)-3.5rem))] overflow-y-auto overscroll-contain border-b border-slate-200 bg-white px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 shadow-lg sm:max-h-[min(78dvh,calc(100dvh-env(safe-area-inset-bottom,0px)-4.25rem))] lg:hidden ${MOBILE_NAV_TOP}`}
          >
            <nav className="flex flex-col gap-0.5" aria-label="Primary mobile">
              {PRIMARY_NAV.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="rounded-xl px-3 py-3.5 text-base font-medium text-slate-800 transition-colors active:bg-slate-100"
                  onClick={closeMobile}
                >
                  {l.label}
                </a>
              ))}
            </nav>
            <div className="mt-4 border-t border-slate-100 pt-4">
              <a
                href={loginUrl()}
                className="flex min-h-12 items-center justify-center rounded-xl px-3 py-3 text-base font-medium text-slate-700 transition-colors active:bg-slate-100"
                onClick={closeMobile}
              >
                Log in
              </a>
            </div>
          </div>
        </>
      ) : null}
    </header>
  );
}

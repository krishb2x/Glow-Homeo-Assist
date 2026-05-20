"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { BRAND_NAME } from "../lib/brand";
import { cn } from "../lib/cn";
import { MARKETING_PRIMARY_NAV } from "../lib/marketing-nav";
import { loginUrl } from "../lib/marketing-urls";

const navLinkClass =
  "rounded-full px-3 py-2 text-[0.85rem] font-medium text-slate-600 transition-colors hover:text-slate-900";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hs-primary/35 focus-visible:ring-offset-2";

const ctaPrimaryClass = cn(
  "inline-flex min-h-9 items-center justify-center whitespace-nowrap rounded-full bg-hs-primary px-4 py-2 text-[0.82rem] font-semibold text-white shadow-[0_2px_8px_-2px_rgba(14,124,102,0.4)] transition-colors hover:bg-hs-primary-dark",
  focusRing
);

const ctaSecondaryClass = cn(
  "inline-flex min-h-9 items-center justify-center whitespace-nowrap rounded-full border border-slate-200/90 bg-white px-4 py-2 text-[0.82rem] font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900",
  focusRing
);

/** Matches `min-h-14` / `sm:min-h-[4.25rem]` below for fixed panel offset */
const MOBILE_NAV_TOP = "top-14 sm:top-[4.25rem]";

export function LandingHeader(): JSX.Element {
  const [mobileOpen, setMobileOpen] = useState(false);
  const login = loginUrl();

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent): void => {
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
      <div className="mx-auto flex min-h-14 w-full max-w-6xl items-center gap-3 px-4 sm:min-h-[4.25rem] sm:gap-4 sm:px-6 md:px-10">
        <Link
          href="/"
          className="min-w-0 shrink-0 truncate font-heading text-[0.98rem] font-semibold tracking-[-0.018em] text-slate-900 transition-colors hover:text-slate-700 sm:text-[1.05rem]"
          aria-label={`${BRAND_NAME} — home`}
        >
          {BRAND_NAME}
        </Link>

        <nav
          className="hidden min-w-0 flex-1 items-center justify-center gap-1 px-2 lg:flex lg:px-4"
          aria-label="Primary"
        >
          {MARKETING_PRIMARY_NAV.map((l) => {
            const isAnchor = l.href.includes("#");
            const Cmp = isAnchor ? "a" : Link;
            return (
              <Cmp
                key={l.href}
                href={l.href}
                className={cn(navLinkClass, "shrink-0 whitespace-nowrap", focusRing)}
              >
                {l.label}
              </Cmp>
            );
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2 lg:ml-0">
          <a
            href={login}
            className={cn(
              "hidden text-[0.82rem] font-medium text-slate-600 transition-colors hover:text-slate-900 sm:inline-flex sm:items-center sm:px-2 sm:py-2",
              focusRing
            )}
          >
            Log in
          </a>
          <Link
            href="/demo"
            className={cn(ctaPrimaryClass, "hidden sm:inline-flex")}
            data-testid="header-cta-primary"
          >
            Book a walkthrough
          </Link>

          <button
            type="button"
            className={cn(
              "inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-white text-slate-800 shadow-sm transition-colors hover:bg-slate-50 lg:hidden",
              focusRing
            )}
            aria-expanded={mobileOpen}
            aria-controls="landing-mobile-nav"
            onClick={() => setMobileOpen((o) => !o)}
          >
            <span className="sr-only">{mobileOpen ? "Close menu" : "Open menu"}</span>
            {mobileOpen ? (
              <X className="h-5 w-5" strokeWidth={2} aria-hidden />
            ) : (
              <Menu className="h-5 w-5" strokeWidth={2} aria-hidden />
            )}
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
            className={cn(
              "fixed left-0 right-0 z-[70] max-h-[min(78dvh,calc(100dvh-env(safe-area-inset-bottom,0px)-3.5rem))] overflow-y-auto overscroll-contain border-b border-slate-200 bg-white px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 shadow-lg sm:max-h-[min(80dvh,calc(100dvh-env(safe-area-inset-bottom,0px)-4.25rem))] lg:hidden",
              MOBILE_NAV_TOP
            )}
          >
            <nav className="flex flex-col gap-0.5" aria-label="Primary mobile">
              {MARKETING_PRIMARY_NAV.map((l) => (
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
            <div className="mt-4 grid gap-2 border-t border-slate-100 pt-4">
              <Link
                href="/demo"
                onClick={closeMobile}
                className={cn(ctaPrimaryClass, "h-12 text-[0.92rem]")}
              >
                Book a walkthrough
              </Link>
              <a
                href={login}
                onClick={closeMobile}
                className={cn(ctaSecondaryClass, "h-12 text-[0.92rem]")}
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

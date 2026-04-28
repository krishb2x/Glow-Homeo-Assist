import Link from "next/link";
import { BRAND_NAME } from "../lib/brand";

export function LandingHeader(): JSX.Element {
  return (
    <header className="landing-header-sticky">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:h-[4.25rem] sm:px-6 md:h-[4.5rem] md:px-10">
        {/* Brand */}
        <Link
          href="/"
          className="shrink-0 font-heading text-[0.97rem] font-semibold tracking-[-0.02em] text-slate-900 transition hover:text-slate-700 sm:text-[1.02rem]"
        >
          {BRAND_NAME}
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Primary">
          {[
            { href: "#features", label: "Features" },
            { href: "#consultation", label: "How it works" },
            { href: "#faq", label: "FAQ" },
            { href: "#book-demo", label: "Contact" }
          ].map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-full px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100/80 hover:text-slate-900"
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* Right actions */}
        <nav className="flex shrink-0 items-center gap-1.5" aria-label="Account">
          <Link
            href="/login"
            className="hidden rounded-full px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100/80 hover:text-slate-900 sm:inline-flex sm:min-h-9 sm:items-center"
          >
            Log in
          </Link>
          <a
            href="#book-demo"
            className="hidden rounded-full border border-slate-200/90 bg-white/90 px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 md:inline-flex md:min-h-9 md:items-center"
          >
            Book demo
          </a>
          <span className="marketing-btn-glow-wrap marketing-btn-glow-wrap--nav">
            <Link
              href="/login?requestAccess=true"
              className="marketing-btn-glow-inner marketing-btn-glow-inner--sm whitespace-nowrap"
            >
              <span className="sm:hidden">Get access</span>
              <span className="hidden sm:inline">Request access</span>
            </Link>
          </span>
        </nav>
      </div>
    </header>
  );
}

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { BRAND_NAME } from "../../lib/brand";
import { cn } from "../../lib/cn";
import {
  AUTH_BACK_HOME_HREF,
  AUTH_BACK_HOME_LABEL,
  AUTH_FOOTER_LINKS,
  AUTH_PANEL_HIGHLIGHTS,
  authFooterYear
} from "../../lib/auth-shell-config";

type AuthShellProps = {
  /** Slim eyebrow above the page title (e.g. "Sign in"). */
  eyebrow?: string;
  /** Main heading rendered above the form panel. */
  title: string;
  /** Optional supporting copy under the heading. */
  description?: ReactNode;
  /** Tagline shown on the desktop brand panel — overrides the default. */
  panelTagline?: string;
  /** When false, hides the right-side brand panel (e.g. for short flows). */
  showBrandPanel?: boolean;
  /** Form/content placed inside the right-side card. */
  children: ReactNode;
  /** Optional secondary action under the form (e.g. "Need access?"). */
  footerSlot?: ReactNode;
};

export function AuthShell({
  eyebrow,
  title,
  description,
  panelTagline,
  showBrandPanel = true,
  children,
  footerSlot
}: AuthShellProps): JSX.Element {
  return (
    <div className="relative flex min-h-screen flex-col bg-gradient-to-b from-[#f5fbf9] via-white to-white text-slate-900">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="z-10 border-b border-slate-100/80 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6 md:px-10">
          <Link
            href={AUTH_BACK_HOME_HREF}
            className="font-heading text-[0.98rem] font-semibold tracking-[-0.018em] text-slate-900 transition-colors hover:text-hs-primary"
            aria-label={`${BRAND_NAME} — home`}
          >
            {BRAND_NAME}
          </Link>
          <Link
            href={AUTH_BACK_HOME_HREF}
            className={cn(
              "inline-flex min-h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[0.82rem] font-semibold text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:text-hs-primary",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hs-primary/35 focus-visible:ring-offset-2"
            )}
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden />
            <span>{AUTH_BACK_HOME_LABEL}</span>
          </Link>
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────────────── */}
      <main
        id="main-content"
        className="relative flex flex-1 items-center justify-center px-4 py-10 sm:px-6 sm:py-14 md:py-16"
      >
        <div
          className={cn(
            "relative w-full",
            showBrandPanel
              ? "mx-auto grid max-w-5xl items-stretch gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-12"
              : "mx-auto max-w-md"
          )}
        >
          {/* Brand panel (desktop only) */}
          {showBrandPanel ? (
            <aside
              aria-hidden="true"
              className="relative hidden overflow-hidden rounded-3xl bg-gradient-to-br from-[#0a4a40] via-[#0e7c66] to-[#13a085] p-10 text-white shadow-[0_24px_60px_-30px_rgba(10,85,71,0.55)] lg:flex lg:flex-col lg:justify-between"
            >
              <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-teal-200/15 blur-3xl" />

              <div className="relative">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.1] px-3 py-1 text-[0.7rem] font-bold uppercase tracking-[0.16em] text-white/90">
                  <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden />
                  Clinic workspace
                </span>
                <h2 className="font-heading mt-6 text-balance text-[1.8rem] font-semibold leading-tight tracking-tight">
                  {panelTagline ?? "The clinical operating system for homeopathy doctors."}
                </h2>
                <p className="mt-4 max-w-sm text-[0.92rem] leading-relaxed text-white/80">
                  Built with practising homeopaths, every part of the workspace mirrors how you
                  already take cases — only faster, with nothing slipping through.
                </p>
              </div>

              <ul className="relative mt-10 space-y-3 text-[0.86rem] text-white/85">
                {AUTH_PANEL_HIGHLIGHTS.map((h) => (
                  <li key={h} className="flex items-start gap-2.5">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white/70" />
                    {h}
                  </li>
                ))}
              </ul>
            </aside>
          ) : null}

          {/* Form panel */}
          <section
            className={cn(
              "relative rounded-3xl border border-slate-200/80 bg-white/95 p-7 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.18)] backdrop-blur-sm sm:p-9",
              showBrandPanel ? "lg:p-10" : ""
            )}
            aria-label={title}
          >
            {eyebrow ? (
              <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-hs-primary">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="font-heading mt-2 text-balance text-[1.5rem] font-semibold leading-tight tracking-tight text-slate-900 sm:text-[1.7rem]">
              {title}
            </h1>
            {description ? (
              <p className="mt-3 text-[0.9rem] leading-relaxed text-slate-500">{description}</p>
            ) : null}

            <div className="mt-7">{children}</div>

            {footerSlot ? (
              <div className="mt-7 border-t border-slate-100 pt-6 text-center text-[0.86rem] text-slate-500">
                {footerSlot}
              </div>
            ) : null}
          </section>
        </div>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-100/80 bg-white/80 px-4 py-6 sm:px-6 md:px-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-[0.78rem] text-slate-500 sm:flex-row">
          <p>© {authFooterYear()} {BRAND_NAME}. All rights reserved.</p>
          <nav aria-label="Auth footer" className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {AUTH_FOOTER_LINKS.map((l) =>
              l.href.startsWith("mailto:") ? (
                <a
                  key={l.href}
                  href={l.href}
                  className="transition-colors hover:text-hs-primary"
                >
                  {l.label}
                </a>
              ) : (
                <Link
                  key={l.href}
                  href={l.href}
                  className="transition-colors hover:text-hs-primary"
                >
                  {l.label}
                </Link>
              )
            )}
          </nav>
        </div>
      </footer>
    </div>
  );
}

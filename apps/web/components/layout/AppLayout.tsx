"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, LayoutGroup } from "framer-motion";
import { LogOut, Search, Settings, User, ChevronDown, LifeBuoy } from "lucide-react";
import { ConnectionStatusBar } from "../clinic/ConnectionStatusBar";
import { openCommandPalette } from "../clinic/GlobalCommandPalette";
import { BRAND_NAME } from "../../lib/brand";
import { cn } from "../../lib/cn";
import { isMainNavActive, type NavItem } from "../../lib/nav-config";

const SIDEBAR_W = "w-[200px]";
const SIDEBAR_PL = "pl-[200px]";

function initials(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return "DR";
  if (p.length === 1) return p[0]!.slice(0, 2).toUpperCase();
  return `${p[0]![0]!}${p[p.length - 1]![0]!}`.toUpperCase();
}

type AppLayoutMode = "app" | "session";

export type AppLayoutProps = {
  children: ReactNode;
  pathname: string;
  mode: AppLayoutMode;
  clinicId: string | null;
  doctorName: string;
  onLogout: () => void;
  /** When true, main content fills remaining viewport below the top bar (live consultation). */
  mainFullBleed?: boolean;
  mainMaxClass: string;
  /**
   * Kept for back-compat; the new top bar no longer renders the New patient
   * button — it lives on the dashboard / patients list instead.
   */
  hideNewPatient?: boolean;
  /** Left sidebar main links (role-based). */
  navItems: NavItem[];
  /** Short line under app name; optional clinic switcher. */
  clinicContextLabel?: string;
  /** e.g. SUPER_ADMIN clinic <select> in sidebar. */
  clinicSelector?: ReactNode;
  /** Top bar: active clinic (platform mode); shown before connection/search. */
  headerLeading?: ReactNode;
  /** When false, hide doctor keyboard hints in the sidebar footer. */
  showSidebarKeyboardHints?: boolean;
};

function ProfileMenu({
  doctorName,
  onLogout
}: {
  doctorName: string;
  onLogout: () => void;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-transparent px-1.5 py-1 text-body-sm transition hover:border-hs-border/40 hover:bg-hs-cream/60"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-hs-border/30 bg-hs-primary-very-light/90 text-caption-sm font-bold text-hs-primary">
          {initials(doctorName)}
        </span>
        <span
          className="hidden max-w-[140px] truncate font-semibold text-hs-ink xl:inline"
          title={doctorName}
        >
          {doctorName}
        </span>
        <ChevronDown
          className={cn("h-3.5 w-3.5 text-hs-text-tertiary transition", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {open ? (
        <div
          role="menu"
          aria-label="Account"
          className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-hs-border/40 bg-hs-paper shadow-ds-lg"
        >
          <div className="border-b border-hs-border/25 px-4 py-3">
            <p className="truncate text-body-sm font-semibold text-hs-ink" title={doctorName}>
              {doctorName}
            </p>
            <p className="text-caption-sm text-hs-text-tertiary">Account</p>
          </div>
          <ul className="py-1 text-body-sm">
            <li>
              <Link
                href="/settings"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-hs-ink transition hover:bg-hs-cream/70"
              >
                <User className="h-4 w-4 text-hs-text-secondary" aria-hidden />
                Profile
              </Link>
            </li>
            <li>
              <Link
                href="/clinic-settings"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-hs-ink transition hover:bg-hs-cream/70"
              >
                <Settings className="h-4 w-4 text-hs-text-secondary" aria-hidden />
                Clinic settings
              </Link>
            </li>
            <li>
              <a
                href="mailto:support@glowhomeo.com"
                role="menuitem"
                className="flex items-center gap-2.5 px-4 py-2 text-hs-ink transition hover:bg-hs-cream/70"
              >
                <LifeBuoy className="h-4 w-4 text-hs-text-secondary" aria-hidden />
                Help & support
              </a>
            </li>
          </ul>
          <div className="border-t border-hs-border/25 py-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-body-sm font-medium text-hs-text-secondary transition hover:bg-hs-cream/70 hover:text-hs-ink"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Log out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DevBanner() {
  if (process.env.NODE_ENV === "production") return null;
  return (
    <div className="bg-[#faeeda] text-[#633806] text-[11px] font-semibold tracking-wide text-center py-1 absolute top-0 w-full z-50">
      DEVELOPMENT / TEST ENVIRONMENT
    </div>
  );
}

/**
 * Desktop clinic workspace (≥1200px): fixed 240px sidebar, unified top bar, token spacing.
 * No mobile navigation — this shell targets examination-room / desk displays.
 */
export function AppLayout({
  children,
  pathname,
  mode,
  clinicId,
  doctorName,
  onLogout,
  mainMaxClass,
  navItems,
  clinicContextLabel,
  clinicSelector,
  headerLeading,
  showSidebarKeyboardHints = true,
  mainFullBleed = false
}: AppLayoutProps): JSX.Element {
  if (mode === "session") {
    return (
      <div
        className="flex h-screen min-w-0 flex-col bg-[#f8f8f6] md:min-w-[1024px]"
        style={{ ["--header-h" as string]: "3rem" }}
      >
        <header className="grid h-12 shrink-0 grid-cols-[auto_1fr_auto] items-center gap-4 border-b border-black/[0.06] bg-white/80 px-4 backdrop-blur-xl sm:px-5">
          <Link
            href="/dashboard"
            className="text-[0.8125rem] font-medium text-neutral-500 transition duration-200 hover:text-neutral-900"
          >
            ← Dashboard
          </Link>
          <div className="flex items-center justify-center gap-2.5">
            <ConnectionStatusBar />
            <button
              type="button"
              onClick={() => openCommandPalette()}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[0.8125rem] font-medium text-neutral-500 transition duration-200 hover:bg-black/[0.04] hover:text-neutral-800"
            >
              <Search className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden sm:inline">Search</span>
              <kbd className="hidden font-mono text-[0.625rem] text-neutral-400 sm:inline">⌘K</kbd>
            </button>
          </div>
          <div className="flex items-center justify-end">
            <ProfileMenu doctorName={doctorName} onLogout={onLogout} />
          </div>
        </header>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <main className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</main>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex overflow-hidden bg-[#f8fdf9]">
      <DevBanner />
      <aside
        className={cn("fixed left-0 top-0 z-40 flex h-full flex-col bg-[#0a1f1a] py-6 shadow-xl", SIDEBAR_W)}
        style={{ marginTop: process.env.NODE_ENV === "production" ? "0" : "24px" }}
        aria-label="Main navigation"
      >
        <div className="px-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[rgba(255,255,255,0.35)]">GLOWHOMEO</p>
          <p className="mt-1 truncate text-[13px] font-[600] text-white" title={clinicContextLabel ?? clinicId ?? undefined}>
            {clinicContextLabel ?? (clinicId ? `Clinic ${clinicId.slice(0, 8)}…` : "Doctor's Clinic")}
          </p>
          {clinicSelector ? <div className="mt-3 max-w-full text-white">{clinicSelector}</div> : null}
        </div>
        <LayoutGroup>
          <nav className="mt-6 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3" aria-label="Sections">
            {navItems.map((item) => {
              const active = isMainNavActive(item.href, pathname);
              const Icon = item.Icon;
              // Add badges later if possible via props
              return (
                <div key={item.href} className="relative">
                  <Link
                    href={item.href}
                    className={
                      "relative z-10 flex items-center gap-3 rounded-[8px] px-[10px] py-[8px] text-[13px] font-medium transition-colors duration-200 " +
                      (active
                        ? "bg-[rgba(14,124,102,0.35)] text-white"
                        : "text-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.07)] hover:text-white")
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                    {item.label}
                  </Link>
                </div>
              );
            })}
          </nav>
        </LayoutGroup>
        <div className="shrink-0 space-y-1.5 border-t border-[rgba(255,255,255,0.1)] px-4 py-4 text-white">
          <div className="flex items-center gap-3 group cursor-pointer transition">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(255,255,255,0.15)] text-[11px] font-bold text-emerald-300">
              {initials(doctorName)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-[600] text-white" title={doctorName}>{doctorName}</p>
              <p className="text-[11px] text-[rgba(255,255,255,0.4)]">Doctor</p>
            </div>
            <ChevronDown className="h-4 w-4 text-[rgba(255,255,255,0.3)] transition group-hover:text-white" />
          </div>
        </div>
      </aside>

      <div className={cn("flex flex-1 flex-col overflow-hidden", SIDEBAR_PL)} style={{ paddingTop: process.env.NODE_ENV === "production" ? "0" : "24px" }}>
        <header className="shrink-0 border-b border-black/[0.05] bg-white h-[44px] flex items-center">
          <div className="mx-auto flex h-full w-full max-w-full items-center justify-between gap-4 px-6">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              {headerLeading ? <div className="shrink-0">{headerLeading}</div> : null}
              <span className="text-[12px] font-medium text-slate-400">
                {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
              </span>
              <ConnectionStatusBar disconnectedOnly />
            </div>
            <div className="ml-auto flex items-center gap-3">
              <button
                type="button"
                onClick={() => openCommandPalette()}
                className="inline-flex h-8 items-center gap-2 rounded-md bg-slate-100/60 px-3 text-[12px] font-medium text-slate-500 transition duration-200 hover:bg-slate-200/60 hover:text-slate-700 border border-slate-200/50"
                aria-label="Search (Ctrl+K)"
              >
                <Search className="h-3.5 w-3.5 text-slate-400" strokeWidth={2.25} />
                <span className="hidden lg:inline">Search</span>
                <kbd className="ml-2 hidden rounded border border-slate-300 bg-white px-1 text-[10px] font-mono text-slate-400 lg:inline">⌘K</kbd>
              </button>
              {/* Tooltip for help could go here, for now a help icon */}
              <button className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition" title="Shortcuts: N=new, C=consult, ⌘K=search">
                <span className="text-[13px] font-bold font-serif">?</span>
              </button>
              <div className="hidden">
                <ProfileMenu doctorName={doctorName} onLogout={onLogout} />
              </div>
            </div>
          </div>
        </header>

        <div className={cn("min-h-0 flex-1 flex overflow-hidden bg-[#f8fdf9]")}>
          <main className={cn("flex flex-1 min-h-0 w-full flex-col overflow-y-auto")}>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

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

const SIDEBAR_W = "w-[240px]";
const SIDEBAR_PL = "pl-[240px]";

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
  showSidebarKeyboardHints = true
}: AppLayoutProps): JSX.Element {
  if (mode === "session") {
    return (
      <div
        className="flex min-w-[1024px] h-screen flex-col bg-hs-cream"
        style={{ ["--header-h" as string]: "3.5rem" }}
      >
        <header className="grid h-14 shrink-0 grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-hs-border/60 bg-hs-paper px-ds-lg">
          <Link href="/dashboard" className="text-body-sm font-medium text-hs-primary transition duration-200 hover:underline">
            ← Home
          </Link>
          <div className="flex items-center justify-center gap-3">
            <span className="text-caption-sm font-medium uppercase tracking-wider text-hs-text-tertiary">Live visit</span>
            <ConnectionStatusBar />
            <button
              type="button"
              onClick={() => openCommandPalette()}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-hs-border/50 bg-hs-cream/80 px-3 text-body-sm font-medium text-hs-text-secondary transition duration-200 hover:border-hs-primary/30 hover:text-hs-ink"
            >
              <Search className="h-4 w-4" />
              <span>Search</span>
              <kbd className="font-mono text-[0.65rem] text-hs-text-tertiary">⌘K</kbd>
            </button>
          </div>
          <div className="flex items-center justify-end gap-2">
            <div className="mr-1 flex h-9 w-9 items-center justify-center rounded-full border border-hs-border/30 bg-hs-primary-very-light/80 text-caption-sm font-bold text-hs-primary">
              {initials(doctorName)}
            </div>
            <span className="max-w-[160px] truncate text-body-sm font-medium text-hs-ink" title={doctorName}>
              {doctorName}
            </span>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-hs-border/80 px-2 text-body-sm font-medium text-hs-text-secondary transition duration-200 hover:border-hs-primary/40 hover:text-hs-ink"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-hidden">
          <main className="h-full w-full">{children}</main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-w-[1024px] bg-hs-surface">
      <aside
        className={cn("fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-hs-border/30 bg-hs-paper/98 py-6 shadow-ds-sm", SIDEBAR_W)}
        aria-label="Main navigation"
      >
        <div className="px-5">
          <p className="text-caption-sm font-semibold uppercase tracking-[0.12em] text-hs-text-tertiary">{BRAND_NAME}</p>
          <p className="mt-0.5 truncate text-body-sm font-medium text-hs-ink" title={clinicContextLabel ?? clinicId ?? undefined}>
            {clinicContextLabel ?? (clinicId ? `Clinic ${clinicId.slice(0, 8)}…` : "Clinic workspace")}
          </p>
          {clinicSelector ? <div className="mt-3 max-w-full">{clinicSelector}</div> : null}
        </div>
        <LayoutGroup>
          <nav className="mt-6 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-3" aria-label="Sections">
            {navItems.map((item) => {
              const active = isMainNavActive(item.href, pathname);
              const Icon = item.Icon;
              return (
                <div key={item.href} className="relative">
                  {active ? (
                    <motion.div
                      layoutId="sidebar-pill"
                      className="absolute inset-0 rounded-2xl bg-hs-primary-very-light/90 shadow-ds-sm"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  ) : null}
                  <Link
                    href={item.href}
                    className={
                      "relative z-10 flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-body-sm font-medium transition-colors duration-200 " +
                      (active
                        ? "text-hs-primary"
                        : "text-hs-text-secondary hover:bg-hs-cream/90 hover:text-hs-ink")
                    }
                  >
                    <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} aria-hidden />
                    {item.label}
                  </Link>
                </div>
              );
            })}
          </nav>
        </LayoutGroup>
        <div className="shrink-0 space-y-1.5 border-t border-hs-border/25 px-4 py-3 text-typo-small text-hs-text-tertiary">
          <p>Signed in as</p>
          <p className="truncate text-body-sm font-medium text-hs-ink" title={doctorName}>
            {doctorName}
          </p>
          {showSidebarKeyboardHints ? (
            <p className="text-[0.65rem] leading-snug text-hs-text-tertiary/90">
              <kbd className="rounded border border-hs-border/50 px-0.5 font-sans">N</kbd> new patient ·{" "}
              <kbd className="rounded border border-hs-border/50 px-0.5 font-sans">C</kbd> consult ·{" "}
              <kbd className="rounded border border-hs-border/50 px-0.5 font-sans">⌘K</kbd> search
            </p>
          ) : null}
        </div>
      </aside>

      <div className={cn("flex min-h-screen min-w-0 flex-col", SIDEBAR_PL)}>
        <header className="shrink-0 border-b border-hs-border/40 bg-hs-paper/95">
          <div className="mx-auto flex h-16 w-full max-w-full items-center justify-between gap-4 px-ds-lg">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              {headerLeading ? <div className="shrink-0">{headerLeading}</div> : null}
              <ConnectionStatusBar />
            </div>
            <div className="ml-auto flex items-center gap-3">
              <button
                type="button"
                onClick={() => openCommandPalette()}
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-hs-border/50 bg-hs-cream/70 px-3.5 text-body-sm font-medium text-hs-ink transition duration-200 hover:border-hs-primary/40 hover:bg-hs-paper"
                aria-label="Search (Ctrl+K)"
              >
                <Search className="h-4 w-4 text-hs-text-secondary" strokeWidth={2.25} />
                <span className="hidden lg:inline">Search</span>
                <kbd className="ml-1 hidden text-[0.65rem] font-mono text-hs-text-tertiary lg:inline">⌘K</kbd>
              </button>
              <ProfileMenu doctorName={doctorName} onLogout={onLogout} />
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-hs-cream/30">
          <main
            className={cn(
              "mx-auto w-full px-5 py-6 lg:px-8 lg:py-7",
              mainMaxClass
            )}
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

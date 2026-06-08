"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronDown } from "lucide-react";
import { BRAND, NAV_LINKS } from "@/lib/constants";
import MobileMenu from "./MobileMenu";

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Hide header on dashboard routes
  const isDashboardRoute = pathname.startsWith('/admin') || pathname.startsWith('/partner-dashboard') || pathname.startsWith('/partner-login') || pathname.startsWith('/ebooks');

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (isDashboardRoute) return null;

  return (
    <>
      <header
        className={`sticky top-0 z-40 w-full transition-all duration-300 ${
          isScrolled
            ? "bg-white/90 shadow-sm backdrop-blur-md"
            : "bg-mt-bg/80 backdrop-blur-sm"
        }`}
      >
        <div className="mx-auto flex h-20 max-w-container items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link href="/" className="flex flex-col justify-center" aria-label="Home">
            <span className="font-display text-2xl font-bold tracking-tight text-mt-primary leading-none">
              {BRAND.name}
            </span>
            <span className="block text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-mt-secondary mt-1">
              by {BRAND.doctor}
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-8 lg:flex">
            {NAV_LINKS.map((link) => {
              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);

              const hasChildren = "children" in link && link.children;

              return (
                <div key={link.href} className="group relative">
                  <Link
                    href={link.href}
                    className={`flex items-center gap-1 text-sm font-medium transition-colors hover:text-mt-primary ${
                      isActive ? "text-mt-primary" : "text-mt-text-secondary"
                    }`}
                  >
                    {link.label}
                    {hasChildren && <ChevronDown className="h-4 w-4" />}
                  </Link>

                  {/* Dropdown Menu */}
                  {hasChildren && (
                    <div className="invisible absolute left-1/2 top-full mt-2 w-56 -translate-x-1/2 opacity-0 transition-all group-hover:visible group-hover:mt-0 group-hover:opacity-100">
                      <div className="mt-2 rounded-xl border border-mt-border/50 bg-white p-2 shadow-card">
                        {(link as any).children.map((child: { href: string; label: string }) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            className="block rounded-lg px-4 py-2 text-sm text-mt-text-secondary transition-colors hover:bg-mt-primary-bg hover:text-mt-primary"
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* CTA & Mobile Toggle */}
          <div className="flex items-center gap-4">
            <Link
              href="/book-consultation"
              className="hidden rounded-lg bg-mt-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-mt-primary-light lg:inline-block"
            >
              Book Consultation
            </Link>

            <button
              type="button"
              className="rounded-lg p-2 text-mt-text-secondary hover:bg-mt-primary-bg hover:text-mt-primary lg:hidden"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open main menu"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <MobileMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
    </>
  );
}


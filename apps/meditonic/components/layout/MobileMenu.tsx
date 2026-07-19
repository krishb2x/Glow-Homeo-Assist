"use client";

import { useEffect } from "react";
import Link from "next/link";
import { X, ChevronRight } from "lucide-react";
import { BRAND, NAV_LINKS } from "../../lib/constants";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  // Prevent scrolling when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Menu Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-white shadow-2xl animate-fade-in">
        <div className="flex h-20 items-center justify-between px-4 sm:px-6">
          <span className="font-display text-xl font-bold text-mt-primary">
            {BRAND.name}
          </span>
          <button
            type="button"
            className="rounded-lg p-2 text-mt-text-secondary hover:bg-mt-primary-bg hover:text-mt-primary"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="h-[calc(100vh-80px)] overflow-y-auto px-4 py-6 sm:px-6">
          <nav className="flex flex-col gap-6">
            {NAV_LINKS.map((link) => {
              const hasChildren = "children" in link && link.children;

              return (
                <div key={link.href}>
                  <Link
                    href={link.href}
                    className="flex items-center justify-between text-lg font-semibold text-mt-text hover:text-mt-primary"
                    onClick={onClose}
                  >
                    {link.label}
                    {hasChildren && (
                      <ChevronRight className="h-5 w-5 text-mt-text-tertiary" />
                    )}
                  </Link>

                  {hasChildren && (
                    <div className="mt-3 flex flex-col gap-3 pl-4 border-l-2 border-mt-border">
                      {(link as any).children.map((child: { href: string; label: string }) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className="text-base text-mt-text-secondary hover:text-mt-primary"
                          onClick={onClose}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <div className="mt-8 border-t border-mt-border pt-8">
            <Link
              href="/store"
              className="flex w-full items-center justify-center rounded-xl bg-mt-primary px-6 py-4 text-base font-semibold text-white shadow-md transition-all hover:bg-mt-primary-light active:scale-[0.98]"
              onClick={onClose}
            >
              Shop Best Sellers
            </Link>
            <p className="mt-4 text-center text-sm text-mt-text-tertiary">
              Need help? WhatsApp us at <br />
              <a
                href={`https://wa.me/${BRAND.whatsapp.replace(/\D/g, "")}?text=Hello%20MediTonic,%20I%20would%20like%20to%20know%20more%20about%20your%20books.`}
                className="font-medium text-mt-primary hover:underline"
              >
                {BRAND.whatsapp}
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


import Link from "next/link";
import type { ReactNode } from "react";
import { BRAND_NAME } from "../../lib/brand";
import { PUBLIC_APP_LOGIN_URL } from "../../lib/public-intake";

export function IntakeShell({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="min-h-screen bg-[rgb(248,250,249)] text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
          <Link
            href="/"
            className="min-h-10 shrink-0 rounded-lg px-2 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-hs-primary"
          >
            ← Back
          </Link>
          <Link href="/" className="truncate font-heading text-sm font-semibold tracking-tight text-slate-900 sm:text-base">
            {BRAND_NAME}
          </Link>
          <a
            href={PUBLIC_APP_LOGIN_URL}
            className="min-h-10 shrink-0 rounded-lg px-2 py-2 text-sm font-semibold text-hs-primary transition hover:bg-hs-primary/5 hover:underline"
          >
            Log in
          </a>
        </div>
      </header>
      {children}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { AuthShell } from "../../components/auth/AuthShell";
import { getPublicSiteUrl, getSupabaseBrowser } from "../../lib/supabase-browser";

function ButtonSpinner({ className }: { className?: string }): JSX.Element {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

const INPUT_CLASS =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[0.95rem] text-slate-900 " +
  "placeholder:text-slate-400 outline-none transition-shadow " +
  "focus:border-hs-primary/50 focus:ring-4 focus:ring-hs-primary/15";

export default function ForgotPasswordPage(): JSX.Element {
  const [email, setEmail] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    setFormError(null);
    const em = email.trim();
    if (!em || !em.includes("@")) {
      setFormError("Please enter a valid email address.");
      return;
    }
    startTransition(() => {
      void (async () => {
        try {
          const supabase = getSupabaseBrowser();
          const redirectTo = `${getPublicSiteUrl()}/update-password`;
          const { error } = await supabase.auth.resetPasswordForEmail(em, { redirectTo });
          if (error) {
            setFormError("We could not start the reset. Check the email or try again later.");
            return;
          }
          setDone(true);
        } catch {
          setFormError(
            "This page requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY. If you are a developer, add them to your .env file."
          );
        }
      })();
    });
  }

  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Reset your password"
      description="Enter your clinic email and we'll send a secure link to choose a new password. The link opens this workspace."
      panelTagline="Account safety, built into the workspace."
      footerSlot={
        <p>
          <Link href="/login" className="font-semibold text-hs-primary hover:underline">
            ← Back to sign in
          </Link>
        </p>
      }
    >
      {done ? (
        <div
          className="rounded-xl border border-hs-primary/25 bg-hs-primary-very-light/60 px-4 py-4 text-[0.92rem] leading-relaxed text-hs-primary-dark"
          role="status"
        >
          <p className="font-semibold">Check your inbox.</p>
          <p className="mt-1 text-slate-700">
            We sent a reset link to <span className="font-medium">{email}</span>. It may take a
            minute to arrive — don't forget to check spam.
          </p>
        </div>
      ) : (
        <>
          {formError ? (
            <div
              className="mb-5 rounded-xl border border-rose-200/80 bg-rose-50/90 px-4 py-3 text-[0.88rem] text-rose-900/90"
              role="alert"
            >
              {formError}
            </div>
          ) : null}
          <form onSubmit={onSubmit} className="grid gap-4">
            <label className="grid gap-1.5">
              <span className="text-[0.85rem] font-semibold text-slate-700">Email</span>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@clinic.com"
                className={INPUT_CLASS}
              />
            </label>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-hs-primary px-4 py-3 text-[0.95rem] font-semibold text-white shadow-[0_10px_28px_-12px_rgba(14,124,102,0.55)] transition-colors hover:bg-hs-primary-dark focus:outline-none focus:ring-4 focus:ring-hs-primary/25 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-75"
            >
              {pending ? (
                <>
                  <ButtonSpinner className="h-4 w-4 animate-spin text-white" />
                  <span>Sending…</span>
                </>
              ) : (
                "Send reset link"
              )}
            </button>
          </form>
        </>
      )}
    </AuthShell>
  );
}

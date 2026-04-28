"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
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

export default function ForgotPasswordPage(): JSX.Element {
  const [email, setEmail] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const inputClass =
    "w-full rounded-md border border-stone-100 bg-white px-4 py-2.5 text-hs-ink " +
    "placeholder:text-hs-text-tertiary outline-none transition " +
    "focus:border-hs-primary/50 focus:ring-2 focus:ring-hs-primary/15";

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
    <main className="min-h-screen bg-white font-sans">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12 sm:px-8">
        <section
          className="rounded-2xl border border-stone-100 bg-white p-8"
          aria-labelledby="forgot-heading"
        >
          <h1 id="forgot-heading" className="font-heading text-2xl font-medium text-hs-ink">
            Forgot password
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-hs-text-secondary">
            Enter your work email. We will send a link to choose a new password. The link opens this app — add this URL in Supabase Auth → URL configuration if needed.
          </p>

          {done ? (
            <p
              className="mt-6 rounded-md border border-hs-border bg-hs-primary-very-light/60 px-4 py-3 text-sm text-hs-ink"
              role="status"
            >
              Check your email. We sent a reset link; it may take a minute to arrive.
            </p>
          ) : (
            <>
              {formError ? (
                <div
                  className="mt-5 rounded-md border border-rose-200/80 bg-rose-50/90 px-4 py-3 text-sm text-rose-900/90"
                  role="alert"
                >
                  {formError}
                </div>
              ) : null}
              <form onSubmit={onSubmit} className="mt-6 grid gap-4">
                <label className="grid gap-1.5">
                  <span className="text-sm font-medium text-hs-ink">Email</span>
                  <input
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                  />
                </label>
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-hs-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-hs-primary-dark focus:outline-none focus:ring-2 focus:ring-hs-primary/25 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-75"
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

          <p className="mt-6 text-center text-sm">
            <Link href="/login" className="font-medium text-hs-primary underline-offset-2 hover:underline">
              ← Back to sign in
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}

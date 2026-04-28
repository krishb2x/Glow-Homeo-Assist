"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, useTransition } from "react";
import { fetchStaffAuthMe } from "../../lib/staff-session";
import { getSupabaseBrowser } from "../../lib/supabase-browser";

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

function UpdatePasswordForm(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);
  const [prepError, setPrepError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  const inputClass =
    "w-full rounded-md border border-stone-100 bg-white px-4 py-2.5 text-hs-ink " +
    "placeholder:text-hs-text-tertiary outline-none transition " +
    "focus:border-hs-primary/50 focus:ring-2 focus:ring-hs-primary/15";

  const source = searchParams.get("source") ?? "";

  useEffect(() => {
    void (async () => {
      try {
        const supabase = getSupabaseBrowser();
        if (typeof window !== "undefined" && window.location.search.includes("code=")) {
          const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
          if (error) {
            setPrepError("This link is invalid or has expired. Request a new reset email from the sign-in page.");
            return;
          }
          const path = window.location.pathname + (window.location.hash ?? "");
          window.history.replaceState({}, document.title, path);
        }
        const {
          data: { session }
        } = await supabase.auth.getSession();
        if (!session) {
          setPrepError("No active session. Open the link from your email, or sign in to continue.");
          return;
        }
        setReady(true);
      } catch (e) {
        setPrepError(
          e instanceof Error
            ? e.message
            : "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to use password setup."
        );
      }
    })();
  }, []);

  function onSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    setFormError(null);
    if (password.length < 8) {
      setFormError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setFormError("Passwords do not match.");
      return;
    }
    startTransition(() => {
      void (async () => {
        try {
          const supabase = getSupabaseBrowser();
          const { error } = await supabase.auth.updateUser({ password });
          if (error) {
            setFormError("Could not update the password. Try a stronger password or use a new reset link.");
            return;
          }
          const {
            data: { session }
          } = await supabase.auth.getSession();
          const accessToken = session?.access_token;
          if (!accessToken) {
            setFormError("Session lost after update. Please sign in with your new password.");
            return;
          }
          const me = await fetchStaffAuthMe(accessToken);
          if (me.role === "PATIENT") {
            await supabase.auth.signOut();
            setFormError("This app is for clinic staff. Please use the mobile app for your account.");
            return;
          }
          localStorage.setItem("ha_token", accessToken);
          localStorage.setItem("ha_role", me.role.toLowerCase());
          localStorage.setItem("ha_clinic_id", me.clinicId ?? "");
          setSuccess(true);
          setTimeout(() => {
            router.replace("/dashboard");
            router.refresh();
          }, 800);
        } catch (err) {
          setFormError(err instanceof Error ? err.message : "Something went wrong.");
        }
      })();
    });
  }

  if (prepError) {
    return (
      <div>
        <p className="text-sm text-rose-800" role="alert">
          {prepError}
        </p>
        <p className="mt-4 text-center text-sm">
          <Link href="/login" className="font-medium text-hs-primary underline-offset-2 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  if (!ready) {
    return <p className="text-sm text-hs-text-secondary">Preparing…</p>;
  }

  if (success) {
    return (
      <p
        className="rounded-md border border-hs-border bg-hs-primary-very-light/60 px-4 py-3 text-sm text-hs-ink"
        role="status"
      >
        Password updated successfully. Taking you to your workspace…
      </p>
    );
  }

  return (
    <div>
      {source ? (
        <p className="mb-2 text-sm text-hs-text-secondary">
          {source === "invite" ? "Complete your account by choosing a password." : "Choose a new password for your account."}
        </p>
      ) : null}
      {formError ? (
        <div
          className="mb-4 rounded-md border border-rose-200/80 bg-rose-50/90 px-4 py-3 text-sm text-rose-900/90"
          role="alert"
        >
          {formError}
        </div>
      ) : null}
      <form onSubmit={onSubmit} className="grid gap-4">
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-hs-ink">New password</span>
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-hs-ink">Confirm password</span>
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
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
              <span>Saving…</span>
            </>
          ) : (
            "Save password"
          )}
        </button>
      </form>
    </div>
  );
}

export default function UpdatePasswordPage(): JSX.Element {
  return (
    <main className="min-h-screen bg-white font-sans">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12 sm:px-8">
        <section
          className="rounded-2xl border border-stone-100 bg-white p-8"
          aria-labelledby="update-pw-heading"
        >
          <h1 id="update-pw-heading" className="font-heading text-2xl font-medium text-hs-ink">
            Set your password
          </h1>
          <p className="mt-2 text-sm text-hs-text-secondary">Use at least 8 characters.</p>
          <div className="mt-6">
            <Suspense fallback={<p className="text-sm text-hs-text-secondary">Loading…</p>}>
              <UpdatePasswordForm />
            </Suspense>
          </div>
          <p className="mt-6 text-center text-sm">
            <Link href="/login" className="text-hs-text-secondary underline-offset-2 transition hover:text-hs-ink">
              Back to sign in
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { BRAND_NAME, CONTACT_EMAIL, CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL } from "../../lib/brand";
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

function mapSignInError(err: { message?: string } | null): string {
  if (!err?.message) return "Invalid email or password.";
  const m = err.message.toLowerCase();
  if (m.includes("invalid login") || m.includes("invalid") || m.includes("credential")) {
    return "Invalid email or password.";
  }
  if (m.includes("email not confirmed")) {
    return "Please confirm your email from the invite link, then try again.";
  }
  if (m.includes("rate")) {
    return "Too many attempts. Please wait a few minutes and try again.";
  }
  return "Sign-in failed. Check your credentials or use Forgot password.";
}

export default function LoginPage(): JSX.Element {
  const router = useRouter();
  const [showRequest, setShowRequest] = useState(false);
  const [postLoginPath, setPostLoginPath] = useState("/dashboard");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [bannerSuccess, setBannerSuccess] = useState<string | null>(null);

  const cardTitle = useMemo(() => (showRequest ? "Request access" : `Sign in to ${BRAND_NAME}`), [showRequest]);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setShowRequest(q.get("requestAccess") === "true");
    if (q.get("reason") === "session_expired") {
      setFormError("Your session has expired. Please sign in again.");
    } else if (q.get("reason") === "mobile") {
      setFormError("This app is for clinic staff only.");
    } else if (q.get("message") === "password_updated") {
      setBannerSuccess("Password updated. Sign in with your new password.");
    }
    const n = q.get("next");
    if (n && n.startsWith("/") && !n.startsWith("//")) {
      setPostLoginPath(n);
    }
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setFormError(null);
    setBannerSuccess(null);
    const em = String((e.currentTarget.elements.namedItem("email") as HTMLInputElement)?.value ?? "").trim();
    const pw = String((e.currentTarget.elements.namedItem("password") as HTMLInputElement)?.value ?? "");
    startTransition(() => {
      void (async () => {
        let supabase: ReturnType<typeof getSupabaseBrowser>;
        try {
          supabase = getSupabaseBrowser();
        } catch {
          setFormError("Configuration error — contact support.");
          return;
        }
        const { data, error } = await supabase.auth.signInWithPassword({ email: em, password: pw });
        if (error) {
          setFormError(mapSignInError(error));
          return;
        }
        const accessToken = data.session?.access_token;
        if (!accessToken) {
          setFormError("No session returned. Try again.");
          return;
        }
        try {
          const me = await fetchStaffAuthMe(accessToken);
          if (me.role === "PATIENT") {
            await supabase.auth.signOut();
            setFormError("This app is for clinic staff only.");
            return;
          }
          localStorage.setItem("ha_token", accessToken);
          localStorage.setItem("ha_role", me.role.toLowerCase());
          localStorage.setItem("ha_clinic_id", me.clinicId ?? "");
          router.push(postLoginPath);
          router.refresh();
        } catch (verifyErr) {
          await supabase.auth.signOut();
          const msg = verifyErr instanceof Error ? verifyErr.message : "Could not verify your account.";
          setFormError(msg.includes("Failed to fetch") ? "Cannot reach the backend server. Make sure the API is running." : msg);
        }
      })();
    });
  }

  const inputClass =
    "w-full rounded-md border border-stone-100 bg-white px-4 py-2.5 text-hs-ink " +
    "placeholder:text-hs-text-tertiary outline-none transition " +
    "focus:border-hs-primary/50 focus:ring-2 focus:ring-hs-primary/15";

  return (
    <main id="main-content" className="min-h-screen bg-white font-sans">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12 sm:px-8">
        <section
          className="rounded-2xl border border-stone-100 bg-white p-8"
          aria-labelledby="login-heading"
        >
          <h1 id="login-heading" className="font-heading text-2xl font-medium text-hs-ink">
            {cardTitle}
          </h1>

          {!showRequest ? (
            <>
              {bannerSuccess ? (
                <div
                  className="mt-5 rounded-md border border-hs-border bg-hs-primary-very-light/60 px-4 py-3 text-sm text-hs-ink"
                  role="status"
                >
                  {bannerSuccess}
                </div>
              ) : null}

              {formError ? (
                <div
                  className="mt-5 rounded-md border border-rose-200/80 bg-rose-50/90 px-4 py-3 text-sm text-rose-900/90"
                  role="alert"
                >
                  {formError}
                </div>
              ) : null}

              <form onSubmit={onSubmit} className="mt-6 grid gap-4">
                <div className="grid gap-1.5">
                  <label htmlFor="email" className="text-sm font-medium text-hs-ink">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>

                <div className="grid gap-1.5">
                  <label htmlFor="password" className="text-sm font-medium text-hs-ink">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`${inputClass} pr-11`}
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-hs-text-tertiary transition hover:text-hs-ink"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Link
                    href="/forgot-password"
                    className="text-sm font-medium text-hs-primary underline-offset-2 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={pending}
                  className="mt-1 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-hs-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-hs-primary-dark focus:outline-none focus:ring-2 focus:ring-hs-primary/25 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-75"
                >
                  {pending ? (
                    <>
                      <ButtonSpinner className="h-4 w-4 animate-spin text-white" />
                      <span>Signing in…</span>
                    </>
                  ) : (
                    "Sign in"
                  )}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-hs-text-secondary">
                Need access?{" "}
                <a
                  className="font-medium text-hs-primary underline-offset-2 hover:underline"
                  href="/login?requestAccess=true"
                >
                  Contact admin
                </a>
              </p>
            </>
          ) : (
            <div className="mt-5 space-y-3 text-sm text-hs-text-secondary">
              <p>To request clinic access, contact your administrator:</p>
              <p>
                <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-hs-primary hover:underline">
                  {CONTACT_EMAIL}
                </a>
              </p>
              <p>
                <a href={`tel:${CONTACT_PHONE_TEL}`} className="font-medium text-hs-primary hover:underline">
                  {CONTACT_PHONE_DISPLAY}
                </a>
              </p>
              <p className="pt-2">
                <a
                  className="font-medium text-hs-primary underline-offset-2 hover:underline"
                  href="/login"
                >
                  ← Back to sign in
                </a>
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

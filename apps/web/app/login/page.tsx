"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { AuthShell } from "../../components/auth/AuthShell";
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

const INPUT_CLASS =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[0.95rem] text-slate-900 " +
  "placeholder:text-slate-400 outline-none transition-shadow " +
  "focus:border-hs-primary/50 focus:ring-4 focus:ring-hs-primary/15";

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

  const eyebrow = useMemo(() => (showRequest ? "Access" : "Sign in"), [showRequest]);
  const title = useMemo(
    () => (showRequest ? "Request clinic access" : `Sign in to ${BRAND_NAME}`),
    [showRequest]
  );

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
          setFormError(
            msg.includes("Failed to fetch")
              ? "Cannot reach the backend server. Make sure the API is running."
              : msg
          );
        }
      })();
    });
  }

  const description = showRequest
    ? "Existing clinics can request access from their administrator."
    : "Welcome back. Sign in with your clinic credentials.";

  return (
    <AuthShell
      eyebrow={eyebrow}
      title={title}
      description={description}
      panelTagline="A calm clinic workspace, designed by practising homeopaths."
      footerSlot={
        showRequest ? (
          <p>
            <Link href="/login" className="font-semibold text-hs-primary hover:underline">
              ← Back to sign in
            </Link>
          </p>
        ) : (
          <p>
            Need access?{" "}
            <a
              className="font-semibold text-hs-primary hover:underline"
              href="/login?requestAccess=true"
            >
              Contact your administrator
            </a>
          </p>
        )
      }
    >
      {!showRequest ? (
        <>
          {bannerSuccess ? (
            <div
              className="mb-5 rounded-xl border border-hs-primary/25 bg-hs-primary-very-light/60 px-4 py-3 text-[0.88rem] text-hs-primary-dark"
              role="status"
            >
              {bannerSuccess}
            </div>
          ) : null}

          {formError ? (
            <div
              className="mb-5 rounded-xl border border-rose-200/80 bg-rose-50/90 px-4 py-3 text-[0.88rem] text-rose-900/90"
              role="alert"
            >
              {formError}
            </div>
          ) : null}

          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="grid gap-1.5">
              <label htmlFor="email" className="text-[0.85rem] font-semibold text-slate-700">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@clinic.com"
                className={INPUT_CLASS}
                required
              />
            </div>

            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-[0.85rem] font-semibold text-slate-700">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-[0.78rem] font-semibold text-hs-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${INPUT_CLASS} pr-11`}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={pending}
              className="mt-2 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-hs-primary px-4 py-3 text-[0.95rem] font-semibold text-white shadow-[0_10px_28px_-12px_rgba(14,124,102,0.55)] transition-colors hover:bg-hs-primary-dark focus:outline-none focus:ring-4 focus:ring-hs-primary/25 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-75"
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
        </>
      ) : (
        <div className="space-y-3 text-[0.92rem] text-slate-600">
          <p>To request clinic access, contact your administrator:</p>
          <p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-semibold text-hs-primary hover:underline"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
          <p>
            <a
              href={`tel:${CONTACT_PHONE_TEL}`}
              className="font-semibold text-hs-primary hover:underline"
            >
              {CONTACT_PHONE_DISPLAY}
            </a>
          </p>
        </div>
      )}
    </AuthShell>
  );
}

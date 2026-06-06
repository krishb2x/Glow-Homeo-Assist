"use client";

import Link from "next/link";
import { useEffect, useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Leaf, Check, ArrowRight, Loader2 } from "lucide-react";
import { fetchStaffAuthMe } from "../../lib/staff-session";
import { getSupabaseBrowser } from "../../lib/supabase-browser";

// Define a style tag for the autofill override and view transitions
const globalStyles = `
  input:-webkit-autofill {
    -webkit-box-shadow: 0 0 0 30px white inset !important;
  }
  ::view-transition-group(*),
  ::view-transition-old(*),
  ::view-transition-new(*) {
    animation-duration: 0.25s;
    animation-timing-function: cubic-bezier(0.19, 1, 0.22, 1);
  }
`;

function ButtonSpinner({ className }: { className?: string }): JSX.Element {
  return <Loader2 className={`animate-spin ${className || ""}`} aria-hidden="true" />;
}

export default function LoginPage(): JSX.Element {
  const router = useRouter();
  const [postLoginPath, setPostLoginPath] = useState("/dashboard");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus email field on page load
    emailInputRef.current?.focus();

    const q = new URLSearchParams(window.location.search);
    if (q.get("reason") === "session_expired") {
      setFormError("Your session has expired. Please sign in again.");
    }
    const n = q.get("next");
    if (n && n.startsWith("/") && !n.startsWith("//")) {
      setPostLoginPath(n);
    }
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setFormError(null);
    startTransition(() => {
      void (async () => {
        let supabase: ReturnType<typeof getSupabaseBrowser>;
        try {
          supabase = getSupabaseBrowser();
        } catch {
          setFormError("Configuration error — contact support.");
          return;
        }

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setFormError("Incorrect email or password. Please try again.");
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
          
          if (rememberMe) {
             document.cookie = "ha_remember_me=true; max-age=" + (30 * 24 * 60 * 60) + "; path=/";
          }

          await fetch("/api/ha/auth/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              accessToken,
              role: me.role,
              clinicId: me.clinicId
            })
          });

          router.push(postLoginPath);
          router.refresh();
        } catch (verifyErr) {
          await supabase.auth.signOut();
          setFormError("Could not verify your account.");
        }
      })();
    });
  }

  const inputErrorStyle = formError ? "border-[#E24B4A] focus:ring-[#E24B4A]/20 focus:border-[#E24B4A]" : "border-[#D1D5DB] focus:ring-[rgba(14,124,102,0.08)] focus:border-[#0E7C66]";

  return (
    <div className="flex min-h-screen bg-white">
      <style dangerouslySetInnerHTML={{ __html: globalStyles }} />
      
      {/* LEFT PANEL - 44% width */}
      <div className="hidden lg:flex w-[44%] bg-[#0E7C66] flex-col justify-between px-12 py-12 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-[400px] h-[400px] bg-white opacity-[0.03] rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-[300px] h-[300px] bg-emerald-300 opacity-[0.05] rounded-full blur-[60px] pointer-events-none" />

        {/* Top: Logo */}
        <div className="flex items-center gap-2 relative z-10">
          <Leaf className="w-5 h-5 text-emerald-300" />
          <span className="text-[14px] font-[600] tracking-wide">GlowHomeo Assist</span>
        </div>

        {/* Middle: Hero section */}
        <div className="relative z-10 my-auto py-12">
          <div className="inline-block px-3 py-1 rounded-full bg-[rgba(255,255,255,0.12)] text-[11px] font-semibold tracking-wide uppercase mb-6">
            Clinic workspace
          </div>
          
          <h1 className="font-heading text-[26px] leading-[1.3] text-white mb-4" style={{ fontFamily: "DM Serif Display, serif" }}>
            Built around how you already take cases.
          </h1>
          
          <p className="text-[12px] text-[rgba(255,255,255,0.65)] leading-relaxed max-w-[85%] mb-10">
            A specialized system designed entirely for homoeopaths. Ditch generic EHRs and reclaim your time with workflows tailored to our practice.
          </p>

          <ul className="space-y-5">
            <li className="flex items-start gap-3">
              <div className="mt-0.5 flex w-5 h-5 shrink-0 items-center justify-center rounded bg-white/10 text-emerald-300">
                <Check className="w-3.5 h-3.5" />
              </div>
              <span className="text-[14px] font-medium text-white/90">Sign and send your Rx to WhatsApp in one tap.</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="mt-0.5 flex w-5 h-5 shrink-0 items-center justify-center rounded bg-white/10 text-emerald-300">
                <Check className="w-3.5 h-3.5" />
              </div>
              <span className="text-[14px] font-medium text-white/90">Auto-organize repertorization sheets and timelines.</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="mt-0.5 flex w-5 h-5 shrink-0 items-center justify-center rounded bg-white/10 text-emerald-300">
                <Check className="w-3.5 h-3.5" />
              </div>
              <span className="text-[14px] font-medium text-white/90">Never miss a follow-up with automated patient nudges.</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="mt-0.5 flex w-5 h-5 shrink-0 items-center justify-center rounded bg-white/10 text-emerald-300">
                <Check className="w-3.5 h-3.5" />
              </div>
              <span className="text-[14px] font-medium text-white/90">Generate AI-assisted case summaries instantly.</span>
            </li>
          </ul>
        </div>

        {/* Bottom: Social proof */}
        <div className="relative z-10 flex items-center pt-8 border-t border-[rgba(255,255,255,0.15)]">
          <div>
            <div className="text-[20px] font-bold text-white mb-1">340+</div>
            <div className="text-[11px] text-[rgba(255,255,255,0.55)]">homeopathy doctors across India</div>
          </div>
          <div className="w-px h-10 bg-[rgba(255,255,255,0.15)] mx-8" />
          <div>
            <div className="text-[20px] font-bold text-white mb-1">18K+</div>
            <div className="text-[11px] text-[rgba(255,255,255,0.55)]">patient consultations completed</div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL - 56% width */}
      <div className="w-full lg:w-[56%] flex items-center justify-center px-6 py-12 relative">
        <div className="w-full max-w-[380px]">
          {/* Eyebrow */}
          <div className="text-[11px] uppercase tracking-[0.08em] font-semibold text-[#0E7C66] mb-3">
            Doctor sign in
          </div>
          
          <h1 className="text-[24px] text-slate-900 mb-2 font-heading" style={{ fontFamily: "DM Serif Display, serif" }}>
            Welcome back
          </h1>
          
          <p className="text-[13px] text-slate-500 mb-8">
            Sign in with your clinic credentials to continue
          </p>

          <form onSubmit={onSubmit} className="flex flex-col gap-5">
            <div>
              <label htmlFor="email" className="sr-only">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                required
                ref={emailInputRef}
                className={"w-full bg-white border rounded-[8px] h-[42px] px-3 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none transition-shadow " + inputErrorStyle}
              />
            </div>

            <div className="relative">
              <div className="flex items-center justify-between absolute -top-6 right-0 w-full">
                <label htmlFor="password" className="sr-only">Password</label>
                <Link
                  href="/forgot-password"
                  className="text-[12px] font-medium text-[#0E7C66] hover:underline ml-auto"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                className={"w-full bg-white border rounded-[8px] h-[42px] pl-3 pr-10 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none transition-shadow " + inputErrorStyle}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            
            {formError && (
              <p className="text-[#E24B4A] text-[13px] font-medium -mt-3">
                {formError}
              </p>
            )}

            <div className="flex items-center gap-2 mt-1">
              <input
                id="remember"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-[#0E7C66] focus:ring-[#0E7C66]"
                style={{ accentColor: "#0E7C66" }}
              />
              <label htmlFor="remember" className="text-[13px] text-slate-600 font-medium cursor-pointer">
                Remember me for 30 days
              </label>
            </div>

            <button
              type="submit"
              disabled={pending}
              className="w-full h-[44px] bg-[#0E7C66] hover:bg-[#085041] disabled:bg-[#0E7C66]/70 text-white text-[14px] font-[600] rounded-[10px] flex items-center justify-center gap-2 transition-colors focus:outline-none focus:ring-4 focus:ring-[rgba(14,124,102,0.15)] mt-2"
            >
              {pending ? (
                <ButtonSpinner className="w-4 h-4" />
              ) : (
                "Sign in to clinic workspace"
              )}
            </button>
          </form>

          <div className="mt-8 flex items-center justify-center gap-4">
            <div className="h-px bg-slate-200 flex-1" />
            <span className="text-[12px] text-slate-500 uppercase tracking-wider font-medium">New to GlowHomeo?</span>
            <div className="h-px bg-slate-200 flex-1" />
          </div>

          <div className="mt-6 text-center">
            <Link
              href="/request-access"
              className="text-[#0E7C66] text-[14px] font-semibold hover:underline inline-flex items-center gap-1.5 transition-transform hover:translate-x-1 duration-300"
            >
              Book a free 20-minute walkthrough <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

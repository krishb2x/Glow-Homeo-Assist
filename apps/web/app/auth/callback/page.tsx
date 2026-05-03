"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "../../../lib/supabase-browser";

/**
 * Supabase Auth redirect target for doctor invites. Exchanges the PKCE `code` then continues to set password.
 */
export default function AuthCallbackPage(): JSX.Element {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const supabase = getSupabaseBrowser();
        if (typeof window !== "undefined" && window.location.search.includes("code=")) {
          const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
          if (error) {
            setErr("This sign-in link is invalid or has expired. Ask your administrator to resend the invite, or use Forgot password on the sign-in page.");
            return;
          }
        }
        const {
          data: { session }
        } = await supabase.auth.getSession();
        if (session) {
          router.replace("/update-password?source=invite");
        } else {
          setErr("Could not complete sign-in. Open the link in the same browser you use for the clinic app, or try signing in with email and password.");
        }
      } catch (e) {
        setErr(
          e instanceof Error
            ? e.message
            : "Something went wrong. If this continues, add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment."
        );
      }
    })();
  }, [router]);

  return (
    <main id="main-content" className="min-h-screen bg-white font-sans">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
        {err ? (
          <p className="text-center text-sm text-rose-800" role="alert">
            {err}
          </p>
        ) : (
          <p className="text-center text-sm text-hs-text-secondary" role="status">
            Finishing sign-in…
          </p>
        )}
      </div>
    </main>
  );
}

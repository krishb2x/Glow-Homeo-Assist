"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  exchangeWhatsAppOAuthCode,
  fetchWhatsAppOAuthConfig,
  type WhatsAppOAuthConfig
} from "../../../lib/doctor-api";

type EmbeddedSignupMessage = {
  type?: string;
  event?: string;
  data?: {
    phone_number_id?: string;
    waba_id?: string;
    current_step?: string;
  };
};

declare global {
  interface Window {
    FB?: {
      init: (opts: { appId: string; cookie?: boolean; xfbml?: boolean; version: string }) => void;
      login: (
        cb: (response: { authResponse?: { code?: string } }) => void,
        opts: Record<string, string>
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

function loadFacebookSdk(appId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.FB) {
      resolve();
      return;
    }
    window.fbAsyncInit = () => {
      window.FB?.init({ appId, cookie: true, xfbml: false, version: "v21.0" });
      resolve();
    };
    if (document.getElementById("facebook-jssdk")) {
      const t = setInterval(() => {
        if (window.FB) {
          clearInterval(t);
          resolve();
        }
      }, 100);
      setTimeout(() => {
        clearInterval(t);
        reject(new Error("Facebook SDK load timeout"));
      }, 15_000);
      return;
    }
    const s = document.createElement("script");
    s.id = "facebook-jssdk";
    s.async = true;
    s.defer = true;
    s.src = "https://connect.facebook.net/en_US/sdk.js";
    s.onerror = () => reject(new Error("Could not load Facebook SDK"));
    document.body.appendChild(s);
  });
}

type Props = {
  onConnected: () => void;
  disabled?: boolean;
};

export function MetaWhatsAppConnect({ onConnected, disabled }: Props): JSX.Element | null {
  const [cfg, setCfg] = useState<WhatsAppOAuthConfig | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [signupHints, setSignupHints] = useState<{ wabaId?: string; phoneNumberId?: string }>({});

  useEffect(() => {
    void fetchWhatsAppOAuthConfig()
      .then(setCfg)
      .catch(() => setCfg({ enabled: false, appId: null, configId: null }));
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent): void => {
      if (typeof event.origin !== "string" || !event.origin.includes("facebook.com")) return;
      const payload = event.data as EmbeddedSignupMessage;
      if (payload?.type !== "WA_EMBEDDED_SIGNUP" && payload?.event !== "FINISH") return;
      const data = payload.data;
      if (data?.waba_id || data?.phone_number_id) {
        setSignupHints({
          wabaId: data.waba_id,
          phoneNumberId: data.phone_number_id
        });
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const onConnectMeta = useCallback(async () => {
    if (!cfg?.enabled || !cfg.appId || !cfg.configId) return;
    setBusy(true);
    setErr(null);
    try {
      await loadFacebookSdk(cfg.appId);
      const hints = { ...signupHints };
      await new Promise<void>((resolve, reject) => {
        window.FB?.login(
          (response) => {
            const code = response.authResponse?.code;
            if (!code) {
              reject(new Error("Meta sign-in was cancelled or did not return a code."));
              return;
            }
            void exchangeWhatsAppOAuthCode({
              code,
              wabaId: hints.wabaId ?? null,
              phoneNumberId: hints.phoneNumberId ?? null
            })
              .then(() => {
                onConnected();
                resolve();
              })
              .catch(reject);
          },
          {
            config_id: cfg.configId!,
            response_type: "code",
            override_default_response_type: "true"
          }
        );
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Meta connect failed");
    } finally {
      setBusy(false);
    }
  }, [cfg, onConnected, signupHints]);

  if (!cfg) return null;
  if (!cfg.enabled) {
    return (
      <p className="rounded-xl border border-hs-border/50 bg-hs-cream/40 px-3 py-2 text-caption-sm text-hs-text-secondary">
        Meta Embedded Signup is not configured. Set <span className="font-mono">META_APP_ID</span>,{" "}
        <span className="font-mono">META_APP_SECRET</span>, and{" "}
        <span className="font-mono">META_EMBEDDED_SIGNUP_CONFIG_ID</span> on the API server, or use manual
        token entry below.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-hs-primary/25 bg-hs-primary-very-light/40 p-4">
      <p className="text-body-sm font-semibold text-hs-ink">Connect with Meta (recommended)</p>
      <p className="mt-1 text-caption-sm text-hs-text-secondary">
        Official WhatsApp Business onboarding — no manual token copy. Used by clinic platforms in India and
        globally.
      </p>
      {err ? (
        <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-caption-sm text-rose-900" role="alert">
          {err}
        </p>
      ) : null}
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => void onConnectMeta()}
        className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#1877F2] px-4 py-2 text-caption-sm font-semibold text-white hover:bg-[#166FE5] disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
        Connect WhatsApp Business
      </button>
    </div>
  );
}

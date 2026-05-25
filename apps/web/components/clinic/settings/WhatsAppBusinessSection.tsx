"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, MessageCircle } from "lucide-react";
import {
  disconnectWhatsApp,
  fetchWhatsAppConnection,
  fetchWorkspaceContext,
  saveWhatsAppConnection,
  syncWhatsAppTemplates,
  verifyWhatsAppConnection,
  type WhatsAppConnectionStatus
} from "../../../lib/doctor-api";
import { DS_FIELD } from "../../../lib/ds-classes";
import { MetaWhatsAppConnect } from "./MetaWhatsAppConnect";

const VARIABLE_HINT =
  "{{patient_name}}, {{doctor_name}}, {{clinic_name}}, {{appointment_date}}, {{prescription_link}}, {{followup_date}}";

export function WhatsAppBusinessSection(): JSX.Element {
  const [featureOn, setFeatureOn] = useState<boolean | null>(null);
  const [conn, setConn] = useState<WhatsAppConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [displayPhone, setDisplayPhone] = useState("");
  const [testPhone, setTestPhone] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const w = await fetchWorkspaceContext();
      setFeatureOn(w.features?.whatsappIntegration ?? false);
      const c = await fetchWhatsAppConnection();
      setConn(c);
      if (c.phoneNumberId) setPhoneNumberId(c.phoneNumberId);
      if (c.wabaId) setWabaId(c.wabaId ?? "");
      if (c.displayPhone) setDisplayPhone(c.displayPhone);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not load WhatsApp settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-body-sm text-hs-text-secondary">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading…
      </p>
    );
  }

  if (featureOn === false) {
    return (
      <p className="text-body-sm text-hs-text-secondary">
        WhatsApp Business is available on the Enterprise plan. Contact your administrator to enable{" "}
        <span className="font-medium text-hs-ink">whatsapp_integration</span> for this clinic.
      </p>
    );
  }

  async function onConnect(): Promise<void> {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const r = await saveWhatsAppConnection({
        phoneNumberId: phoneNumberId.trim(),
        wabaId: wabaId.trim() || undefined,
        displayPhone: displayPhone.trim() || undefined,
        accessToken: accessToken.trim()
      });
      setMsg(`Connected${r.displayPhone ? ` · ${r.displayPhone}` : ""}.`);
      setAccessToken("");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Connection failed");
    } finally {
      setBusy(false);
    }
  }

  async function onVerify(): Promise<void> {
    if (!testPhone.trim()) {
      setErr("Enter a mobile number to receive the test message.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await verifyWhatsAppConnection(testPhone.trim());
      setMsg("Test message sent. Check WhatsApp on that number.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Test failed");
    } finally {
      setBusy(false);
    }
  }

  async function onDisconnect(): Promise<void> {
    setBusy(true);
    try {
      await disconnectWhatsApp();
      setMsg("Disconnected.");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Disconnect failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-body-sm text-hs-text-secondary">
        Connect your clinic&apos;s WhatsApp Business account (Meta Cloud API). Use broadcasts from{" "}
        <span className="font-medium text-hs-ink">Messages → Broadcast</span> for personalized patient outreach.
        Approved Meta templates are required for marketing messages outside the 24-hour care window.
      </p>

      {conn?.connected ? (
        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 px-3 py-2.5 text-body-sm text-emerald-900">
          <span className="font-semibold">Connected</span>
          {conn.displayPhone ? ` · ${conn.displayPhone}` : null}
          {conn.verifiedAt ? (
            <span className="block text-caption-sm text-emerald-800/90">
              Verified {new Date(conn.verifiedAt).toLocaleString()}
            </span>
          ) : null}
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200/70 bg-amber-50/50 px-3 py-2.5 text-body-sm text-amber-950">
          Not connected. Add credentials from Meta Business Manager → WhatsApp → API setup.
        </div>
      )}

      {err ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-body-sm text-rose-900" role="alert">
          {err}
        </p>
      ) : null}
      {msg ? <p className="text-body-sm font-medium text-hs-primary">{msg}</p> : null}

      {!conn?.connected ? (
        <MetaWhatsAppConnect disabled={busy} onConnected={() => void load()} />
      ) : null}

      <details className="rounded-xl border border-hs-border/40 bg-hs-paper/80">
        <summary className="cursor-pointer px-4 py-3 text-caption-sm font-semibold text-hs-text-secondary">
          Advanced: manual API credentials
        </summary>
        <div className="space-y-3 border-t border-hs-border/30 px-4 py-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-caption-sm font-medium text-hs-text-secondary">
          Phone number ID
          <input
            value={phoneNumberId}
            onChange={(e) => setPhoneNumberId(e.target.value)}
            className={`${DS_FIELD} mt-1`}
            placeholder="From Meta developer console"
          />
        </label>
        <label className="block text-caption-sm font-medium text-hs-text-secondary">
          WABA ID (optional)
          <input value={wabaId} onChange={(e) => setWabaId(e.target.value)} className={`${DS_FIELD} mt-1`} />
        </label>
      </div>
      <label className="block text-caption-sm font-medium text-hs-text-secondary">
        Display phone (optional)
        <input value={displayPhone} onChange={(e) => setDisplayPhone(e.target.value)} className={`${DS_FIELD} mt-1`} />
      </label>
      <label className="block text-caption-sm font-medium text-hs-text-secondary">
        Permanent access token
        <input
          type="password"
          value={accessToken}
          onChange={(e) => setAccessToken(e.target.value)}
          className={`${DS_FIELD} mt-1`}
          placeholder={conn?.accessTokenMasked ? `Saved ${conn.accessTokenMasked}` : "Paste new token to update"}
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void onConnect()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-hs-primary px-4 py-2 text-caption-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageCircle className="h-3.5 w-3.5" />}
          {conn?.connected ? "Update connection" : "Connect"}
        </button>
        {conn?.connected ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void onDisconnect()}
            className="rounded-lg border border-hs-border/50 px-4 py-2 text-caption-sm font-semibold text-hs-ink"
          >
            Disconnect
          </button>
        ) : null}
      </div>
        </div>
      </details>

      {conn?.connected ? (
        <div className="border-t border-hs-border/40 pt-4 space-y-4">
          <div>
            <p className="text-caption-sm font-semibold text-hs-text-secondary">Message templates</p>
            <p className="mt-1 text-caption-sm text-hs-text-tertiary">
              Sync approved templates from Meta Business Manager (standard for clinic WhatsApp modules).
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setErr(null);
                try {
                  const r = await syncWhatsAppTemplates();
                  setMsg(`Templates synced: ${r.synced} (${r.created} new, ${r.updated} updated).`);
                } catch (e) {
                  setErr(e instanceof Error ? e.message : "Template sync failed");
                } finally {
                  setBusy(false);
                }
              }}
              className="mt-2 rounded-lg border border-hs-primary/35 bg-hs-primary-very-light px-3 py-2 text-caption-sm font-semibold text-hs-primary disabled:opacity-50"
            >
              Sync templates from Meta
            </button>
          </div>
          <div>
          <p className="text-caption-sm font-semibold text-hs-text-secondary">Send test message</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <input
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="91XXXXXXXXXX"
              className={`${DS_FIELD} max-w-xs`}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void onVerify()}
              className="rounded-lg border border-hs-primary/35 bg-hs-primary-very-light px-3 py-2 text-caption-sm font-semibold text-hs-primary"
            >
              Verify
            </button>
          </div>
          </div>
        </div>
      ) : null}

      <p className="text-caption-sm text-hs-text-tertiary">
        Broadcast variables: {VARIABLE_HINT}
      </p>
    </div>
  );
}

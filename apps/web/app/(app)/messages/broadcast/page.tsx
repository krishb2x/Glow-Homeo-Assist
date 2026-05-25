"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { PageHeader } from "../../../../components/platform/PageHeader";
import {
  createWhatsAppBroadcast,
  fetchPatientsPage,
  fetchWhatsAppConnection,
  fetchWhatsAppTemplates,
  syncWhatsAppTemplates,
  previewWhatsAppAudience,
  type PatientListItem,
  type WhatsAppAudienceSpec,
  type WhatsAppTemplate
} from "../../../../lib/doctor-api";
import { DS_BTN_PRIMARY_ROUNDED, DS_FIELD } from "../../../../lib/ds-classes";

const DEFAULT_BODY =
  "Hello {{patient_name}}, this is {{doctor_name}} from {{clinic_name}}. Please reply if you need assistance.";

type AudienceMode = WhatsAppAudienceSpec["mode"];

export default function WhatsAppBroadcastPage(): JSX.Element {
  const [connected, setConnected] = useState(false);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [body, setBody] = useState(DEFAULT_BODY);
  const [templateId, setTemplateId] = useState("");
  const [mode, setMode] = useState<AudienceMode>("all");
  const [tags, setTags] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pickerPatients, setPickerPatients] = useState<PatientListItem[]>([]);
  const [preview, setPreview] = useState<{ recipientCount: number; skippedNoPhone: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    setTemplates(await fetchWhatsAppTemplates());
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const c = await fetchWhatsAppConnection();
        setConnected(c.connected);
        await loadTemplates();
      } catch {
        setConnected(false);
      }
    })();
  }, [loadTemplates]);

  async function onSyncTemplates(): Promise<void> {
    setBusy(true);
    setErr(null);
    setSyncMsg(null);
    try {
      const r = await syncWhatsAppTemplates();
      setSyncMsg(`Synced ${r.synced} templates from Meta (${r.created} new, ${r.updated} updated).`);
      await loadTemplates();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Template sync failed");
    } finally {
      setBusy(false);
    }
  }

  const audienceSpec = useCallback((): WhatsAppAudienceSpec => {
    if (mode === "individual") return { mode: "individual", patientIds: selectedIds };
    if (mode === "tags") {
      return {
        mode: "tags",
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      };
    }
    if (mode === "filter") {
      return {
        mode: "filter",
        filter: {
          search: filterSearch.trim() || undefined,
          hasPhone: true
        }
      };
    }
    return { mode: "all" };
  }, [mode, selectedIds, tags, filterSearch]);

  async function runPreview(): Promise<void> {
    setErr(null);
    try {
      setPreview(await previewWhatsAppAudience(audienceSpec()));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Preview failed");
    }
  }

  async function loadPicker(): Promise<void> {
    const page = await fetchPatientsPage({ limit: 50, search: filterSearch || undefined });
    setPickerPatients(page.items.filter((p) => p.phone));
  }

  async function onSend(): Promise<void> {
    if (!connected) {
      setErr("Connect WhatsApp Business in Settings first.");
      return;
    }
    setBusy(true);
    setErr(null);
    setResult(null);
    try {
      const r = await createWhatsAppBroadcast({
        body,
        audience: audienceSpec(),
        templateId: templateId || undefined
      });
      setResult(
        `Queued ${r.total} messages (${r.skippedNoPhone} skipped — no phone on file). Delivery runs in the background (~1/sec).`
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Broadcast failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="WhatsApp broadcast"
        description="Send personalized template messages to patients. Complies with WhatsApp Business rules — use approved templates for marketing."
      />
      <p className="text-body-sm">
        <Link href="/messages" className="font-medium text-hs-primary hover:underline">
          ← Messages
        </Link>
        {" · "}
        <Link href="/settings" className="font-medium text-hs-primary hover:underline">
          WhatsApp settings
        </Link>
      </p>

      {!connected ? (
        <p className="rounded-xl border border-amber-200/70 bg-amber-50/50 px-3 py-2 text-body-sm text-amber-950">
          WhatsApp is not connected. Open Settings → WhatsApp Business to connect your account.
        </p>
      ) : null}

      <section className="ds-app-card space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-body-sm font-semibold text-hs-ink">Message</h3>
          {connected ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void onSyncTemplates()}
              className="text-caption-sm font-semibold text-hs-primary hover:underline disabled:opacity-50"
            >
              Sync from Meta
            </button>
          ) : null}
        </div>
        {syncMsg ? <p className="text-caption-sm text-hs-primary">{syncMsg}</p> : null}
        <label className="block text-caption-sm text-hs-text-secondary">
          Approved template (optional — required for marketing outside 24h window)
          <select
            value={templateId}
            onChange={(e) => {
              setTemplateId(e.target.value);
              const t = templates.find((x) => x.id === e.target.value);
              if (t) setBody(t.body);
            }}
            className={`${DS_FIELD} mt-1`}
          >
            <option value="">Session / custom text</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.status})
                {t.meta_template_name ? ` · ${t.meta_template_name}` : ""}
              </option>
            ))}
          </select>
        </label>
        {connected && templates.length === 0 ? (
          <p className="text-caption-sm text-hs-text-tertiary">
            No templates yet. Click <span className="font-medium">Sync from Meta</span> to import your
            Business Manager catalog.
          </p>
        ) : null}
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} className={DS_FIELD} />
      </section>

      <section className="ds-app-card space-y-3 p-5">
        <h3 className="text-body-sm font-semibold text-hs-ink">Audience</h3>
        <div className="flex flex-wrap gap-2">
          {(["all", "tags", "filter", "individual"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-full border px-3 py-1 text-caption-sm font-semibold ${
                mode === m
                  ? "border-hs-primary/40 bg-hs-primary-very-light text-hs-primary"
                  : "border-hs-border/50 text-hs-ink"
              }`}
            >
              {m === "all" ? "All patients" : m === "tags" ? "By tags" : m === "filter" ? "Custom filter" : "Select patients"}
            </button>
          ))}
        </div>
        {mode === "tags" ? (
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="e.g. diabetes, follow-up"
            className={DS_FIELD}
          />
        ) : null}
        {mode === "filter" ? (
          <input
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            placeholder="Search name or phone"
            className={DS_FIELD}
          />
        ) : null}
        {mode === "individual" ? (
          <div>
            <button type="button" onClick={() => void loadPicker()} className="text-caption-sm font-semibold text-hs-primary">
              Load patients
            </button>
            <ul className="mt-2 max-h-48 space-y-1 overflow-auto text-body-sm">
              {pickerPatients.map((p) => (
                <li key={p.id}>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(p.id)}
                      onChange={(e) => {
                        setSelectedIds((ids) =>
                          e.target.checked ? [...ids, p.id] : ids.filter((x) => x !== p.id)
                        );
                      }}
                    />
                    {p.name} {p.phone ? `· ${p.phone}` : ""}
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => void runPreview()}
          className="text-caption-sm font-semibold text-hs-primary hover:underline"
        >
          Preview recipient count
        </button>
        {preview ? (
          <p className="text-body-sm text-hs-text-secondary">
            {preview.recipientCount} recipients · {preview.skippedNoPhone} skipped (no phone)
          </p>
        ) : null}
      </section>

      {err ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-body-sm text-rose-900">{err}</p>
      ) : null}
      {result ? <p className="text-body-sm font-medium text-emerald-800">{result}</p> : null}

      <button
        type="button"
        disabled={busy || !connected}
        onClick={() => void onSend()}
        className={`${DS_BTN_PRIMARY_ROUNDED} gap-2 disabled:opacity-50`}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Queue broadcast
      </button>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Loader2, MessageSquare, Send } from "lucide-react";
import {
  fetchDoctorInbox,
  markDoctorInboxMessageRead,
  postDoctorInboxReply,
  type InboxMessageItem
} from "../../../lib/doctor-api";

function formatShortTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  } catch {
    return "";
  }
}

export function DashboardInboxPanel(): JSX.Element {
  const [items, setItems] = useState<InboxMessageItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoadError(null);
    void (async () => {
      setLoading(true);
      try {
        // Inbox panel surfaces only inbound (patient-authored) messages; clinic replies
        // are visible inside the threaded /messages view.
        const all = await fetchDoctorInbox(60);
        setItems(all.filter((m) => !m.fromDoctor).slice(0, 18));
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : "Could not load");
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = useCallback(
    (m: InboxMessageItem) => {
      if (expandedId === m.id) {
        setExpandedId(null);
        return;
      }
      setExpandedId(m.id);
      setReplyText("");
      setSendError(null);
      if (!m.readAt) {
        void markDoctorInboxMessageRead(m.id).catch(() => {});
        setItems((prev) => prev.map((x) => (x.id === m.id ? { ...x, readAt: new Date().toISOString() } : x)));
      }
    },
    [expandedId]
  );

  const sendReply = useCallback(
    async (m: InboxMessageItem) => {
      const t = replyText.trim();
      if (!t || sending) return;
      setSending(true);
      setSendError(null);
      try {
        await postDoctorInboxReply({ conversationId: m.id, body: t });
        setReplyText("");
        setExpandedId(null);
        load();
      } catch (e) {
        setSendError(e instanceof Error ? e.message : "Send failed");
      } finally {
        setSending(false);
      }
    },
    [replyText, sending, load]
  );

  return (
    <section
      className="flex max-h-[min(70vh,640px)] flex-col overflow-hidden rounded-2xl border border-hs-border/30 bg-hs-card shadow-card"
      aria-label="Patient messages"
    >
      <div className="shrink-0 border-b border-hs-border/20 bg-hs-primary-very-light/45 px-5 py-4">
        <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight text-hs-ink">
          <MessageSquare className="h-[1.05rem] w-[1.05rem] text-hs-primary/90" strokeWidth={2} aria-hidden />
          Messages
        </h2>
        <p className="mt-0.5 text-sm text-hs-text-tertiary">Outside the main visit flow — quick replies.</p>
      </div>

      {loadError ? (
        <p className="p-5 text-sm leading-relaxed text-rose-800/90">{loadError}</p>
      ) : loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-hs-text-secondary">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading…
        </div>
      ) : items.length === 0 ? (
        <p className="p-5 text-sm leading-relaxed text-hs-text-secondary sm:p-6">
          No patient messages yet. Inbound messages will show here.
        </p>
      ) : (
        <ul className="min-h-0 flex-1 overflow-y-auto divide-y divide-hs-border/20">
          {items.map((m) => {
            const open = expandedId === m.id;
            const unread = !m.readAt;
            return (
              <li key={m.id} className="bg-hs-paper/40">
                <button
                  type="button"
                  onClick={() => toggle(m)}
                  className={`w-full px-4 py-3.5 text-left transition hover:bg-hs-cream/40 sm:px-5 ${
                    unread && !open ? "bg-hs-primary-very-light/35" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className={`min-w-0 text-sm font-medium text-hs-ink ${unread ? "" : "font-normal"}`}>
                      {m.patientName}
                      {unread ? <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-hs-primary" /> : null}
                    </p>
                    <span className="shrink-0 text-[10px] tabular-nums text-hs-text-tertiary">
                      {formatShortTime(m.createdAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-hs-text-secondary">{m.body}</p>
                </button>
                {open ? (
                  <div className="border-t border-hs-border/20 bg-hs-cream/25 px-4 pb-4 pt-2 sm:px-5">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-hs-ink">{m.body}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Link
                        href={`/patients/${encodeURIComponent(m.patientId)}/timeline`}
                        className="text-sm font-medium text-hs-primary hover:underline"
                      >
                        Open chart
                      </Link>
                    </div>
                    <label htmlFor={`inbox-reply-${m.id}`} className="mt-3 block text-xs font-medium text-hs-text-tertiary">
                      Reply
                    </label>
                    <textarea
                      id={`inbox-reply-${m.id}`}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={3}
                      className="mt-1.5 w-full resize-y rounded-xl border border-hs-border/40 bg-hs-paper/95 px-3 py-2 text-sm text-hs-ink shadow-input focus:border-hs-primary/35 focus:outline-none focus:ring-2 focus:ring-hs-primary/10"
                      placeholder="Short reply to the patient…"
                    />
                    {sendError ? <p className="mt-1.5 text-xs text-rose-800/90">{sendError}</p> : null}
                    <button
                      type="button"
                      disabled={sending || !replyText.trim()}
                      onClick={() => void sendReply(m)}
                      className="mt-2.5 inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-hs-primary px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-hs-primary-light disabled:opacity-50"
                    >
                      {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" aria-hidden />}
                      Send
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

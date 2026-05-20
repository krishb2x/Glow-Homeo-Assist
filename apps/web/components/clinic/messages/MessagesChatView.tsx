"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, MessageSquare, Send } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  fetchDoctorInbox,
  getToken,
  markDoctorInboxMessageRead,
  postDoctorInboxReply,
  type InboxMessageItem
} from "../../../lib/doctor-api";
import { isDemoMode } from "../../../lib/demo-mode";
import { friendlyLoadError } from "../../../lib/friendly-error";
import { ErrorState, EmptyState } from "../../ui/LoadState";

const QUICK_REPLY_TEMPLATES: { label: string; text: string }[] = [
  { label: "Continue remedy", text: "Please continue the same remedy as discussed. Let me know if anything changes in the next week." },
  { label: "Book follow-up", text: "I suggest we book a follow-up in about two weeks. You can use the app or call the clinic to schedule." },
  { label: "Dose check-in", text: "How is the new dose? Any new symptoms or change in sleep, appetite, or energy since we last spoke?" },
  { label: "ER / urgent", text: "If you develop severe pain, high fever, difficulty breathing, or sudden weakness, please seek emergency care and let us know." }
];

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

type Thread = { patientId: string; patientName: string; messages: InboxMessageItem[] };

function mergeInbox(fetched: InboxMessageItem[], overlay: InboxMessageItem[]): InboxMessageItem[] {
  const byId = new Map<string, InboxMessageItem>();
  for (const m of fetched) byId.set(m.id, m);
  for (const m of overlay) byId.set(m.id, m);
  return [...byId.values()];
}

export function MessagesChatView(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientIdFromQuery = searchParams.get("patientId");
  const [items, setItems] = useState<InboxMessageItem[]>([]);
  const [localReplyOverlay, setLocalReplyOverlay] = useState<InboxMessageItem[]>([]);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const allItems = useMemo(() => mergeInbox(items, localReplyOverlay), [items, localReplyOverlay]);

  const load = useCallback(() => {
    setLoadError(null);
    void (async () => {
      setLoading(true);
      try {
        setItems(await fetchDoctorInbox(60));
      } catch (e) {
        setLoadError(e);
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    load();
  }, [load, router]);

  useEffect(() => {
    if (patientIdFromQuery) setSelectedPatientId(patientIdFromQuery);
  }, [patientIdFromQuery]);

  const threads: Thread[] = useMemo(() => {
    const map = new Map<string, InboxMessageItem[]>();
    for (const m of allItems) {
      const list = map.get(m.patientId) ?? [];
      list.push(m);
      map.set(m.patientId, list);
    }
    const out: Thread[] = [];
    for (const [patientId, messages] of map) {
      const sorted = [...messages].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      out.push({ patientId, patientName: sorted[0]?.patientName ?? "Patient", messages: sorted });
    }
    out.sort((a, b) => new Date(b.messages[0]!.createdAt).getTime() - new Date(a.messages[0]!.createdAt).getTime());
    return out;
  }, [allItems]);

  const activeThread = threads.find((t) => t.patientId === selectedPatientId) ?? threads[0] ?? null;

  const messagesChronological = useMemo(() => {
    if (!activeThread) return [];
    return [...activeThread.messages].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [activeThread]);

  const lastMessage = messagesChronological[messagesChronological.length - 1] ?? null;

  useEffect(() => {
    if (selectedPatientId == null && threads[0]) {
      setSelectedPatientId(threads[0].patientId);
    }
  }, [selectedPatientId, threads]);

  const openThread = useCallback(
    (t: Thread) => {
      setSelectedPatientId(t.patientId);
      setReplyText("");
      setSendError(null);
      const unread = t.messages.find((m) => !m.readAt && !m.fromDoctor);
      if (unread) {
        void markDoctorInboxMessageRead(unread.id).catch(() => {});
        setItems((prev) => prev.map((x) => (x.id === unread.id ? { ...x, readAt: new Date().toISOString() } : x)));
        setLocalReplyOverlay((prev) =>
          prev.map((x) => (x.id === unread.id ? { ...x, readAt: new Date().toISOString() } : x))
        );
      }
    },
    [setItems]
  );

  const sendReply = useCallback(async () => {
    if (!activeThread || !lastMessage || !replyText.trim() || sending) return;
    setSending(true);
    setSendError(null);
    const body = replyText.trim();
    try {
      const res = await postDoctorInboxReply({
        patientId: activeThread.patientId,
        body,
        inReplyToMessageId: lastMessage.id
      });
      if (isDemoMode()) {
        setLocalReplyOverlay((prev) => [
          ...prev,
          {
            id: res.id,
            patientId: activeThread.patientId,
            patientName: activeThread.patientName,
            body,
            readAt: new Date().toISOString(),
            createdAt: res.created_at,
            fromDoctor: true
          }
        ]);
      }
      setReplyText("");
      if (!isDemoMode()) load();
    } catch (e) {
      setSendError(friendlyLoadError(e));
    } finally {
      setSending(false);
    }
  }, [activeThread, lastMessage, replyText, sending, load]);

  if (loadError && !loading) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold text-hs-ink">Messages</h1>
        <div className="mt-4">
          <ErrorState err={loadError} title="Couldn’t load messages" onRetry={load} />
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex h-[min(80vh,900px)] min-h-[520px] w-full min-w-0 flex-row overflow-hidden rounded-2xl border border-hs-border/35 bg-hs-card shadow-card transition-shadow duration-200 hover:shadow-ds-md"
    >
      <div className="w-80 shrink-0 border-r border-hs-border/30 bg-hs-primary-very-light/50 p-4">
        <h1 className="font-heading flex items-center gap-2 text-heading-sm text-hs-ink">
          <MessageSquare className="h-5 w-5 text-hs-primary" />
          Inbox
        </h1>
        <p className="mt-0.5 text-typo-small text-hs-text-tertiary">Patient threads</p>
        {loading ? (
          <div className="mt-6 flex items-center gap-2 text-sm text-hs-text-secondary">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : threads.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="No messages"
              description="When patients write in, threads appear here."
            />
          </div>
        ) : (
          <ul className="mt-4 max-h-[min(60vh,520px)] space-y-1 overflow-y-auto">
            {threads.map((t) => {
              const latest = t.messages[0]!;
              const unread = t.messages.some((m) => !m.readAt && !m.fromDoctor);
              const sel = t.patientId === (selectedPatientId ?? threads[0]?.patientId);
              return (
                <li key={t.patientId}>
                  <button
                    type="button"
                    onClick={() => openThread(t)}
                    className={
                      "w-full rounded-xl px-3 py-2.5 text-left text-sm transition duration-200 " +
                      (sel ? "bg-hs-paper font-semibold text-hs-ink shadow-sm" : "text-hs-text-secondary hover:bg-hs-cream/90 hover:shadow-sm")
                    }
                  >
                    <span className="line-clamp-1">{t.patientName}</span>
                    <span className="mt-0.5 line-clamp-1 text-xs text-hs-text-tertiary">{latest.body}</span>
                    {unread ? <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-hs-primary" /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-hs-paper/60 transition-colors">
        {!activeThread && !loading ? (
          <p className="m-auto p-6 text-sm text-hs-text-secondary">Select a conversation</p>
        ) : activeThread ? (
          <>
            <div className="border-b border-hs-border/25 px-6 py-3">
              <p className="font-heading text-body-md font-bold text-hs-ink">{activeThread.patientName}</p>
              <Link
                href={`/patients/${encodeURIComponent(activeThread.patientId)}/timeline`}
                className="mt-1 text-sm font-semibold text-hs-primary hover:underline"
              >
                Open full chart
              </Link>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 py-4">
              {messagesChronological.map((m) => {
                const fromDoc = Boolean(m.fromDoctor);
                return (
                  <div
                    key={m.id}
                    className={
                      "max-w-[92%] rounded-2xl border px-4 py-2.5 text-sm text-hs-ink shadow-sm " +
                      (fromDoc
                        ? "ml-auto rounded-tr-sm border-hs-primary/25 bg-hs-primary/90 text-white"
                        : "mr-auto rounded-tl-sm border-hs-border/30 bg-hs-primary-very-light/80")
                    }
                  >
                    <p
                      className={
                        "text-[10px] font-medium uppercase tracking-wide " +
                        (fromDoc ? "text-white/80" : "text-hs-text-tertiary")
                      }
                    >
                      {fromDoc ? "You · " : "Patient · "}
                      {formatTime(m.createdAt)}
                    </p>
                    <p className={"mt-1 whitespace-pre-wrap leading-relaxed " + (fromDoc ? "text-white" : "")}>{m.body}</p>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-hs-border/25 p-4 px-6">
              <p className="text-typo-small font-semibold uppercase tracking-wide text-hs-text-tertiary">Quick replies</p>
              <div className="mb-2 mt-1.5 flex flex-wrap gap-1.5">
                {QUICK_REPLY_TEMPLATES.map((q) => (
                  <button
                    key={q.label}
                    type="button"
                    onClick={() => {
                      setReplyText(q.text);
                      setSendError(null);
                    }}
                    className="rounded-lg border border-hs-border/40 bg-hs-cream/70 px-2 py-1 text-xs font-medium text-hs-ink transition hover:border-hs-primary/35 hover:bg-hs-paper"
                  >
                    {q.label}
                  </button>
                ))}
              </div>
              <label htmlFor="chat-reply" className="text-xs font-medium text-hs-text-tertiary">
                Your reply
              </label>
              <textarea
                id="chat-reply"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-xl border border-hs-border/50 bg-hs-paper px-3 py-2 text-sm text-hs-ink focus:border-hs-primary/40 focus:outline-none focus:ring-2 focus:ring-hs-primary/12"
                placeholder="Type your reply…"
              />
              {sendError ? <p className="mt-1 text-xs text-rose-800">{sendError}</p> : null}
              <button
                type="button"
                disabled={sending || !replyText.trim()}
                onClick={() => void sendReply()}
                className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-xl bg-hs-primary px-5 text-sm font-bold text-white shadow-md hover:bg-hs-primary-light disabled:opacity-50"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

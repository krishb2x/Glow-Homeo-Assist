"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, CheckCheck, Loader2, MessageSquare, Paperclip, Search, Send, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  fetchDoctorInbox,
  fetchPresignDownload,
  getToken,
  markDoctorInboxMessageRead,
  postDoctorInboxReply,
  presignStorageUpload,
  type InboxMessageItem
} from "../../../lib/doctor-api";
import { isDemoMode } from "../../../lib/demo-mode";
import { friendlyLoadError } from "../../../lib/friendly-error";
import { ErrorState, EmptyState } from "../../ui/LoadState";
import { useRealtimeChannel } from "../../../lib/use-realtime-channel";

const ATTACHMENT_MARKER = "📎 Attachment";
const ATTACHMENT_RE = /📎 Attachment: ([^\n]+) — (clinics\/[^\s\n]+)/g;

type ParsedAttachment = { filename: string; objectKey: string };

function parseAttachments(body: string): { text: string; attachments: ParsedAttachment[] } {
  const attachments: ParsedAttachment[] = [];
  const cleaned = body.replace(ATTACHMENT_RE, (_m, filename, objectKey) => {
    attachments.push({ filename, objectKey });
    return "";
  });
  return { text: cleaned.trim(), attachments };
}

function AttachmentChip({ filename, objectKey }: ParsedAttachment): JSX.Element {
  const [loading, setLoading] = useState(false);
  const onOpen = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const { downloadUrl } = await fetchPresignDownload(objectKey);
      if (downloadUrl) window.open(downloadUrl, "_blank", "noopener,noreferrer");
    } catch {
      /* silently ignore — chip will stay clickable for retry */
    } finally {
      setLoading(false);
    }
  };
  return (
    <a
      href="#attachment"
      onClick={onOpen}
      className="mt-2 inline-flex items-center gap-2 rounded-lg border border-current/30 bg-white/15 px-2 py-1 text-[11px] font-medium underline-offset-2 hover:underline"
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
      ) : (
        <Paperclip className="h-3 w-3" aria-hidden />
      )}
      <span className="max-w-[200px] truncate">{filename}</span>
    </a>
  );
}

type QuickReply = { id: string; label: string; text: string };

const DEFAULT_QUICK_REPLIES: QuickReply[] = [
  { id: "default-continue", label: "Continue remedy", text: "Please continue the same remedy as discussed. Let me know if anything changes in the next week." },
  { id: "default-followup", label: "Book follow-up", text: "I suggest we book a follow-up in about two weeks. You can use the app or call the clinic to schedule." },
  { id: "default-checkin", label: "Dose check-in", text: "How is the new dose? Any new symptoms or change in sleep, appetite, or energy since we last spoke?" },
  { id: "default-urgent", label: "ER / urgent", text: "If you develop severe pain, high fever, difficulty breathing, or sudden weakness, please seek emergency care and let us know." }
];

const QUICK_REPLY_STORAGE_KEY = "homeoassist:doctor:quick-replies";

function loadCustomQuickReplies(): QuickReply[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(QUICK_REPLY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (x): x is QuickReply =>
          x != null &&
          typeof x === "object" &&
          typeof (x as QuickReply).id === "string" &&
          typeof (x as QuickReply).label === "string" &&
          typeof (x as QuickReply).text === "string"
      )
      .slice(0, 20);
  } catch {
    return [];
  }
}

function saveCustomQuickReplies(list: QuickReply[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(QUICK_REPLY_STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* localStorage may be unavailable (Safari private mode) */
  }
}

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
  const [inboxSearch, setInboxSearch] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<{ filename: string; objectKey: string } | null>(null);
  const [attachmentUploading, setAttachmentUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [customReplies, setCustomReplies] = useState<QuickReply[]>([]);

  useEffect(() => {
    setCustomReplies(loadCustomQuickReplies());
  }, []);

  const allQuickReplies = useMemo(
    () => [...DEFAULT_QUICK_REPLIES, ...customReplies],
    [customReplies]
  );

  const saveCurrentAsTemplate = useCallback(() => {
    const trimmed = replyText.trim();
    if (!trimmed) return;
    const label = window.prompt("Name this quick reply:", "");
    if (!label?.trim()) return;
    const id = `custom-${Date.now()}`;
    const next = [...customReplies, { id, label: label.trim().slice(0, 40), text: trimmed }];
    setCustomReplies(next);
    saveCustomQuickReplies(next);
  }, [replyText, customReplies]);

  const removeCustomTemplate = useCallback((id: string) => {
    setCustomReplies((prev) => {
      const next = prev.filter((q) => q.id !== id);
      saveCustomQuickReplies(next);
      return next;
    });
  }, []);

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

  /**
   * Realtime sync — when any `messages` row changes (insert from patient,
   * read receipt update from doctor) we re-fetch the inbox in the
   * background. Polling is preserved as a fallback if realtime can't
   * connect.
   */
  useRealtimeChannel({
    enabled: !isDemoMode(),
    table: "messages",
    channelKey: "messages-inbox",
    onChange: () => {
      void (async () => {
        try {
          setItems(await fetchDoctorInbox(60));
        } catch {
          /* ignore — next poll/load will pick it up */
        }
      })();
    }
  });

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

  const filteredThreads = useMemo(() => {
    const q = inboxSearch.trim().toLowerCase();
    return threads.filter((t) => {
      if (unreadOnly) {
        const hasUnread = t.messages.some((m) => !m.readAt && !m.fromDoctor);
        if (!hasUnread) return false;
      }
      if (!q) return true;
      if (t.patientName.toLowerCase().includes(q)) return true;
      // Match if any message body contains the query (lets you find a topic).
      return t.messages.some((m) => m.body.toLowerCase().includes(q));
    });
  }, [threads, inboxSearch, unreadOnly]);

  const totalUnread = useMemo(
    () =>
      threads.reduce(
        (n, t) => n + t.messages.filter((m) => !m.readAt && !m.fromDoctor).length,
        0
      ),
    [threads]
  );

  const activeThread = filteredThreads.find((t) => t.patientId === selectedPatientId) ?? filteredThreads[0] ?? threads.find((t) => t.patientId === selectedPatientId) ?? threads[0] ?? null;

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

  const uploadAttachment = useCallback(async (file: File) => {
    if (attachmentUploading) return;
    setAttachmentUploading(true);
    setSendError(null);
    try {
      const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(0, 80) || `file-${Date.now()}`;
      const { uploadUrl, objectKey } = await presignStorageUpload({
        category: "document",
        filename: safeName,
        contentType: file.type || "application/octet-stream"
      });
      if (!uploadUrl && !isDemoMode()) {
        throw new Error("Upload not allowed in this environment.");
      }
      if (uploadUrl) {
        const res = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file
        });
        if (!res.ok) throw new Error(`Upload failed (${res.status}).`);
      }
      setPendingAttachment({ filename: safeName, objectKey });
    } catch (e) {
      setSendError(friendlyLoadError(e));
    } finally {
      setAttachmentUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [attachmentUploading]);

  const sendReply = useCallback(async () => {
    if (!activeThread || !lastMessage || sending) return;
    const text = replyText.trim();
    if (!text && !pendingAttachment) return;
    setSending(true);
    setSendError(null);
    const body = pendingAttachment
      ? [text, `${ATTACHMENT_MARKER}: ${pendingAttachment.filename} — ${pendingAttachment.objectKey}`]
          .filter(Boolean)
          .join("\n\n")
      : text;
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
      setPendingAttachment(null);
      if (!isDemoMode()) load();
    } catch (e) {
      setSendError(friendlyLoadError(e));
    } finally {
      setSending(false);
    }
  }, [activeThread, lastMessage, replyText, sending, load, pendingAttachment]);

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
    <div className="ds-card flex h-[min(80vh,900px)] min-h-[520px] w-full min-w-0 flex-row overflow-hidden">
      <div className="flex w-72 shrink-0 flex-col border-r border-hs-border/30 bg-hs-cream/40 p-4 lg:w-80">
        <div className="flex items-center justify-between gap-2">
          <h1 className="font-heading flex items-center gap-2 text-body-md font-semibold text-hs-ink">
            <MessageSquare className="h-4 w-4 text-hs-primary" aria-hidden />
            Inbox
          </h1>
          {totalUnread > 0 ? (
            <span className="rounded-full bg-hs-primary px-2 py-0.5 text-[10px] font-bold text-white">
              {totalUnread} new
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 text-typo-small text-hs-text-tertiary">Patient-initiated threads</p>

        <div className="relative mt-3">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-hs-text-tertiary"
            strokeWidth={2.25}
            aria-hidden
          />
          <input
            type="search"
            value={inboxSearch}
            onChange={(e) => setInboxSearch(e.target.value)}
            placeholder="Search by name or text"
            autoComplete="off"
            className="h-9 w-full rounded-lg border border-hs-border/40 bg-hs-paper pl-8 pr-7 text-caption-sm shadow-sm placeholder:text-hs-text-tertiary/80 focus:border-hs-primary/45 focus:outline-none focus:ring-2 focus:ring-hs-primary/15"
            aria-label="Filter inbox"
          />
          {inboxSearch ? (
            <button
              type="button"
              onClick={() => setInboxSearch("")}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-hs-text-tertiary hover:text-hs-ink"
              aria-label="Clear search"
            >
              <X className="h-3 w-3" aria-hidden />
            </button>
          ) : null}
        </div>

        <label className="mt-2 flex cursor-pointer select-none items-center gap-2 px-1 text-caption-sm text-hs-text-secondary">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => setUnreadOnly(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-hs-border/60 accent-hs-primary"
          />
          Unread only
        </label>

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
        ) : filteredThreads.length === 0 ? (
          <p className="mt-6 rounded-xl border border-dashed border-hs-border/40 bg-hs-paper/60 px-3 py-3 text-caption-sm text-hs-text-tertiary">
            {unreadOnly && inboxSearch
              ? "No unread threads match that search."
              : unreadOnly
              ? "Inbox zero — no unread threads."
              : "No threads match that search."}
          </p>
        ) : (
          <ul className="mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
            {filteredThreads.map((t) => {
              const latest = t.messages[0]!;
              const unread = t.messages.some((m) => !m.readAt && !m.fromDoctor);
              const sel = t.patientId === (selectedPatientId ?? filteredThreads[0]?.patientId);
              return (
                <li key={t.patientId}>
                  <button
                    type="button"
                    onClick={() => openThread(t)}
                    className={
                      "flex w-full items-start gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition duration-200 " +
                      (sel ? "bg-hs-paper font-semibold text-hs-ink shadow-sm" : "text-hs-text-secondary hover:bg-hs-cream/90 hover:shadow-sm")
                    }
                  >
                    {unread ? (
                      <span
                        className="mt-1 h-2 w-2 shrink-0 rounded-full bg-hs-primary"
                        aria-label="Unread"
                      />
                    ) : (
                      <span className="mt-1 h-2 w-2 shrink-0" aria-hidden />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{t.patientName}</span>
                      <span className="mt-0.5 block truncate text-xs text-hs-text-tertiary">
                        {latest.fromDoctor ? "You: " : ""}
                        {latest.body}
                      </span>
                    </span>
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
                const delivered = Boolean(m.readAt);
                const { text, attachments } = parseAttachments(m.body);
                return (
                  <div
                    key={m.id}
                    className={
                      "max-w-[78%] rounded-2xl border px-4 py-2.5 text-sm text-hs-ink shadow-sm " +
                      (fromDoc
                        ? "ml-auto rounded-tr-sm border-hs-primary/25 bg-hs-primary/95 text-white"
                        : "mr-auto rounded-tl-sm border-hs-border/30 bg-hs-primary-very-light/80")
                    }
                  >
                    {text ? (
                      <p className={"whitespace-pre-wrap leading-relaxed " + (fromDoc ? "text-white" : "")}>{text}</p>
                    ) : null}
                    {attachments.map((a) => (
                      <AttachmentChip key={a.objectKey} filename={a.filename} objectKey={a.objectKey} />
                    ))}
                    <div
                      className={
                        "mt-1.5 flex items-center justify-end gap-1 text-[10px] font-medium " +
                        (fromDoc ? "text-white/80" : "text-hs-text-tertiary")
                      }
                    >
                      <span>{formatTime(m.createdAt)}</span>
                      {fromDoc ? (
                        delivered ? (
                          <CheckCheck className="h-3 w-3" aria-label="Read" />
                        ) : (
                          <Check className="h-3 w-3" aria-label="Sent" />
                        )
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-hs-border/25 p-4 px-6">
              <div className="flex items-center justify-between gap-2">
                <p className="text-typo-small font-semibold uppercase tracking-wide text-hs-text-tertiary">
                  Quick replies
                </p>
                {replyText.trim() ? (
                  <button
                    type="button"
                    onClick={saveCurrentAsTemplate}
                    className="text-[10px] font-semibold uppercase tracking-wide text-hs-primary hover:underline"
                  >
                    + Save as template
                  </button>
                ) : null}
              </div>
              <div className="mb-2 mt-1.5 flex flex-wrap gap-1.5">
                {allQuickReplies.map((q) => {
                  const custom = q.id.startsWith("custom-");
                  return (
                    <span
                      key={q.id}
                      className={
                        "inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium text-hs-ink transition " +
                        (custom
                          ? "border-hs-primary/30 bg-hs-primary-very-light/70"
                          : "border-hs-border/40 bg-hs-cream/70 hover:border-hs-primary/35 hover:bg-hs-paper")
                      }
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setReplyText(q.text);
                          setSendError(null);
                        }}
                        title={q.text}
                      >
                        {q.label}
                      </button>
                      {custom ? (
                        <button
                          type="button"
                          onClick={() => removeCustomTemplate(q.id)}
                          aria-label="Remove template"
                          className="rounded p-0.5 text-hs-text-tertiary hover:text-rose-700"
                        >
                          <X className="h-3 w-3" aria-hidden />
                        </button>
                      ) : null}
                    </span>
                  );
                })}
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
              {pendingAttachment ? (
                <div className="mt-2 inline-flex items-center gap-2 rounded-lg border border-hs-primary/30 bg-hs-primary-very-light/70 px-2 py-1 text-caption-sm text-hs-ink">
                  <Paperclip className="h-3.5 w-3.5 text-hs-primary" aria-hidden />
                  <span className="max-w-[260px] truncate">{pendingAttachment.filename}</span>
                  <button
                    type="button"
                    onClick={() => setPendingAttachment(null)}
                    className="rounded p-0.5 text-hs-text-tertiary hover:text-hs-ink"
                    aria-label="Remove attachment"
                  >
                    <X className="h-3 w-3" aria-hidden />
                  </button>
                </div>
              ) : null}
              {sendError ? <p className="mt-1 text-xs text-rose-800">{sendError}</p> : null}
              <div className="mt-2 flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadAttachment(f);
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={attachmentUploading || Boolean(pendingAttachment)}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-hs-border/50 px-3 text-sm font-semibold text-hs-text-secondary transition hover:border-hs-primary/40 hover:text-hs-ink disabled:opacity-50"
                  aria-label="Attach a file"
                >
                  {attachmentUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Paperclip className="h-4 w-4" aria-hidden />
                  )}
                  <span className="hidden sm:inline">Attach</span>
                </button>
                <button
                  type="button"
                  disabled={sending || (!replyText.trim() && !pendingAttachment)}
                  onClick={() => void sendReply()}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-hs-primary px-5 text-sm font-bold text-white shadow-md hover:bg-hs-primary-light disabled:opacity-50"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send
                </button>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

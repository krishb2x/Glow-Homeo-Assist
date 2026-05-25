"use client";

import Link from "next/link";
import { Info, Megaphone } from "lucide-react";
import { PageHeader } from "../../platform/PageHeader";
import { MessagesChatView } from "./MessagesChatView";

/**
 * Full-width patient messages — list + conversation (inbox).
 *
 * Messaging model:
 * - Patients initiate clinical threads from their patient app or by replying
 *   to a WhatsApp/email notification. The doctor sees those in this inbox
 *   and can reply directly.
 * - The clinic can also start outbound conversations using the WhatsApp
 *   broadcast tool (Meta-approved templates only — required by Meta policy
 *   when no 24h session window is open).
 */
export function MessagesView(): JSX.Element {
  return (
    <div className="w-full min-w-0 space-y-ds-lg">
      <PageHeader
        className="mb-ds-lg border-b border-hs-border/30 pb-ds-md"
        title="Messages"
        description="Patient-initiated threads in real time. Use Broadcast for outbound outreach."
        action={
          <Link
            href="/messages/broadcast"
            className="inline-flex items-center gap-1.5 rounded-lg border border-hs-primary/35 bg-hs-primary-very-light px-3 py-1.5 text-caption-sm font-semibold text-hs-primary transition hover:bg-hs-primary/15"
          >
            <Megaphone className="h-3.5 w-3.5" aria-hidden />
            New broadcast
          </Link>
        }
      />

      <div
        role="note"
        className="flex items-start gap-2.5 rounded-2xl border border-hs-border/25 bg-hs-paper/85 px-4 py-3 text-caption-sm text-hs-text-secondary"
      >
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-hs-primary" aria-hidden />
        <p className="leading-relaxed">
          <span className="font-semibold text-hs-ink">Who can start a conversation?</span>{" "}
          Patients can message you any time from their patient app or by replying to your
          appointment/prescription messages. To start a new outbound conversation, use
          {" "}
          <Link href="/messages/broadcast" className="font-semibold text-hs-primary hover:underline">
            WhatsApp Broadcast
          </Link>{" "}
          — Meta&rsquo;s template policy requires an approved template when no patient session
          is active.
        </p>
      </div>

      <MessagesChatView />
    </div>
  );
}

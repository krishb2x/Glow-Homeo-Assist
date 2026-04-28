"use client";

import { PageHeader } from "../../platform/PageHeader";
import { MessagesChatView } from "./MessagesChatView";

/** Full-width patient messages — list + conversation (inbox). */
export function MessagesView(): JSX.Element {
  return (
    <div className="w-full min-w-0 space-y-ds-lg">
      <PageHeader
        className="mb-ds-lg border-b border-hs-border/30 pb-ds-md"
        title="Messages"
        description="Secure patient threads — quick replies and full chart from one place."
      />
      <MessagesChatView />
    </div>
  );
}

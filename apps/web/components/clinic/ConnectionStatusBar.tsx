"use client";

import { useEffect, useState } from "react";
import { CloudOff } from "lucide-react";

/** Live connection indicator — favours a stable, non-technical readout. */
export function ConnectionStatusBar({ disconnectedOnly }: { disconnectedOnly?: boolean }): JSX.Element {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    if (typeof window === "undefined") return;
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    setOnline(navigator.onLine);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (!online) {
    return (
      <div
        className="flex items-center gap-1.5 text-[12px] font-semibold text-amber-600"
        title="Offline. Trying to reconnect..."
      >
        <CloudOff className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} />
        <span>Reconnecting…</span>
      </div>
    );
  }

  if (disconnectedOnly) {
    return <></>;
  }

  return (
    <div
      className="flex items-center gap-1.5 text-[11px] font-medium text-hs-text-tertiary"
      title="You are online"
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500 ring-2 ring-emerald-500/30"
        aria-hidden
      />
      <span>Connected</span>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { CloudOff } from "lucide-react";

/** Live connection indicator — favours a stable, non-technical readout. */
export function ConnectionStatusBar(): JSX.Element {
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
        className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-900/90"
        title="You can keep working. Notes and drafts may be stored on this device until you are back online."
      >
        <CloudOff className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} />
        <span>Offline — work is saved on this device</span>
      </div>
    );
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

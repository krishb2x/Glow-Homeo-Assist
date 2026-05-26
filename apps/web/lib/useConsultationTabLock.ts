"use client";

import { useEffect, useState } from "react";

const CHANNEL = "homeoassist-consultation-tab";

/** Prevent two live consultation tabs for the same visit. */
export function useConsultationTabLock(consultationId: string | null, enabled: boolean): {
  blocked: boolean;
  takeOver: () => void;
} {
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (!enabled || !consultationId || typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(`${CHANNEL}:${consultationId}`);
    let isLeader = false;

    const ping = (): void => {
      channel.postMessage({ type: "ping", at: Date.now() });
    };

    channel.onmessage = (ev: MessageEvent<{ type: string }>) => {
      if (ev.data?.type === "ping" && !isLeader) {
        setBlocked(true);
      }
      if (ev.data?.type === "takeover") {
        isLeader = false;
        setBlocked(true);
      }
    };

    isLeader = true;
    ping();
    const interval = setInterval(ping, 4000);

    return () => {
      clearInterval(interval);
      channel.close();
    };
  }, [consultationId, enabled]);

  function takeOver(): void {
    if (!consultationId || typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(`${CHANNEL}:${consultationId}`);
    channel.postMessage({ type: "takeover" });
    channel.close();
    setBlocked(false);
  }

  return { blocked, takeOver };
}

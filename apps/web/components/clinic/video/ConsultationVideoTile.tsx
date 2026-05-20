"use client";

import { Video, WifiOff } from "lucide-react";
import { cn } from "../../../lib/cn";

type Props = {
  className?: string;
  /** Phase 3: wire WebRTC room id here. */
  roomReady?: boolean;
};

/** Placeholder video tile for ONLINE consult mode (WebRTC in phase 3). */
export function ConsultationVideoTile({ className, roomReady = false }: Props): JSX.Element {
  return (
    <section
      className={cn(
        "relative flex aspect-video shrink-0 flex-col items-center justify-center border-b border-hs-border/30 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-3 py-4 text-center",
        className
      )}
      aria-label="Video consultation"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white/90">
        <Video className="h-6 w-6" aria-hidden />
      </div>
      <p className="mt-3 font-heading text-body-sm font-semibold text-white">Online consult</p>
      <p className="mt-1 max-w-[220px] text-caption-sm text-white/70">
        {roomReady
          ? "Video room provisioning is ready — WebRTC connects in the next release."
          : "Video session will appear here when telehealth is enabled for this clinic."}
      </p>
      <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/80">
        <WifiOff className="h-3 w-3" aria-hidden />
        Audio + chart active
      </span>
    </section>
  );
}

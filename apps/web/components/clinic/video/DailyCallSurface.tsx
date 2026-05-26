"use client";

import Daily, {
  type DailyCall,
  type DailyEventObjectNetworkQualityEvent
} from "@daily-co/daily-js";
import { Mic, MicOff, PhoneOff, RefreshCw, Video, VideoOff, Wifi, WifiOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../../../lib/cn";

type ConnectionQuality = "good" | "fair" | "poor" | "unknown";

type Props = {
  roomUrl: string;
  meetingToken: string;
  className?: string;
  compact?: boolean;
  onLeave?: () => void;
  onReconnectNeeded?: () => void;
  isPatient?: boolean;
};

function qualityFromNetwork(
  state?: string,
  threshold?: string
): ConnectionQuality {
  if (state === "good" || threshold === "good") return "good";
  if (state === "warning" || threshold === "low") return "fair";
  if (state === "bad" || threshold === "very-low") return "poor";
  return "unknown";
}

/** Minimal embedded Daily.co call — healthcare-native with reconnect support. */
export function DailyCallSurface({
  roomUrl,
  meetingToken,
  className,
  compact = false,
  onLeave,
  onReconnectNeeded,
  isPatient = false
}: Props): JSX.Element {
  const callRef = useRef<DailyCall | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const [joined, setJoined] = useState(false);
  const joinedRef = useRef(false);
  const [waiting, setWaiting] = useState(false);
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>("unknown");
  const [remotePresent, setRemotePresent] = useState(false);

  const attachTracks = useCallback((call: DailyCall) => {
    const participants = call.participants();
    let hasRemote = false;
    for (const p of Object.values(participants)) {
      if (!p.local) hasRemote = true;
      if (p.tracks?.video?.persistentTrack && remoteVideoRef.current && !p.local) {
        remoteVideoRef.current.srcObject = new MediaStream([p.tracks.video.persistentTrack]);
      }
      if (p.tracks?.audio?.persistentTrack && remoteAudioRef.current && !p.local) {
        remoteAudioRef.current.srcObject = new MediaStream([p.tracks.audio.persistentTrack]);
      }
      if (p.local && p.tracks?.video?.persistentTrack && localVideoRef.current) {
        localVideoRef.current.srcObject = new MediaStream([p.tracks.video.persistentTrack]);
      }
    }
    setRemotePresent(hasRemote);
  }, []);

  useEffect(() => {
    if (!roomUrl || !meetingToken) return;
    let cancelled = false;
    const call = Daily.createCallObject({ subscribeToTracksAutomatically: true });
    callRef.current = call;

    const onJoined = (): void => {
      if (cancelled) return;
      joinedRef.current = true;
      setJoined(true);
      setWaiting(false);
      setReconnecting(false);
      setErr(null);
      attachTracks(call);
    };

    const onWaiting = (): void => {
      if (cancelled) return;
      setWaiting(true);
    };

    const onTrack = (): void => attachTracks(call);
    const onLeft = (): void => {
      joinedRef.current = false;
      setJoined(false);
      onLeave?.();
    };
    const onError = (ev: { errorMsg?: string; error?: { msg?: string } }): void => {
      const msg = ev.errorMsg ?? ev.error?.msg ?? "Video connection failed";
      setErr(msg);
      setReconnecting(false);
    };
    const onNetwork = (ev: DailyEventObjectNetworkQualityEvent): void => {
      setConnectionQuality(qualityFromNetwork(ev.networkState, ev.threshold));
    };

    call.on("joined-meeting", onJoined);
    call.on("waiting-participant-added", onWaiting);
    call.on("participant-joined", onTrack);
    call.on("participant-updated", onTrack);
    call.on("participant-left", onTrack);
    call.on("track-started", onTrack);
    call.on("left-meeting", onLeft);
    call.on("error", onError);
    call.on("network-quality-change", onNetwork);

    void call.join({ url: roomUrl, token: meetingToken }).catch((e: Error) => {
      if (!cancelled) setErr(e.message);
    });

    const onVisibility = (): void => {
      if (document.visibilityState === "visible" && callRef.current && joinedRef.current) {
        attachTracks(callRef.current);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      call.off("joined-meeting", onJoined);
      call.off("waiting-participant-added", onWaiting);
      call.off("participant-joined", onTrack);
      call.off("participant-updated", onTrack);
      call.off("participant-left", onTrack);
      call.off("track-started", onTrack);
      call.off("left-meeting", onLeft);
      call.off("error", onError);
      call.off("network-quality-change", onNetwork);
      void call.leave().catch(() => undefined);
      call.destroy();
      callRef.current = null;
    };
  }, [roomUrl, meetingToken, attachTracks, onLeave]);

  async function toggleMute(): Promise<void> {
    const call = callRef.current;
    if (!call) return;
    const next = !muted;
    await call.setLocalAudio(!next);
    setMuted(next);
  }

  async function toggleVideo(): Promise<void> {
    const call = callRef.current;
    if (!call) return;
    const next = !videoOff;
    await call.setLocalVideo(!next);
    setVideoOff(next);
  }

  async function endCall(): Promise<void> {
    const call = callRef.current;
    if (!call) return;
    await call.leave();
    onLeave?.();
  }

  async function reconnect(): Promise<void> {
    setReconnecting(true);
    setErr(null);
    onReconnectNeeded?.();
    const call = callRef.current;
    if (call) {
      try {
        await call.leave();
      } catch {
        /* ignore */
      }
    }
    setReconnecting(false);
  }

  const qualityLabel =
    connectionQuality === "good"
      ? "Connection good"
      : connectionQuality === "fair"
        ? "Connection fair"
        : connectionQuality === "poor"
          ? "Weak connection"
          : null;

  return (
    <div
      className={cn(
        "relative flex flex-1 flex-col bg-slate-950",
        compact ? "min-h-[140px]" : "min-h-[220px]",
        className
      )}
    >
      {qualityLabel && joined ? (
        <div className="absolute left-2 top-2 z-10 flex items-center gap-1 rounded-md bg-black/50 px-2 py-0.5 text-[10px] text-white/80">
          {connectionQuality === "poor" ? (
            <WifiOff className="h-3 w-3 text-amber-400" />
          ) : (
            <Wifi className="h-3 w-3 text-emerald-400" />
          )}
          {qualityLabel}
        </div>
      ) : null}

      {err ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
          <p className="text-caption-sm text-red-300">{err}</p>
          <button
            type="button"
            onClick={() => void reconnect()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-caption-sm font-semibold text-white hover:bg-white/15"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", reconnecting && "animate-spin")} />
            Reconnect
          </button>
        </div>
      ) : waiting && isPatient ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center text-white">
          <div className="relative flex h-12 w-12 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/30" />
            <span className="relative h-3 w-3 rounded-full bg-emerald-400" />
          </div>
          <p className="mt-4 font-heading text-body-sm font-semibold">Waiting for your doctor</p>
          <p className="mt-1 max-w-xs text-caption-sm text-white/70">
            Stay on this screen — you&apos;ll enter the consultation as soon as you&apos;re admitted.
          </p>
        </div>
      ) : (
        <div className="relative min-h-0 flex-1">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
          />
          {!joined && !waiting ? (
            <div className="absolute inset-0 flex items-center justify-center text-caption-sm text-white/70">
              {reconnecting ? "Reconnecting…" : "Connecting…"}
            </div>
          ) : joined && !remotePresent && !isPatient ? (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 px-4 text-center text-caption-sm text-white/70">
              Waiting for patient to join…
            </div>
          ) : null}
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={cn(
              "absolute rounded-lg border border-white/20 object-cover shadow-lg",
              compact ? "bottom-2 right-2 h-14 w-20" : "bottom-3 right-3 h-20 w-28 sm:h-24 sm:w-32"
            )}
          />
          <audio ref={remoteAudioRef} autoPlay playsInline />
        </div>
      )}

      {joined ? (
        <div className="flex items-center justify-center gap-2 border-t border-white/10 px-3 py-2">
          <button
            type="button"
            onClick={() => void toggleMute()}
            className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => void toggleVideo()}
            className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label={videoOff ? "Turn camera on" : "Turn camera off"}
          >
            {videoOff ? <VideoOff className="h-3.5 w-3.5" /> : <Video className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => void endCall()}
            className="rounded-full bg-red-600 p-2 text-white hover:bg-red-500"
            aria-label="End call"
          >
            <PhoneOff className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

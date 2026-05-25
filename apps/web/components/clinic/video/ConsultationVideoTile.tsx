"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Video, RefreshCw } from "lucide-react";
import { cn } from "../../../lib/cn";
import {
  fetchConsultationMeeting,
  fetchConsultationRecording,
  provisionConsultationVideo
} from "../../../lib/doctor-api";
import { JitsiMeetEmbed } from "./JitsiMeetEmbed";

type Props = {
  consultationId: string;
  className?: string;
};

export function ConsultationVideoTile({ consultationId, className }: Props): JSX.Element {
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [provisioning, setProvisioning] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const m = await fetchConsultationMeeting(consultationId);
      if (m.doctorJoinUrl) {
        setRoomUrl(m.doctorJoinUrl);
      } else {
        setRoomUrl(null);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not load video room");
    } finally {
      setLoading(false);
    }
  }, [consultationId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void (async () => {
      try {
        const rec = await fetchConsultationRecording(consultationId);
        setRecordingUrl(rec.url);
      } catch {
        setRecordingUrl(null);
      }
    })();
  }, [consultationId]);

  async function onProvision(): Promise<void> {
    setProvisioning(true);
    setErr(null);
    try {
      const s = await provisionConsultationVideo(consultationId, false);
      setRoomUrl(s.doctorJoinUrl);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not start video room");
    } finally {
      setProvisioning(false);
    }
  }

  return (
    <section
      className={cn(
        "relative flex aspect-video shrink-0 flex-col overflow-hidden border-b border-hs-border/30 bg-slate-900",
        className
      )}
      aria-label="Video consultation"
    >
      {loading ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-white/80">
          <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
          <p className="text-caption-sm">Connecting video room…</p>
        </div>
      ) : roomUrl ? (
        <>
          <JitsiMeetEmbed roomUrl={roomUrl} title="Doctor video consultation" className="min-h-[220px] flex-1" />
          {recordingUrl ? (
            <a
              href={recordingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-2 right-2 rounded-lg bg-black/70 px-2 py-1 text-[10px] font-semibold text-white hover:bg-black/90"
            >
              Download recording
            </a>
          ) : null}
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white/90">
            <Video className="h-6 w-6" aria-hidden />
          </div>
          <p className="mt-3 font-heading text-body-sm font-semibold text-white">Online consult</p>
          <p className="mt-1 max-w-[240px] text-caption-sm text-white/70">
            {err ?? "Start the video room when you are ready. The patient joins from the link sent on WhatsApp or email."}
          </p>
          <button
            type="button"
            onClick={() => void onProvision()}
            disabled={provisioning}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-hs-primary px-4 py-2 text-caption-md font-bold text-white disabled:opacity-60"
          >
            {provisioning ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Video className="h-4 w-4" aria-hidden />
            )}
            {provisioning ? "Starting…" : "Start video room"}
          </button>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-2 inline-flex items-center gap-1 text-caption-sm text-white/60 hover:text-white"
          >
            <RefreshCw className="h-3 w-3" aria-hidden />
            Refresh
          </button>
        </div>
      )}
    </section>
  );
}

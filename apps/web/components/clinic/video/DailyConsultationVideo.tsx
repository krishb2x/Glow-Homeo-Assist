"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, Loader2, MessageCircle, RefreshCw, UserCheck, Video } from "lucide-react";
import { cn } from "../../../lib/cn";
import {
  admitConsultationPatient,
  fetchConsultationMeeting,
  fetchConsultationRecording,
  fetchConsultationVideoSession,
  provisionConsultationVideo,
  resendAppointmentInvite
} from "../../../lib/doctor-api";
import { useVideoSessionRealtime } from "../../../lib/use-video-session-realtime";
import { DailyCallSurface } from "./DailyCallSurface";

const TOKEN_REFRESH_MS = 90 * 60 * 1000;

type Props = {
  consultationId: string;
  className?: string;
  compact?: boolean;
  appointmentId?: string | null;
};

export function DailyConsultationVideo({
  consultationId,
  className,
  compact = false,
  appointmentId: appointmentIdProp
}: Props): JSX.Element {
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [meetingToken, setMeetingToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [provisioning, setProvisioning] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [patientJoinUrl, setPatientJoinUrl] = useState<string | null>(null);
  const [patientWaiting, setPatientWaiting] = useState(false);
  const [admitting, setAdmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [resending, setResending] = useState(false);
  const [videoSessionId, setVideoSessionId] = useState<string | null>(null);
  const [appointmentId, setAppointmentId] = useState<string | null>(appointmentIdProp ?? null);
  const [tokenKey, setTokenKey] = useState(0);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    setErr(null);
    try {
      const [m, session] = await Promise.all([
        fetchConsultationMeeting(consultationId),
        fetchConsultationVideoSession(consultationId)
      ]);
      const url = m.roomUrl ?? m.doctorJoinUrl;
      if (url && m.meetingToken) {
        setRoomUrl(url);
        setMeetingToken((prev) => {
          if (prev !== m.meetingToken) setTokenKey((k) => k + 1);
          return m.meetingToken!;
        });
      } else if (!opts?.silent) {
        setRoomUrl(null);
        setMeetingToken(null);
      }
      setPatientJoinUrl(session.patientJoinUrl);
      setAppointmentId(session.appointmentId ?? appointmentIdProp ?? null);
      const vs = session.videoSession as {
        patient_waiting_since?: string | null;
        id?: string;
        status?: string;
      } | null;
      setPatientWaiting(Boolean(vs?.patient_waiting_since));
      setVideoSessionId(vs?.id ?? m.videoSessionId ?? null);
    } catch (e) {
      if (!opts?.silent) {
        setErr(e instanceof Error ? e.message : "Could not load video room");
      }
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, [consultationId, appointmentIdProp]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!roomUrl || !meetingToken) return;
    const id = setInterval(() => void load({ silent: true }), TOKEN_REFRESH_MS);
    return () => clearInterval(id);
  }, [roomUrl, meetingToken, load]);

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

  const onRealtimeChange = useMemo(
    () => (row: { patient_waiting_since?: string | null; status?: string; patient_joined_at?: string | null }) => {
      if (row.patient_waiting_since) setPatientWaiting(true);
      else if (row.patient_waiting_since === null) setPatientWaiting(false);
      if (row.status === "LIVE" && row.patient_joined_at) setPatientWaiting(false);
    },
    []
  );

  useVideoSessionRealtime({
    consultationId,
    videoSessionId,
    enabled: Boolean(videoSessionId),
    onChange: onRealtimeChange
  });

  async function onProvision(): Promise<void> {
    setProvisioning(true);
    setErr(null);
    try {
      const s = await provisionConsultationVideo(consultationId, false);
      setRoomUrl(s.roomUrl);
      setMeetingToken(s.doctorMeetingToken);
      setPatientJoinUrl(s.patientJoinUrl);
      setTokenKey((k) => k + 1);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not start video room");
    } finally {
      setProvisioning(false);
    }
  }

  async function onAdmit(): Promise<void> {
    setAdmitting(true);
    try {
      await admitConsultationPatient(consultationId);
      setPatientWaiting(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not admit patient");
    } finally {
      setAdmitting(false);
    }
  }

  async function copyLink(): Promise<void> {
    if (!patientJoinUrl) return;
    await navigator.clipboard.writeText(patientJoinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function onResendInvite(): Promise<void> {
    if (!appointmentId) return;
    setResending(true);
    try {
      await resendAppointmentInvite(appointmentId);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not resend invite");
    } finally {
      setResending(false);
    }
  }

  return (
    <section
      className={cn(
        "relative flex shrink-0 flex-col overflow-hidden bg-slate-900",
        compact ? "rounded-xl border border-white/10" : "border-b border-hs-border/30",
        className
      )}
      aria-label="Video consultation"
    >
      {!compact && patientJoinUrl ? (
        <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
          <p className="min-w-0 flex-1 truncate text-[10px] text-white/60">{patientJoinUrl}</p>
          <button
            type="button"
            onClick={() => void copyLink()}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-[10px] font-semibold text-white hover:bg-white/15"
          >
            <Copy className="h-3 w-3" />
            {copied ? "Copied" : "Copy"}
          </button>
          {appointmentId ? (
            <button
              type="button"
              onClick={() => void onResendInvite()}
              disabled={resending}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-[10px] font-semibold text-white hover:bg-white/15 disabled:opacity-60"
            >
              {resending ? <Loader2 className="h-3 w-3 animate-spin" /> : <MessageCircle className="h-3 w-3" />}
              Resend
            </button>
          ) : null}
        </div>
      ) : null}

      {patientWaiting ? (
        <div className="flex items-center justify-between gap-2 border-b border-amber-500/30 bg-amber-950/40 px-3 py-2">
          <p className="text-caption-sm font-medium text-amber-100">Patient waiting</p>
          <button
            type="button"
            onClick={() => void onAdmit()}
            disabled={admitting}
            className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-2.5 py-1 text-[10px] font-bold text-white disabled:opacity-60"
          >
            {admitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserCheck className="h-3 w-3" />}
            Admit
          </button>
        </div>
      ) : null}

      {loading ? (
        <div
          className={cn(
            "flex flex-col items-center justify-center gap-2 text-white/80",
            compact ? "aspect-[16/9] min-h-[120px]" : "aspect-video"
          )}
        >
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          <p className="text-caption-sm">Connecting…</p>
        </div>
      ) : roomUrl && meetingToken ? (
        <>
          <DailyCallSurface
            key={tokenKey}
            roomUrl={roomUrl}
            meetingToken={meetingToken}
            compact={compact}
            onReconnectNeeded={() => void load({ silent: true })}
            className={compact ? "min-h-[120px]" : "aspect-video min-h-[220px]"}
          />
          {recordingUrl && !compact ? (
            <a
              href={recordingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-14 right-2 rounded-lg bg-black/70 px-2 py-1 text-[10px] font-semibold text-white hover:bg-black/90"
            >
              Recording
            </a>
          ) : null}
        </>
      ) : (
        <div
          className={cn(
            "flex flex-col items-center justify-center px-4 py-4 text-center",
            compact ? "min-h-[120px]" : "aspect-video py-6"
          )}
        >
          {!compact ? (
            <>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white/90">
                <Video className="h-5 w-5" aria-hidden />
              </div>
              <p className="mt-2 font-heading text-body-sm font-semibold text-white">Online consult</p>
            </>
          ) : null}
          <p className="mt-1 max-w-[240px] text-caption-sm text-white/70">
            {err ?? (compact ? "Start video" : "Start the video room when ready.")}
          </p>
          <button
            type="button"
            onClick={() => void onProvision()}
            disabled={provisioning}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-hs-primary px-3 py-1.5 text-caption-sm font-bold text-white disabled:opacity-60"
          >
            {provisioning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Video className="h-3.5 w-3.5" />}
            {provisioning ? "Starting…" : "Start video"}
          </button>
          {!compact ? (
            <button
              type="button"
              onClick={() => void load()}
              className="mt-2 inline-flex items-center gap-1 text-caption-sm text-white/60 hover:text-white"
            >
              <RefreshCw className="h-3 w-3" />
              Refresh
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}

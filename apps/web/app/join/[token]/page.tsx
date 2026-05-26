"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { fetchPublicJoin, postRecordingConsent, type PublicJoinResponse } from "../../../lib/doctor-api";
import { DailyCallSurface } from "../../../components/clinic/video/DailyCallSurface";
import { useVideoSessionRealtime } from "../../../lib/use-video-session-realtime";

function formatWhen(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  } catch {
    return iso;
  }
}

export default function PatientJoinPage(): JSX.Element {
  const params = useParams();
  const token = typeof params.token === "string" ? params.token : "";
  const [data, setData] = useState<PublicJoinResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [consent, setConsent] = useState(false);
  const [sessionEntered, setSessionEntered] = useState(false);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const next = await fetchPublicJoin(token);
      setData(next);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "This link is invalid or has expired.");
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setErr("Invalid link");
      setLoading(false);
      return;
    }
    void (async () => {
      await refresh();
      setLoading(false);
    })();
  }, [token, refresh]);

  useEffect(() => {
    if (!data || data.mode !== "scheduled") return;
    const id = setInterval(() => void refresh(), 6000);
    return () => clearInterval(id);
  }, [data, refresh]);

  useEffect(() => {
    if (!data || data.mode !== "live") return;
    const id = setInterval(() => void refresh(), 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [data, refresh]);

  const liveData = data?.mode === "live" ? data : null;
  useVideoSessionRealtime({
    consultationId: liveData?.consultationId ?? "none",
    videoSessionId: liveData?.videoSessionId ?? null,
    enabled: Boolean(liveData?.videoSessionId),
    onChange: () => void refresh()
  });

  if (loading) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-b from-slate-900 to-slate-950 text-white">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-emerald-400" />
          <p className="mt-4 text-body-sm text-white/70">Preparing your consultation…</p>
        </div>
      </main>
    );
  }

  if (err || !data) {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-slate-950 px-6 text-center text-white">
        <h1 className="font-heading text-xl font-semibold">Unable to join</h1>
        <p className="mt-2 max-w-md text-body-sm text-white/70">{err ?? "Link not found"}</p>
        <p className="mt-4 text-caption-sm text-white/45">Contact your clinic if you need a new link.</p>
      </main>
    );
  }

  if (data.mode === "live") {
    const needsConsentGate = Boolean(data.recordingEnabled) && !sessionEntered;
    return (
      <main className="flex min-h-[100dvh] flex-col bg-slate-950">
        <header className="border-b border-white/10 px-4 py-4 text-white safe-area-inset-top">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-emerald-400/90">
            {data.clinicName}
          </p>
          <h1 className="mt-1 font-heading text-lg font-semibold">Dr. {data.doctorName}</h1>
          <p className="mt-0.5 text-caption-sm text-white/70">Hi {data.patientName}</p>
        </header>

        {needsConsentGate ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center text-white">
            <p className="max-w-sm text-body-sm text-white/85">
              This consultation may be recorded for your medical record. By continuing, you consent to
              telemedicine and optional recording under your clinic&apos;s privacy policy.
            </p>
            <label className="mt-6 flex max-w-sm cursor-pointer items-start gap-3 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-left text-caption-sm">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-white/30"
              />
              <span>I agree to join this secure video consultation</span>
            </label>
            <button
              type="button"
              disabled={!consent}
              onClick={() => {
                void postRecordingConsent(token).catch(() => undefined);
                setSessionEntered(true);
              }}
              className="mt-4 rounded-xl bg-emerald-600 px-6 py-2.5 text-body-sm font-bold text-white disabled:opacity-40"
            >
              Enter consultation
            </button>
          </div>
        ) : (
          <div className="min-h-0 flex-1">
            <DailyCallSurface
              roomUrl={data.roomUrl}
              meetingToken={data.meetingToken}
              isPatient
              onReconnectNeeded={() => void refresh()}
              className="h-[calc(100dvh-88px)] w-full"
            />
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-950 px-6 text-center text-white">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-white/45">{data.clinicName}</p>
      <h1 className="mt-3 font-heading text-2xl font-semibold">Hi {data.patientName}</h1>
      <p className="mt-2 text-body-sm text-white/75">
        Appointment with Dr. {data.doctorName}
        {data.scheduledFor ? (
          <>
            <br />
            <span className="text-white/90">{formatWhen(data.scheduledFor)}</span>
          </>
        ) : null}
      </p>
      <div className="mt-8 flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-4 py-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        <span className="text-caption-sm font-medium text-emerald-100">Waiting for your doctor</span>
      </div>
      <p className="mt-6 max-w-sm text-body-sm leading-relaxed text-white/65">{data.message}</p>
      <p className="mt-4 text-[11px] text-white/40">Keep this page open — it connects automatically.</p>
    </main>
  );
}

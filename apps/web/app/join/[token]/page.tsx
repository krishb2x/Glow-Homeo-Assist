"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { fetchPublicJoin, type PublicJoinResponse } from "../../../lib/doctor-api";
import { JitsiMeetEmbed } from "../../../components/clinic/video/JitsiMeetEmbed";

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

  useEffect(() => {
    if (!token) {
      setErr("Invalid link");
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        setData(await fetchPublicJoin(token));
      } catch (e) {
        setErr(e instanceof Error ? e.message : "This link is invalid or has expired.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-body-sm">Loading your consultation…</p>
      </main>
    );
  }

  if (err || !data) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 text-center text-white">
        <h1 className="font-heading text-xl font-semibold">Unable to join</h1>
        <p className="mt-2 max-w-md text-body-sm text-white/70">{err ?? "Link not found"}</p>
      </main>
    );
  }

  if (data.mode === "live") {
    return (
      <main className="flex min-h-screen flex-col bg-slate-950">
        <header className="border-b border-white/10 px-4 py-3 text-white">
          <p className="text-caption-sm text-white/60">{data.clinicName}</p>
          <h1 className="font-heading text-lg font-semibold">
            Consultation with Dr. {data.doctorName}
          </h1>
          <p className="text-caption-sm text-white/70">Hi {data.patientName} — tap Allow for camera and microphone when prompted.</p>
        </header>
        <div className="min-h-0 flex-1">
          <JitsiMeetEmbed roomUrl={data.jitsiUrl} title="Patient video consultation" className="h-[calc(100vh-88px)] w-full" />
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-950 px-6 text-center text-white">
      <p className="text-caption-sm uppercase tracking-widest text-white/50">{data.clinicName}</p>
      <h1 className="mt-2 font-heading text-2xl font-semibold">Hi {data.patientName}</h1>
      <p className="mt-1 text-body-sm text-white/70">
        Appointment with Dr. {data.doctorName}
        {data.scheduledFor ? ` · ${formatWhen(data.scheduledFor)}` : ""}
      </p>
      <p className="mt-6 max-w-md text-body-sm text-white/80">{data.message}</p>
    </main>
  );
}

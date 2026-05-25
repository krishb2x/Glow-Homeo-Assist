"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { fetchPublicPrescription, type PublicPrescriptionResponse } from "../../../../lib/doctor-api";

export default function PatientPrescriptionPage(): JSX.Element {
  const params = useParams();
  const token = typeof params.token === "string" ? params.token : "";
  const [data, setData] = useState<PublicPrescriptionResponse | null>(null);
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
        setData(await fetchPublicPrescription(token));
      } catch (e) {
        setErr(e instanceof Error ? e.message : "This prescription link has expired.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-hs-cream">
        <p className="text-body-sm text-hs-text-secondary">Loading prescription…</p>
      </main>
    );
  }

  if (err || !data) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-hs-cream px-6 text-center">
        <h1 className="font-heading text-xl font-semibold text-hs-ink">Prescription unavailable</h1>
        <p className="mt-2 text-body-sm text-hs-text-secondary">{err}</p>
      </main>
    );
  }

  const items = Array.isArray(data.prescription?.items) ? (data.prescription!.items as unknown[]) : [];

  return (
    <main className="mx-auto min-h-screen max-w-lg bg-hs-cream px-6 py-10">
      <header className="mb-8 border-b border-hs-border/30 pb-6">
        <p className="text-caption-sm font-medium uppercase tracking-wide text-hs-text-tertiary">Prescription</p>
        <h1 className="mt-1 font-heading text-2xl font-semibold text-hs-ink">{data.patientName}</h1>
        {data.prescription?.created_at ? (
          <p className="mt-1 text-caption-sm text-hs-text-secondary">
            {new Date(data.prescription.created_at).toLocaleString()}
          </p>
        ) : null}
      </header>

      {items.length === 0 ? (
        <p className="text-body-sm text-hs-text-secondary">No prescription items on file for this visit.</p>
      ) : (
        <ul className="space-y-4" role="list">
          {items.map((item, i) => (
            <li
              key={i}
              className="rounded-2xl border border-hs-border/40 bg-white p-4 shadow-card text-body-sm text-hs-ink"
            >
              {typeof item === "object" && item !== null ? (
                <pre className="whitespace-pre-wrap font-sans text-body-sm">
                  {JSON.stringify(item, null, 2)}
                </pre>
              ) : (
                <span>{String(item)}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-10 text-caption-sm text-hs-text-tertiary">
        This link is private. Do not share it. Contact your clinic if you need a new copy.
      </p>
    </main>
  );
}

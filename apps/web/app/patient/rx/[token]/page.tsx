"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Download, Pill } from "lucide-react";
import { mapStoredPrescriptionItems } from "@homeoassist/print";
import { fetchPublicPrescription, type PublicPrescriptionResponse } from "../../../../lib/doctor-api";

function formatWhen(iso: string | null | undefined): string {
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

  const items = useMemo(
    () => mapStoredPrescriptionItems(data?.prescription?.items),
    [data?.prescription?.items]
  );

  if (loading) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-b from-slate-50 to-white">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-hs-primary/20 border-t-hs-primary" />
          <p className="mt-4 text-body-sm text-hs-text-secondary">Loading your prescription…</p>
        </div>
      </main>
    );
  }

  if (err || !data) {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-slate-50 px-6 text-center">
        <h1 className="font-heading text-xl font-semibold text-hs-ink">Prescription unavailable</h1>
        <p className="mt-2 max-w-md text-body-sm text-hs-text-secondary">{err}</p>
        <p className="mt-4 text-caption-sm text-hs-text-tertiary">Contact your clinic if you need a new copy.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-[100dvh] max-w-lg bg-gradient-to-b from-slate-50 to-white px-5 py-8 safe-area-inset-top safe-area-inset-bottom">
      <header className="mb-6 rounded-2xl border border-hs-border/30 bg-white px-5 py-5 shadow-sm">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-hs-primary">Prescription</p>
        <h1 className="mt-1 font-heading text-2xl font-semibold text-hs-ink">{data.patientName}</h1>
        {data.prescription?.created_at ? (
          <p className="mt-1 text-caption-sm text-hs-text-secondary">{formatWhen(data.prescription.created_at)}</p>
        ) : null}
      </header>

      {items.length === 0 ? (
        <p className="rounded-2xl border border-hs-border/30 bg-white px-5 py-8 text-center text-body-sm text-hs-text-secondary">
          No medicines were recorded for this visit. Contact your clinic if this looks wrong.
        </p>
      ) : (
        <ul className="space-y-3" role="list">
          {items.map((item, i) => (
            <li
              key={`${item.name}-${i}`}
              className="rounded-2xl border border-hs-border/30 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-hs-primary-very-light text-hs-primary">
                  <Pill className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-hs-ink">{item.name}</p>
                  <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-caption-sm text-hs-text-secondary">
                    {item.kind === "remedy" && item.potency !== "—" ? (
                      <>
                        <dt className="text-hs-text-tertiary">Potency</dt>
                        <dd>{item.potency}</dd>
                      </>
                    ) : null}
                    <dt className="text-hs-text-tertiary">Dose</dt>
                    <dd>{item.dosage}</dd>
                    <dt className="text-hs-text-tertiary">Frequency</dt>
                    <dd>{item.frequency}</dd>
                    <dt className="text-hs-text-tertiary">Duration</dt>
                    <dd>{item.duration}</dd>
                  </dl>
                  {item.instructions ? (
                    <p className="mt-2 rounded-lg bg-hs-cream/60 px-3 py-2 text-caption-sm text-hs-ink">
                      {item.instructions}
                    </p>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8 space-y-3">
        <button
          type="button"
          onClick={() => window.print()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-hs-primary px-4 py-3 text-body-sm font-semibold text-white shadow-sm"
        >
          <Download className="h-4 w-4" aria-hidden />
          Save or print
        </button>
        <p className="text-center text-caption-sm text-hs-text-tertiary">
          This link is private. Do not share it. Contact your clinic if you need help.
        </p>
      </div>

      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
          button {
            display: none !important;
          }
        }
      `}</style>
    </main>
  );
}

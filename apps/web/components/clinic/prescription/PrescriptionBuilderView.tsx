"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, FileText, Plus, Printer } from "lucide-react";
import { fetchPatients, getToken, type PatientListItem } from "../../../lib/doctor-api";

const POTENCY_OPTIONS = ["6C", "12C", "30C", "200C", "1M", "10M", "Q (mother tincture)"] as const;
const REMEDY_AUTOCOMPLETE = [
  "Aconitum napellus",
  "Apis mellifica",
  "Arnica montana",
  "Arsenicum album",
  "Bryonia alba",
  "Calendula officinalis",
  "Nux vomica",
  "Pulsatilla nigricans",
  "Rhus tox",
  "Silicea"
];

type Row = { id: string; remedy: string; potency: string; dosage: string };

function newRow(): Row {
  return { id: crypto.randomUUID(), remedy: "", potency: "30C", dosage: "" };
}

const TEMPLATES: Record<string, Row[]> = {
  "Standard flu protocol": [
    { id: "t1", remedy: "Aconitum napellus", potency: "30C", dosage: "Every 2h for first 24h if needed" },
    { id: "t2", remedy: "Gelsemium sempervirens", potency: "30C", dosage: "3× daily, 3 days" }
  ],
  "Calm acute — 30C": [
    { id: "t1", remedy: "Pulsatilla nigricans", potency: "30C", dosage: "Single dose, observe" }
  ],
  "Topical + oral": [
    { id: "t1", remedy: "Calendula officinalis", potency: "Q (mother tincture)", dosage: "Dilute 1:10, apply" },
    { id: "t2", remedy: "Hypericum", potency: "200C", dosage: "1 dose as directed" }
  ]
};

type Props = { patientId: string };

function loadDraft(patientId: string): Row[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`ha_rx_draft_${patientId}`);
    if (!raw) return null;
    const p = JSON.parse(raw) as Row[];
    return Array.isArray(p) ? p : null;
  } catch {
    return null;
  }
}

function saveDraft(patientId: string, rows: Row[]): void {
  try {
    localStorage.setItem(`ha_rx_draft_${patientId}`, JSON.stringify(rows));
  } catch {
    /* */
  }
}

export function PrescriptionBuilderView({ patientId }: Props): JSX.Element {
  const router = useRouter();
  const listId = useId();
  const [patient, setPatient] = useState<PatientListItem | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([newRow()]);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [signedMode, setSignedMode] = useState<"draft" | "signed">("draft");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const today = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
    []
  );

  useEffect(() => {
    if (typeof window === "undefined" || !getToken()) {
      router.replace("/login");
      return;
    }
    void (async () => {
      setLoadError(null);
      try {
        const all = await fetchPatients();
        const p = all.find((x) => x.id === patientId) ?? null;
        setPatient(p);
        if (!p) setLoadError("We could not find this patient in your clinic roster.");
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : "Failed to load");
      }
    })();
  }, [patientId, router]);

  useEffect(() => {
    const d = loadDraft(patientId);
    if (d && d.length) {
      setRows(
        d.map((r) => ({ ...r, id: r.id && r.id.length > 0 ? r.id : crypto.randomUUID() }))
      );
    }
  }, [patientId]);

  const addRow = useCallback(() => {
    setRows((r) => [...r, newRow()]);
  }, []);

  const updateRow = useCallback((id: string, field: keyof Omit<Row, "id">, value: string) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  }, []);

  const removeRow = useCallback((id: string) => {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== id)));
  }, []);

  const applyTemplate = useCallback((key: string) => {
    const t = TEMPLATES[key];
    if (!t) return;
    setRows(t.map((r) => ({ ...r, id: crypto.randomUUID() })));
    setTemplateOpen(false);
    setStatusMsg(`Template “${key}” applied. Review before finalising.`);
  }, []);

  const saveLocalDraft = useCallback(() => {
    saveDraft(patientId, rows);
    setStatusMsg("Draft saved on this device.");
  }, [patientId, rows]);

  const finalizeSign = useCallback(() => {
    setSignedMode("signed");
    setStatusMsg("Prescription marked as finalised (demo). In production, this would require signing.");
    try {
      localStorage.removeItem(`ha_rx_draft_${patientId}`);
    } catch {
      /* */
    }
  }, [patientId]);

  if (loadError) {
    return (
      <div className="rounded-2xl border border-rose-200/80 bg-rose-50/80 p-6 text-sm text-rose-900">
        {loadError}
        <p className="mt-3">
          <Link href="/patients" className="font-medium text-[#1B6B5C] underline-offset-2 hover:underline">
            Back to patients
          </Link>
        </p>
      </div>
    );
  }

  if (!patient) {
    return <p className="text-stone-500">Loading patient…</p>;
  }

  return (
    <div className="min-h-0 min-w-0 text-[#1C1917]">
      <div
        className="sticky top-0 z-20 -mx-4 border-b border-stone-200/80 bg-[#F7F5F0]/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6"
        role="region"
        aria-label="Prescription header"
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-4 lg:max-w-[90rem]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Prescription</p>
              <h1 className="text-xl font-semibold sm:text-2xl">{patient.name}</h1>
              <p className="mt-1 text-sm text-stone-500">
                {patient.age != null ? <span>{patient.age} years</span> : <span>Age not recorded</span>}
                <span className="mx-2" aria-hidden>
                  ·
                </span>
                <span>Gender: not specified</span>
                <span className="mx-2" aria-hidden>
                  ·
                </span>
                <time dateTime={new Date().toISOString().slice(0, 10)}>{today}</time>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={saveLocalDraft}
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-stone-200/90 bg-white px-4 text-sm font-medium text-[#1C1917] shadow-sm transition hover:border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-400/20"
              >
                Save draft
              </button>
              <button
                type="button"
                onClick={finalizeSign}
                disabled={signedMode === "signed"}
                className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#1B6B5C] px-4 text-sm font-semibold text-white shadow-sm transition enabled:hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#1B6B5C]/30"
              >
                {signedMode === "signed" ? "Finalised" : "Finalise & sign"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex min-h-[60vh] min-w-0 flex-col gap-6 lg:mt-8 lg:flex-row lg:gap-8">
        <div className="min-w-0 flex-1 space-y-4 [flex-basis:70%]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-[#1C1917]">Prescription lines</h2>
            <div className="relative">
              <button
                type="button"
                className="inline-flex min-h-9 items-center gap-1 rounded-xl border border-stone-200/80 bg-white px-3 text-sm text-[#1C1917] shadow-sm hover:border-stone-300"
                onClick={() => setTemplateOpen((o) => !o)}
                aria-expanded={templateOpen}
                aria-haspopup="listbox"
                id={`${listId}-template`}
              >
                Quick-add templates
                <ChevronDown className="h-4 w-4 opacity-60" aria-hidden />
              </button>
              {templateOpen ? (
                <ul
                  className="absolute right-0 z-30 mt-1 min-w-[12rem] rounded-xl border border-stone-200/80 bg-[#FFFCF8] py-1 text-sm shadow-sm"
                  role="listbox"
                  aria-labelledby={`${listId}-template`}
                >
                  {Object.keys(TEMPLATES).map((k) => (
                    <li key={k} role="option">
                      <button
                        type="button"
                        className="block w-full px-3 py-2.5 text-left text-[#1C1917] hover:bg-gh-cream/80"
                        onClick={() => applyTemplate(k)}
                      >
                        {k}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-stone-200/80 bg-[#FFFCF8] shadow-sm">
            <table className="w-full min-w-[640px] border-collapse text-left" role="grid" aria-label="Prescription form">
              <caption className="sr-only">Remedy, potency, and dosage for each line</caption>
              <thead>
                <tr className="border-b border-stone-200/90 bg-gh-cream/60 text-xs font-semibold uppercase tracking-wide text-stone-500">
                  <th scope="col" className="w-[32%] px-3 py-3 sm:px-4">
                    Remedy
                  </th>
                  <th scope="col" className="w-[14%] px-2 py-3 sm:px-3">
                    Potency
                  </th>
                  <th scope="col" className="px-2 py-3 sm:px-3">
                    Dosage
                  </th>
                  <th scope="col" className="w-12 px-2 py-3 text-right sm:w-14" aria-label="Row actions" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr
                    key={row.id}
                    className="border-b border-stone-100/90 last:border-0"
                  >
                    <td className="p-2 align-top sm:p-3">
                      <input
                        list={listId}
                        className="w-full rounded-lg border border-stone-200/90 bg-white px-2.5 py-2 text-sm text-[#1C1917] focus:border-[#1B6B5C]/40 focus:outline-none focus:ring-1 focus:ring-[#1B6B5C]/25"
                        value={row.remedy}
                        onChange={(e) => updateRow(row.id, "remedy", e.target.value)}
                        autoComplete="off"
                        placeholder="e.g. Pulsatilla nigricans"
                        aria-label={`Remedy for row ${rowIndex + 1}`}
                      />
                    </td>
                    <td className="p-2 align-top sm:p-3">
                      <label className="sr-only" htmlFor={`potency-${row.id}`}>
                        Potency for row {rowIndex + 1}
                      </label>
                      <select
                        id={`potency-${row.id}`}
                        className="w-full min-w-0 rounded-lg border border-stone-200/90 bg-white px-2 py-2 text-sm text-[#1C1917] focus:border-[#1B6B5C]/40 focus:outline-none focus:ring-1 focus:ring-[#1B6B5C]/25"
                        value={row.potency}
                        onChange={(e) => updateRow(row.id, "potency", e.target.value)}
                      >
                        {POTENCY_OPTIONS.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2 align-top sm:p-3">
                      <input
                        className="w-full rounded-lg border border-stone-200/90 bg-white px-2.5 py-2 text-sm text-[#1C1917] focus:border-[#1B6B5C]/40 focus:outline-none focus:ring-1 focus:ring-[#1B6B5C]/25"
                        value={row.dosage}
                        onChange={(e) => updateRow(row.id, "dosage", e.target.value)}
                        placeholder="e.g. morning & evening, 1 week"
                        aria-label={`Dosage for row ${rowIndex + 1}`}
                      />
                    </td>
                    <td className="p-1 align-top text-right sm:p-2">
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        className="rounded-md px-2 py-1 text-xs text-stone-500 hover:bg-stone-100 hover:text-rose-800"
                        disabled={rows.length <= 1}
                        aria-label={`Remove row ${rowIndex + 1}`}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <datalist id={listId}>
              {REMEDY_AUTOCOMPLETE.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </div>
          <button
            type="button"
            onClick={addRow}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-dashed border-stone-300/80 bg-gh-cream/40 px-4 py-2.5 text-sm font-medium text-[#1B6B5C] transition hover:border-[#1B6B5C]/40 focus:outline-none focus:ring-2 focus:ring-[#1B6B5C]/20"
            aria-label="Add remedy line"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add remedy
          </button>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") void window.print();
              }}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-stone-200/80 bg-white px-4 text-sm font-medium text-stone-600 shadow-sm hover:border-stone-300 hover:text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-stone-400/25"
              aria-label="Print or export"
            >
              <Printer className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              Print / export
            </button>
          </div>
          {statusMsg ? <p className="text-sm text-stone-500" role="status">{statusMsg}</p> : null}
        </div>

        <aside
          className="min-w-0 shrink-0 [flex-basis:30%] [min-width:min(100%,18rem)] lg:max-w-md"
          aria-label="Clinical context"
        >
          <div className="sticky top-32 space-y-4 rounded-2xl border border-stone-200/80 bg-[#FFFCF8] p-4 shadow-sm sm:p-5">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-[#1C1917]">
                <FileText className="h-4 w-4 text-stone-500" strokeWidth={1.75} aria-hidden />
                Patient history
              </h2>
              <div
                className="mt-3 max-h-48 space-y-2 overflow-y-auto text-sm text-stone-500"
                tabIndex={0}
              >
                {patient.initialChiefComplaint ? (
                  <p>
                    <span className="font-medium text-gh-ink/90">Initial visit:</span> {patient.initialChiefComplaint}
                  </p>
                ) : (
                  <p>Initial chief complaint not recorded. Add it from the patient profile when you can.</p>
                )}
                {patient.phone ? <p>Contact: {patient.phone}</p> : null}
              </div>
            </div>
            <div className="border-t border-stone-200/60 pt-4">
              <h2 className="text-sm font-semibold text-[#1C1917]">Previous prescriptions (sample)</h2>
              <ul
                className="mt-3 max-h-56 space-y-3 overflow-y-auto text-sm text-stone-500"
                tabIndex={0}
              >
                <li className="rounded-lg border border-stone-200/60 bg-gh-cream/40 p-2.5">
                  <p className="text-xs text-stone-500">8 Jan 2026</p>
                  <p className="text-gh-ink/90">Arnica 200C, Bryonia 30C — 7d course</p>
                </li>
                <li className="rounded-lg border border-stone-200/60 bg-gh-cream/40 p-2.5">
                  <p className="text-xs text-stone-500">2 Dec 2025</p>
                  <p className="text-gh-ink/90">Pulsatilla 200C, single</p>
                </li>
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

/** Map rich prescription entries to API/print-ready structured line items. */

const FREQ_LABELS: Record<string, string> = {
  once: "Once daily",
  twice: "Twice daily",
  thrice: "3× daily",
  four: "4× daily",
  sos: "SOS",
  alt: "Alternate days",
  weekly: "Once weekly",
  custom: "Custom"
};

const SLOT_LABELS: Record<string, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  night: "Night"
};

export type PrescriptionEntryForApi = {
  kind?: "remedy" | "medicine";
  name: string;
  potency?: string;
  doseCount?: string;
  frequency?: string;
  customFrequency?: string;
  timingSlots?: string[];
  duration?: string;
  instructions?: string;
};

export type PrescriptionApiItem = {
  remedyName: string;
  potency: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
};

function dash(s: string | undefined): string {
  const t = (s ?? "").trim();
  return t.length > 0 ? t : "—";
}

export function prescriptionEntryToApiItem(entry: PrescriptionEntryForApi): PrescriptionApiItem {
  const kind = entry.kind === "medicine" ? "medicine" : "remedy";
  const freqKey = (entry.frequency ?? "").trim();
  const freqLabel =
    freqKey === "custom"
      ? dash(entry.customFrequency)
      : FREQ_LABELS[freqKey] || dash(freqKey);

  const slots = Array.isArray(entry.timingSlots)
    ? entry.timingSlots.map((s) => SLOT_LABELS[s] ?? s).filter(Boolean)
    : [];
  const doseCount = (entry.doseCount ?? "").trim();
  const dosage =
    [doseCount, slots.length > 0 ? slots.join(" / ") : ""].filter(Boolean).join(" · ") || "—";

  const displayName =
    kind === "medicine" && entry.name.trim()
      ? `${entry.name.trim()} (supplement)`
      : entry.name.trim() || "—";

  return {
    remedyName: displayName,
    potency: kind === "remedy" ? dash(entry.potency) : "—",
    dosage,
    frequency: freqLabel,
    duration: dash(entry.duration),
    instructions: dash(entry.instructions)
  };
}

export function prescriptionEntriesToApiItems(
  entries: PrescriptionEntryForApi[]
): PrescriptionApiItem[] {
  return entries
    .filter((e) => e.name.trim().length > 0)
    .map(prescriptionEntryToApiItem);
}

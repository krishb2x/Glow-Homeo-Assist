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

export type StoredPrescriptionItem = Record<string, unknown>;

/** Normalize client/API prescription jsonb into print-ready line shape. */
export function mapStoredPrescriptionItem(raw: StoredPrescriptionItem): {
  remedyName: string;
  name: string;
  potency: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  kind: "remedy" | "medicine";
} {
  const kind =
    raw.kind === "medicine" || raw.kind === "remedy"
      ? raw.kind
      : typeof raw.remedyName === "string" && raw.remedyName.includes("(supplement)")
        ? "medicine"
        : "remedy";

  const name = String(raw.name ?? raw.remedyName ?? "").replace(/\s*\(supplement\)\s*$/i, "").trim();
  const potency = kind === "remedy" ? String(raw.potency ?? "").trim() : "";
  const freqKey = String(raw.frequency ?? "").trim();
  const freqLabel =
    freqKey === "custom"
      ? String(raw.customFrequency ?? "").trim()
      : FREQ_LABELS[freqKey] ?? freqKey;

  const slots = Array.isArray(raw.timingSlots)
    ? (raw.timingSlots as string[]).map((s) => SLOT_LABELS[s] ?? s).filter(Boolean)
    : [];
  const doseCount = String(raw.doseCount ?? "").trim();
  const legacyDosage = String(raw.dosage ?? "").trim();
  const dosage =
    legacyDosage ||
    [doseCount, slots.length > 0 ? slots.join(" / ") : ""].filter(Boolean).join(" · ") ||
    "—";

  const instructions = String(raw.instructions ?? "").trim();
  const displayName = kind === "medicine" && name ? `${name} (supplement)` : name || "—";

  return {
    remedyName: displayName,
    name: displayName,
    potency: potency || "—",
    dosage,
    frequency: freqLabel || "—",
    duration: String(raw.duration ?? "").trim() || "—",
    instructions,
    kind
  };
}

export function mapStoredPrescriptionItems(items: unknown): ReturnType<typeof mapStoredPrescriptionItem>[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter((x) => x && typeof x === "object")
    .map((x) => mapStoredPrescriptionItem(x as StoredPrescriptionItem))
    .filter((x) => x.name.trim().length > 0 && x.name !== "—");
}

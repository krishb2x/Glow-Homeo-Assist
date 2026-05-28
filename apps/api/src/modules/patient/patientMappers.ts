import { mapStoredPrescriptionItem, type StoredPrescriptionItem } from "@homeoassist/print";

export type PatientAdviceCard = {
  id: string;
  category: "diet" | "lifestyle" | "restriction";
  title: string;
  detail: string;
};

export function mapRxItemForMobile(raw: StoredPrescriptionItem, fallbackId: string) {
  const mapped = mapStoredPrescriptionItem(raw);
  const timingSlots = Array.isArray(raw.timingSlots)
    ? (raw.timingSlots as string[]).filter((s) => typeof s === "string")
    : [];
  const name = mapped.name !== "—" ? mapped.name : "";
  return {
    id: String(raw.id ?? fallbackId),
    name,
    potency: mapped.potency !== "—" ? mapped.potency : undefined,
    doseCount: String(raw.doseCount ?? "").trim() || undefined,
    frequency: mapped.frequency !== "—" ? mapped.frequency : undefined,
    timingSlots,
    duration: mapped.duration !== "—" ? mapped.duration : undefined,
    instructions: mapped.instructions || undefined,
    kind: mapped.kind
  };
}

export function mapPrescriptionItems(items: unknown): ReturnType<typeof mapRxItemForMobile>[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((raw, i) =>
      raw && typeof raw === "object"
        ? mapRxItemForMobile(raw as StoredPrescriptionItem, `line-${i}`)
        : null
    )
    .filter((x): x is NonNullable<typeof x> => x !== null && x.name.length > 0);
}

export function mergeAdvice(advice: unknown, clinicalRecord: unknown): PatientAdviceCard[] {
  const cards: PatientAdviceCard[] = [];
  const seen = new Set<string>();

  const cr = clinicalRecord as { advice?: unknown } | null;
  const crAdvice = cr?.advice;
  if (Array.isArray(crAdvice)) {
    for (const a of crAdvice) {
      if (!a || typeof a !== "object") continue;
      const o = a as Record<string, unknown>;
      const id = String(o.id ?? `card-${cards.length}`);
      const category = o.category;
      if (category !== "diet" && category !== "lifestyle" && category !== "restriction") continue;
      const title = String(o.title ?? "").trim();
      const detail = String(o.detail ?? "").trim();
      if (!detail && !title) continue;
      const key = `${category}:${title}:${detail}`;
      if (seen.has(key)) continue;
      seen.add(key);
      cards.push({ id, category, title: title || category, detail });
    }
  }

  const adv = advice as { diet?: string; lifestyle?: string } | null;
  if (adv?.diet?.trim()) {
    const detail = adv.diet.trim();
    const key = `diet:Diet:${detail}`;
    if (!seen.has(key)) {
      seen.add(key);
      cards.push({ id: "advice-diet", category: "diet", title: "Diet", detail });
    }
  }
  if (adv?.lifestyle?.trim()) {
    const detail = adv.lifestyle.trim();
    const key = `lifestyle:Lifestyle:${detail}`;
    if (!seen.has(key)) {
      seen.add(key);
      cards.push({ id: "advice-lifestyle", category: "lifestyle", title: "Lifestyle", detail });
    }
  }

  return cards;
}

export function restrictionsFromAdvice(advice: unknown, clinicalRecord: unknown): string[] {
  const out: string[] = [];
  for (const c of mergeAdvice(advice, clinicalRecord)) {
    if (c.category === "restriction" && c.detail.trim()) out.push(c.detail.trim());
  }
  const adv = advice as { diet?: string; lifestyle?: string } | null;
  if (adv?.diet?.toLowerCase().includes("avoid")) {
    for (const line of adv.diet.split(/[,;\n]+/)) {
      const t = line.trim();
      if (t.toLowerCase().startsWith("avoid") || t.toLowerCase().includes("no ")) out.push(t);
    }
  }
  return [...new Set(out)].slice(0, 20);
}

export function dietItemsFromAdvice(advice: unknown, clinicalRecord: unknown): Array<{ id: string; text: string }> {
  const items: Array<{ id: string; text: string }> = [];
  for (const c of mergeAdvice(advice, clinicalRecord)) {
    if (c.category === "diet" && c.detail.trim()) {
      for (const [i, line] of c.detail.split(/[,;\n]+/).entries()) {
        const text = line.trim();
        if (text) items.push({ id: `${c.id}-${i}`, text });
      }
    }
  }
  const adv = advice as { diet?: string } | null;
  if (items.length === 0 && adv?.diet?.trim()) {
    for (const [i, line] of adv.diet.split(/[,;\n]+/).entries()) {
      const text = line.trim();
      if (text) items.push({ id: `diet-legacy-${i}`, text });
    }
  }
  return items;
}

export function firstLineFromNote(note: unknown): string | null {
  if (!note || typeof note !== "object") return null;
  const t = note as Record<string, unknown>;
  const c = t.chiefComplaints ?? t.chief_complaints;
  if (typeof c === "string" && c.trim()) {
    return c.length > 200 ? `${c.slice(0, 200)}…` : c;
  }
  return null;
}

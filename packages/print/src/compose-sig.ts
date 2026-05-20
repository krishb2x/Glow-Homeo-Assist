import type { RxLine } from "./rx-types";

/** Build a single sig line: dose · frequency · instructions. */
export function composeSigLine(line: Pick<RxLine, "dose" | "frequency" | "instructions">): string {
  return [line.dose, line.frequency, line.instructions].map((s) => s.trim()).filter(Boolean).join(" · ");
}

/** Map legacy PrescriptionLine-shaped input into RxLine with composed sig. */
export function toRxLine(raw: {
  remedyName?: string;
  name?: string;
  potency: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  kind?: "remedy" | "medicine";
}): RxLine {
  const medicine = (raw.remedyName ?? raw.name ?? "").trim() || "—";
  const kind = raw.kind ?? (raw.potency ? "remedy" : "medicine");
  const dose = raw.dosage.trim();
  const sig = composeSigLine({ dose: raw.dosage, frequency: raw.frequency, instructions: raw.instructions });
  return {
    medicine,
    kind,
    potency: kind === "remedy" ? raw.potency : "—",
    dose: dose || "—",
    frequency: raw.frequency.trim() || "—",
    duration: raw.duration.trim() || "—",
    instructions: raw.instructions.trim(),
    sig: sig || "—"
  };
}

export function toRxLines(
  rows: Array<{
    remedyName?: string;
    name?: string;
    potency: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
    kind?: "remedy" | "medicine";
  }>
): RxLine[] {
  return rows.map(toRxLine);
}

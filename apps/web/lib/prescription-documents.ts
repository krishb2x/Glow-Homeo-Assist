import type { PrescriptionOutputPrefs } from "./prescription-output-settings";
import {
  buildClinicalSummaryHtml,
  buildPrescriptionSlipHtml,
  openRxPrintWindow,
  toRxLine,
  toRxLines,
  type BuildClinicalSummaryOptions,
  type BuildPrescriptionSlipOptions,
  type DoctorChartExtras,
  type NoteBlock,
  type PatientSlipPrefs,
  type RxDocumentMeta,
  type RxDocumentPrefs,
  type RxLine
} from "@homeoassist/print";

export type PrescriptionLine = {
  remedyName: string;
  potency: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
};

export type PrescriptionDocumentPrefs = RxDocumentPrefs;
export type ClinicDocumentMeta = RxDocumentMeta;

export type { NoteBlock, DoctorChartExtras, PatientSlipPrefs, RxLine };

export type BuildPrescriptionDocumentOptions = {
  meta: ClinicDocumentMeta;
  notes: NoteBlock;
  advice: { diet: string; lifestyle: string };
  lines: PrescriptionLine[];
  mode: "doctor" | "patient";
  patientPrefs: PrescriptionOutputPrefs;
  doctorExtras?: DoctorChartExtras;
};

function mapMeta(meta: ClinicDocumentMeta): RxDocumentMeta {
  return meta;
}

/**
 * Build print-ready HTML using @homeoassist/print templates.
 * Patient mode → A4 Rx slip. Doctor mode → clinical summary archive.
 */
export function buildPrescriptionDocumentHtml(opts: BuildPrescriptionDocumentOptions): string {
  const rxLines = toRxLines(opts.lines);
  const meta = mapMeta(opts.meta);

  if (opts.mode === "patient") {
    const slipOpts: BuildPrescriptionSlipOptions = {
      meta,
      lines: rxLines,
      advice: opts.advice,
      notes: opts.notes,
      patientPrefs: opts.patientPrefs
    };
    return buildPrescriptionSlipHtml(slipOpts);
  }

  const summaryOpts: BuildClinicalSummaryOptions = {
    meta,
    lines: rxLines,
    notes: opts.notes,
    advice: opts.advice,
    extras: opts.doctorExtras
  };
  return buildClinicalSummaryHtml(summaryOpts);
}

/** Server-side slip builder (finalize storage) — patient profile, full Rx table. */
export function buildServerPrescriptionSlipHtml(args: {
  meta: Omit<RxDocumentMeta, "documentPrefs"> & { documentPrefs?: RxDocumentPrefs };
  lines: PrescriptionLine[];
  advice?: { diet?: string; lifestyle?: string };
}): string {
  const meta: RxDocumentMeta = {
    ...args.meta,
    documentPrefs: args.meta.documentPrefs ?? {
      showClinicDetails: true,
      showSignature: true,
      showRegistrationNumber: true
    }
  };
  return buildPrescriptionSlipHtml({
    meta,
    lines: toRxLines(args.lines),
    advice: { diet: args.advice?.diet ?? "", lifestyle: args.advice?.lifestyle ?? "" }
  });
}

export function buildPrescriptionText(
  meta: ClinicDocumentMeta,
  lines: PrescriptionLine[],
  notes: NoteBlock,
  mode: "doctor" | "patient",
  patientPrefs: PrescriptionOutputPrefs,
  advice: { diet: string; lifestyle: string }
): string {
  const clinicHead = meta.documentPrefs.showClinicDetails
    ? `${meta.clinicName}${meta.clinicAddressLine ? `\n${meta.clinicAddressLine}` : ""}${meta.clinicPhone ? `\nTel: ${meta.clinicPhone}` : ""}${
        meta.clinicEmail ? `\nEmail: ${meta.clinicEmail}` : ""
      }\n`
    : `${meta.clinicName}\n`;
  const docHead = `${clinicHead}${meta.doctorName}${meta.qualification ? `\n${meta.qualification}` : ""}${
    meta.documentPrefs.showRegistrationNumber && meta.registrationNumber ? `\nReg. ${meta.registrationNumber}` : ""
  }\n${meta.visitDateLabel}\nPatient: ${meta.patientName}${
    meta.patientAge != null ? ` (${meta.patientAge}y)` : ""
  }${meta.patientGender?.trim() ? ` · ${meta.patientGender}` : ""}\n\n`;

  const rxLines = lines.map((r, i) => {
    const rx = toRxLine(r);
    return `${i + 1}. ${rx.medicine} | ${rx.potency} | ${rx.dose} | ${rx.frequency} | ${rx.duration} | ${rx.sig}`;
  });

  if (mode === "doctor") {
    return (
      docHead +
      "CHIEF COMPLAINTS\n" +
      notes.chiefComplaints +
      "\n\nOBSERVATIONS\n" +
      [notes.emotionalState, notes.physicalSymptoms, notes.modalities, notes.timeline].join("\n") +
      "\n\nADVICE\n" +
      `Diet: ${advice.diet}\nLifestyle: ${advice.lifestyle}\n\n` +
      "PRESCRIPTION\n" +
      rxLines.join("\n")
    );
  }

  let mid = "";
  if (patientPrefs.showSymptoms) mid += "Complaints:\n" + notes.chiefComplaints + "\n\n";
  if (patientPrefs.showNotes) mid += "Notes:\n" + [notes.modalities, notes.timeline].filter(Boolean).join("\n") + "\n\n";
  mid += `Advice — Diet: ${advice.diet}\nLifestyle: ${advice.lifestyle}\n\n`;
  return mid + "PRESCRIPTION\n" + rxLines.join("\n");
}

export function openPrintWindow(html: string, title: string): void {
  openRxPrintWindow(html, title);
}

export function downloadTextFile(filename: string, text: string): void {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export { toRxLine, toRxLines };

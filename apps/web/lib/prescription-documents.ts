import type { PrescriptionOutputPrefs } from "./prescription-output-settings";

export type PrescriptionLine = {
  remedyName: string;
  potency: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
};

export type NoteBlock = {
  chiefComplaints: string;
  emotionalState: string;
  physicalSymptoms: string;
  modalities: string;
  timeline: string;
};

/** Doctor-controlled layout toggles for PDF / print (from profile). */
export type PrescriptionDocumentPrefs = {
  showClinicDetails: boolean;
  showSignature: boolean;
  showRegistrationNumber: boolean;
};

export type ClinicDocumentMeta = {
  clinicName: string;
  clinicAddressLine?: string | null;
  clinicPhone?: string | null;
  clinicEmail?: string | null;
  doctorName: string;
  /** Degrees / qualifications (e.g. BHMS, MD). */
  qualification?: string | null;
  registrationNumber?: string | null;
  consultationId: string;
  visitDateLabel: string;
  /** Short label e.g. "In-Clinic", "Online". */
  consultationModeLabel?: string | null;
  patientName: string;
  patientAge: number | null;
  patientGender?: string | null;
  patientCode?: string | null;
  /** Text line under optional signature image (e.g. "Dr. Name"). */
  doctorSignatureLine?: string;
  followUpDateLabel?: string | null;
  /** Signed URL for uploaded signature image, if any. */
  signatureImageUrl?: string | null;
  documentPrefs: PrescriptionDocumentPrefs;
};

export type DoctorChartExtras = {
  labs?: Array<{ testName: string; result: string; notes: string }>;
  history?: { pastDiseases: string; medications: string };
  clinicalNotes?: { observations: string; diagnosisThinking: string };
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function textToBulletItems(text: string): string[] {
  return text
    .split(/\n|;|•/g)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function bulletListHtml(text: string): string {
  const items = textToBulletItems(text);
  if (items.length === 0) return "<p style=\"margin:4px 0; color:#444;\">—</p>";
  return `<ul style="margin:6px 0 0; padding-left:18px;">${items
    .map((t) => `<li style="margin:3px 0;">${esc(t)}</li>`)
    .join("")}</ul>`;
}

function a4Styles(): string {
  return `<style>
    @page { size: A4; margin: 14mm; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>`;
}

function headerBlock(meta: ClinicDocumentMeta): string {
  const contactLine = [meta.clinicPhone?.trim(), meta.clinicEmail?.trim()]
    .filter(Boolean)
    .map((x) => esc(x as string));
  const contactHtml =
    contactLine.length > 0
      ? `<div style="font-size:11px; color:#555; margin-top:4px; line-height:1.4;">${contactLine.join(" · ")}</div>`
      : "";

  const clinicBlock = meta.documentPrefs.showClinicDetails
    ? `<div style="font-size:17px; font-weight:700; letter-spacing:0.02em; color:#111;">${esc(meta.clinicName || "Clinic")}</div>
       ${
         meta.clinicAddressLine?.trim()
           ? `<div style="font-size:11px; color:#555; margin-top:4px; max-width:400px; line-height:1.45;">${esc(meta.clinicAddressLine)}</div>`
           : ""
       }
       ${contactHtml}`
    : `<div style="font-size:15px; font-weight:700; color:#111;">${esc(meta.clinicName || "Clinic")}</div>`;

  const qual = meta.qualification?.trim()
    ? `<div style="font-size:11px; color:#444; margin-top:2px;">${esc(meta.qualification)}</div>`
    : "";
  const regHeader =
    meta.documentPrefs.showRegistrationNumber && meta.registrationNumber?.trim()
      ? `<div style="font-size:11px; color:#444; margin-top:2px;">Registration: ${esc(meta.registrationNumber)}</div>`
      : "";

  const modeBadge = meta.consultationModeLabel?.trim()
    ? `<div style="margin-top:8px;"><span style="display:inline-block;padding:3px 10px;border-radius:999px;background:#e8f4fc;font-size:10px;font-weight:600;color:#0c4a6e;">${esc(meta.consultationModeLabel)}</span></div>`
    : "";

  return `
  <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:20px;">
    <div style="flex:1; min-width:0;">
      ${clinicBlock}
      <div style="margin-top:12px; padding-top:10px; border-top:1px solid #e5e5e5;">
        <div style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:#666;">Prescribing physician</div>
        <div style="font-size:13px; font-weight:600; margin-top:4px; color:#111;">${esc(meta.doctorName)}</div>
        ${qual}
        ${regHeader}
      </div>
    </div>
    <div style="text-align:right; font-size:11px; color:#333; flex-shrink:0;">
      <div><strong>Date</strong> ${esc(meta.visitDateLabel)}</div>
      <div style="margin-top:6px;"><strong>Consultation ID</strong><br/><span style="font-family:ui-monospace,monospace; font-size:10px;">${esc(meta.consultationId)}</span></div>
      ${modeBadge}
    </div>
  </div>`;
}

function patientBlock(meta: ClinicDocumentMeta): string {
  const ageGender =
    meta.patientAge != null || (meta.patientGender && meta.patientGender.trim())
      ? `${meta.patientAge != null ? `Age ${meta.patientAge}` : ""}${meta.patientAge != null && meta.patientGender?.trim() ? " · " : ""}${meta.patientGender?.trim() ? esc(meta.patientGender) : ""}`
      : "—";
  const pid = meta.patientCode?.trim()
    ? `<div style="margin-top:4px; font-size:11px;"><strong>Patient ID</strong> ${esc(meta.patientCode)}</div>`
    : "";
  return `
  <div style="margin-top:14px; padding:10px 12px; border:1px solid #ddd; border-radius:4px; background:#fafafa;">
    <div style="font-size:12px; font-weight:700; margin-bottom:6px; color:#222;">Patient details</div>
    <div style="font-size:12px;"><strong>Name</strong> ${esc(meta.patientName)}</div>
    <div style="font-size:12px; margin-top:4px;"><strong>Age / Gender</strong> ${esc(ageGender)}</div>
    ${pid}
  </div>`;
}

function observationsDoctorHtml(n: NoteBlock): string {
  return `
  <h2 style="font-size:13px; font-weight:700; margin:18px 0 6px; color:#111; border-bottom:1px solid #ccc; padding-bottom:4px;">Section 2 — Observations (clinical)</h2>
  <div style="font-size:11.5px; line-height:1.5;">
    <p style="margin:6px 0;"><strong>Emotional / mental</strong><br/>${esc(n.emotionalState) || "—"}</p>
    <p style="margin:6px 0;"><strong>Physical</strong><br/>${esc(n.physicalSymptoms) || "—"}</p>
    <p style="margin:6px 0;"><strong>Modalities</strong><br/>${esc(n.modalities) || "—"}</p>
    <p style="margin:6px 0;"><strong>Timeline</strong><br/>${esc(n.timeline) || "—"}</p>
  </div>`;
}

function extrasDoctorHtml(ex: DoctorChartExtras | undefined): string {
  if (!ex) return "";
  const parts: string[] = [];
  if (ex.labs && ex.labs.length > 0) {
    const rows = ex.labs
      .map(
        (l) =>
          `<tr><td style="padding:6px 8px; border-bottom:1px solid #eee; vertical-align:top;">${esc(l.testName)}</td>` +
          `<td style="padding:6px 8px; border-bottom:1px solid #eee; vertical-align:top;">${esc(l.result)}</td>` +
          `<td style="padding:6px 8px; border-bottom:1px solid #eee; vertical-align:top;">${esc(l.notes)}</td></tr>`
      )
      .join("");
    parts.push(`
      <h2 style="font-size:13px; font-weight:700; margin:18px 0 6px; color:#111; border-bottom:1px solid #ccc; padding-bottom:4px;">Investigations</h2>
      <table style="width:100%; border-collapse:collapse; font-size:11px;">
        <thead><tr style="text-align:left; border-bottom:1px solid #ccc;">
          <th style="padding:6px 8px;">Test</th><th style="padding:6px 8px;">Result</th><th style="padding:6px 8px;">Notes</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`);
  }
  if (ex.clinicalNotes && (ex.clinicalNotes.observations || ex.clinicalNotes.diagnosisThinking)) {
    parts.push(`
      <h2 style="font-size:13px; font-weight:700; margin:18px 0 6px; color:#111; border-bottom:1px solid #ccc; padding-bottom:4px;">Clinical notes</h2>
      <p style="font-size:11.5px; margin:6px 0;"><strong>Observations</strong><br/>${esc(ex.clinicalNotes.observations) || "—"}</p>
      <p style="font-size:11.5px; margin:6px 0;"><strong>Assessment / plan</strong><br/>${esc(ex.clinicalNotes.diagnosisThinking) || "—"}</p>`);
  }
  if (ex.history && (ex.history.pastDiseases || ex.history.medications)) {
    parts.push(`
      <h2 style="font-size:13px; font-weight:700; margin:18px 0 6px; color:#111; border-bottom:1px solid #ccc; padding-bottom:4px;">History</h2>
      <p style="font-size:11.5px; margin:6px 0;"><strong>Past conditions</strong><br/>${esc(ex.history.pastDiseases) || "—"}</p>
      <p style="font-size:11.5px; margin:6px 0;"><strong>Medications</strong><br/>${esc(ex.history.medications) || "—"}</p>`);
  }
  return parts.join("");
}

function prescriptionSectionHtml(lines: PrescriptionLine[]): string {
  if (lines.length === 0) {
    return `<p style="font-size:11.5px; color:#666;"><em>No remedies listed.</em></p>`;
  }
  return lines
    .map((r, i) => {
      return `
      <div style="margin-top:${i === 0 ? "6px" : "12px"}; padding-bottom:10px; border-bottom:1px solid #eee;">
        <div style="font-size:13px; font-weight:700;">${i + 1}. ${esc(r.remedyName)}</div>
        <table style="width:100%; font-size:11px; margin-top:6px;">
          <tr><td style="width:28%; color:#555;">Potency</td><td>${esc(r.potency)}</td></tr>
          <tr><td style="color:#555;">Dosage</td><td>${esc(r.dosage)}</td></tr>
          <tr><td style="color:#555;">Frequency</td><td>${esc(r.frequency)}</td></tr>
          <tr><td style="color:#555;">Duration</td><td>${esc(r.duration)}</td></tr>
          <tr><td style="vertical-align:top; color:#555;">Instructions</td><td>${esc(r.instructions)}</td></tr>
        </table>
      </div>`;
    })
    .join("");
}

function adviceSectionHtml(diet: string, lifestyle: string): string {
  if (!diet.trim() && !lifestyle.trim()) {
    return `<p style="font-size:11px; color:#666;">—</p>`;
  }
  return `
    <p style="font-size:11.5px; margin:6px 0;"><strong>Diet</strong><br/>${esc(diet) || "—"}</p>
    <p style="font-size:11.5px; margin:6px 0;"><strong>Lifestyle</strong><br/>${esc(lifestyle) || "—"}</p>`;
}

function footerBlock(meta: ClinicDocumentMeta): string {
  const fuLeft = meta.followUpDateLabel?.trim()
    ? `<div style="font-size:11px; line-height:1.5;"><strong>Follow-up recommended</strong><br/>${esc(meta.followUpDateLabel)}</div>`
    : `<div style="font-size:11px; line-height:1.5;"><strong>Follow-up</strong><br/>As advised.</div>`;

  const showSig = meta.documentPrefs.showSignature;
  const img =
    showSig && meta.signatureImageUrl?.trim()
      ? `<img src="${esc(meta.signatureImageUrl!)}" alt="" style="max-height:52px; max-width:180px; display:block; margin-left:auto;" crossorigin="anonymous" />`
      : "";
  const sigLine = showSig
    ? `<div style="font-size:12px; margin-top:6px; font-family:Georgia,serif; color:#111;">${esc(
        meta.doctorSignatureLine?.trim() || meta.doctorName
      )}</div>`
    : "";
  const nameLine = showSig
    ? `<div style="font-size:11px; color:#444; margin-top:2px;">${esc(meta.doctorName)}</div>`
    : "";
  const regRight =
    meta.documentPrefs.showRegistrationNumber && meta.registrationNumber?.trim()
      ? `<div style="font-size:10px; color:#555; margin-top:4px;">Reg. ${esc(meta.registrationNumber)}</div>`
      : "";

  const hasRight = showSig || (meta.documentPrefs.showRegistrationNumber && meta.registrationNumber?.trim());
  const rightCol = hasRight
    ? `<div style="text-align:right; min-width:160px;">
        ${showSig ? `<div style="font-size:10px; font-weight:600; color:#666; margin-bottom:4px;">Signature</div>` : ""}
        ${img}
        ${sigLine}
        ${nameLine}
        ${regRight}
      </div>`
    : "";

  return `
  <div style="margin-top:28px; padding-top:14px; border-top:1px solid #ccc;">
    <div style="display:flex; justify-content:space-between; align-items:flex-end; gap:20px; flex-wrap:wrap;">
      <div style="flex:1; min-width:140px;">${fuLeft}</div>
      ${rightCol}
    </div>
    <p style="margin-top:14px; font-size:9px; color:#777;">Generated clinical document. Retain per local regulations.</p>
  </div>`;
}

export type BuildPrescriptionDocumentOptions = {
  meta: ClinicDocumentMeta;
  notes: NoteBlock;
  advice: { diet: string; lifestyle: string };
  lines: PrescriptionLine[];
  mode: "doctor" | "patient";
  patientPrefs: PrescriptionOutputPrefs;
  doctorExtras?: DoctorChartExtras;
};

/**
 * Clinic-grade prescription / visit summary HTML. Doctor mode includes full chart; patient mode is filtered by prefs.
 */
export function buildPrescriptionDocumentHtml(opts: BuildPrescriptionDocumentOptions): string {
  const { meta, notes, advice, lines, mode, patientPrefs, doctorExtras } = opts;
  const title = mode === "doctor" ? `Clinical prescription — ${meta.patientName}` : `Prescription — ${meta.patientName}`;
  const chiefSection = `
    <h2 style="font-size:13px; font-weight:700; margin:18px 0 6px; color:#111; border-bottom:1px solid #ccc; padding-bottom:4px;">Section 1 — Chief complaints</h2>
    ${bulletListHtml(notes.chiefComplaints)}`;

  if (mode === "doctor") {
    const body = `
      ${headerBlock(meta)}
      <hr style="border:none; border-top:1px solid #ccc; margin:12px 0;"/>
      ${patientBlock(meta)}
      ${chiefSection}
      ${observationsDoctorHtml(notes)}
      ${extrasDoctorHtml(doctorExtras)}
      <h2 style="font-size:13px; font-weight:700; margin:18px 0 6px; color:#111; border-bottom:1px solid #ccc; padding-bottom:4px;">Section 3 — Prescription</h2>
      ${prescriptionSectionHtml(lines)}
      <h2 style="font-size:13px; font-weight:700; margin:18px 0 6px; color:#111; border-bottom:1px solid #ccc; padding-bottom:4px;">Section 4 — Advice / notes</h2>
      ${adviceSectionHtml(advice.diet, advice.lifestyle)}
      ${footerBlock(meta)}`;
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/>${a4Styles()}<title>${esc(title)}</title></head>
      <body style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif; max-width:680px; margin:0 auto; padding:8px 4px; color:#111; line-height:1.45;">
      ${body}
      </body></html>`;
  }

  let patientPreamble = "";
  if (patientPrefs.showSymptoms && notes.chiefComplaints.trim()) {
    patientPreamble += `<h2 style="font-size:13px; font-weight:700; margin:18px 0 6px;">Your visit focus</h2>${bulletListHtml(notes.chiefComplaints)}`;
  }
  if (patientPrefs.showNotes) {
    const bits = [notes.modalities, notes.timeline].filter(Boolean).join("\n\n");
    if (bits.trim()) {
      patientPreamble += `<h2 style="font-size:13px; font-weight:700; margin:18px 0 6px;">Notes for you</h2><p style="font-size:11.5px; white-space:pre-wrap;">${esc(bits)}</p>`;
    }
  }

  const instBlock =
    patientPrefs.showInstructions && lines.some((r) => r.instructions.trim())
      ? `<h2 style="font-size:13px; font-weight:700; margin:18px 0 6px;">How to take your remedies</h2><ul style="margin:0; padding-left:18px; font-size:11.5px;">${lines
          .map((r) => `<li style="margin:4px 0;">${esc(r.instructions)}</li>`)
          .join("")}</ul>`
      : "";

  const body = `
    ${headerBlock(meta)}
    <hr style="border:none; border-top:1px solid #ccc; margin:12px 0;"/>
    ${patientBlock(meta)}
    ${patientPreamble}
    <h2 style="font-size:13px; font-weight:700; margin:18px 0 6px;">Prescription</h2>
    ${prescriptionSectionHtml(lines)}
    ${instBlock}
    <h2 style="font-size:13px; font-weight:700; margin:18px 0 6px;">Advice</h2>
    ${adviceSectionHtml(advice.diet, advice.lifestyle)}
    ${footerBlock(meta)}`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>${a4Styles()}<title>${esc(title)}</title></head>
    <body style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif; max-width:680px; margin:0 auto; padding:8px 4px; color:#111; line-height:1.45;">
    ${body}
    </body></html>`;
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
  }\n${meta.visitDateLabel}\nConsultation: ${meta.consultationId}${meta.consultationModeLabel ? ` (${meta.consultationModeLabel})` : ""}\n\nPatient: ${meta.patientName}${
    meta.patientAge != null ? ` (age ${meta.patientAge})` : ""
  }${meta.patientGender?.trim() ? ` · ${meta.patientGender}` : ""}\n\n`;
  const header = docHead;
  if (mode === "doctor") {
    return (
      header +
      "CHIEF COMPLAINTS\n" +
      notes.chiefComplaints +
      "\n\nOBSERVATIONS\n" +
      [notes.emotionalState, notes.physicalSymptoms, notes.modalities, notes.timeline].join("\n") +
      "\n\nADVICE\n" +
      `Diet: ${advice.diet}\nLifestyle: ${advice.lifestyle}\n\n` +
      "PRESCRIPTION\n" +
      lines.map((r, i) => `${i + 1}. ${r.remedyName} | ${r.potency} | ${r.dosage} | ${r.frequency} | ${r.duration} | ${r.instructions}`).join("\n")
    );
  }
  let mid = "";
  if (patientPrefs.showSymptoms) mid += "Complaints:\n" + notes.chiefComplaints + "\n\n";
  if (patientPrefs.showNotes) mid += "Notes:\n" + [notes.modalities, notes.timeline].filter(Boolean).join("\n") + "\n\n";
  if (patientPrefs.showInstructions) mid += "Instructions:\n" + lines.map((l) => `• ${l.instructions}`).join("\n") + "\n\n";
  mid += `Advice — Diet: ${advice.diet}\nLifestyle: ${advice.lifestyle}\n\n`;
  return mid + "PRESCRIPTION\n" + lines.map((r, i) => `${i + 1}. ${r.remedyName} … ${r.instructions}`).join("\n");
}

export function openPrintWindow(html: string, title: string): void {
  const w = window.open("", "_blank", "noopener,noreferrer");
  if (!w) return;
  w.document.open();
  w.document.write(
    html.includes("<!DOCTYPE")
      ? html.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
      : `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${esc(title)}</title></head><body>${html}</body></html>`
  );
  w.document.close();
  w.focus();
  w.print();
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

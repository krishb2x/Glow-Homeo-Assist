import type {
  BuildClinicalSummaryOptions,
  BuildPrescriptionSlipOptions,
  NoteBlock,
  PatientSlipPrefs,
  RxDocumentMeta,
  RxLine
} from "./rx-types";
import { RX_PRINT_STYLES } from "./rx-styles";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function textToItems(text: string): string[] {
  return text
    .split(/\n|;|•/g)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function bulletList(text: string): string {
  const items = textToItems(text);
  if (items.length === 0) return "<p>—</p>";
  return `<ul>${items.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>`;
}

function patientAgeGender(meta: RxDocumentMeta): string {
  const parts: string[] = [];
  if (meta.patientAge != null) parts.push(`${meta.patientAge}y`);
  if (meta.patientGender?.trim()) parts.push(esc(meta.patientGender.trim()));
  return parts.length > 0 ? parts.join(" · ") : "—";
}

function headerHtml(meta: RxDocumentMeta): string {
  const showDetails = meta.documentPrefs.showClinicDetails;
  const contactParts = [meta.clinicPhone?.trim(), meta.clinicEmail?.trim()].filter(
    (s): s is string => Boolean(s)
  );
  const contact = contactParts.map(esc).join(" · ");
  const logo = meta.logoUrl?.trim()
    ? `<img class="rx-logo" src="${esc(meta.logoUrl)}" alt="" />`
    : "";

  const clinicBlock = showDetails
    ? `<p class="rx-clinic-name">${esc(meta.clinicName || "Clinic")}</p>
       ${meta.clinicAddressLine?.trim() ? `<p class="rx-clinic-meta">${esc(meta.clinicAddressLine)}</p>` : ""}
       ${contact ? `<p class="rx-clinic-meta">${contact}</p>` : ""}`
    : `<p class="rx-clinic-name">${esc(meta.clinicName || "Clinic")}</p>`;

  const qual = meta.qualification?.trim() ? `, ${esc(meta.qualification)}` : "";
  const regHeader =
    meta.documentPrefs.showRegistrationNumber && meta.registrationNumber?.trim()
      ? `<p class="rx-doctor-meta">Reg. ${esc(meta.registrationNumber)}</p>`
      : "";

  return `
  <header class="rx-header">
    <div class="rx-header-row">
      <div class="rx-header-left">
        ${logo}
        ${clinicBlock}
        <p class="rx-doctor-name">${esc(meta.doctorName)}${qual}</p>
        ${regHeader}
      </div>
      <div class="rx-header-right">
        <p><strong>Date</strong><br/>${esc(meta.visitDateLabel)}</p>
        ${
          meta.consultationModeLabel?.trim()
            ? `<p class="rx-mode-label">${esc(meta.consultationModeLabel)}</p>`
            : ""
        }
      </div>
    </div>
  </header>`;
}

function patientStripHtml(meta: RxDocumentMeta): string {
  const id = meta.patientCode?.trim() ? `<strong>ID</strong> ${esc(meta.patientCode)}` : "";
  const visit = meta.visitCode?.trim() ? `<strong>Visit</strong> ${esc(meta.visitCode)}` : "";
  const refs = [id, visit].filter(Boolean).join(" · ");
  return `
  <div class="rx-patient-strip">
    <div class="rx-patient-main">
      <strong>Patient</strong> ${esc(meta.patientName)} · ${patientAgeGender(meta)}
    </div>
    ${refs ? `<div class="rx-patient-refs">${refs}</div>` : ""}
  </div>`;
}

function rxTableHtml(lines: RxLine[]): string {
  if (lines.length === 0) {
    return `<p class="rx-prose"><em>No remedies prescribed.</em></p>`;
  }

  const rows = lines
    .map((line, i) => {
      const medClass = line.kind === "medicine" ? "rx-med rx-supplement" : "rx-med";
      return `
      <tr>
        <td>${i + 1}</td>
        <td class="${medClass}">${esc(line.medicine)}</td>
        <td>${esc(line.potency)}</td>
        <td>${esc(line.dose)}</td>
        <td>${esc(line.frequency)}</td>
        <td>${esc(line.duration)}</td>
      </tr>
      <tr class="rx-sig-row"><td colspan="6"><div class="rx-sig-block">${esc(line.sig)}</div></td></tr>`;
    })
    .join("");

  return `
  <p class="rx-rx-symbol" aria-hidden="true">℞</p>
  <table class="rx-table">
    <thead>
      <tr>
        <th>#</th>
        <th>Medicine</th>
        <th>Potency</th>
        <th>Dose</th>
        <th>Frequency</th>
        <th>Duration</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function adviceHtml(diet: string, lifestyle: string): string {
  if (!diet.trim() && !lifestyle.trim()) return "";
  return `
  <div class="rx-advice">
    <p class="rx-section-title">Advice</p>
    ${diet.trim() ? `<p><strong>Diet</strong> ${esc(diet)}</p>` : ""}
    ${lifestyle.trim() ? `<p><strong>Lifestyle</strong> ${esc(lifestyle)}</p>` : ""}
  </div>`;
}

function footerHtml(meta: RxDocumentMeta): string {
  const fuDate = meta.followUpDateLabel?.trim();
  const fuNote = meta.followUpNote?.trim();
  const symptoms = meta.symptomsToMonitor?.filter((s) => s.trim()).slice(0, 8) ?? [];
  let fuBlock = "";
  if (fuDate || fuNote || symptoms.length > 0) {
    fuBlock = `<p><strong>Follow-up</strong></p>`;
    if (fuDate) fuBlock += `<p>${esc(fuDate)}</p>`;
    if (fuNote) fuBlock += `<p class="rx-followup-note">${esc(fuNote)}</p>`;
    if (symptoms.length > 0) {
      fuBlock += `<p class="rx-monitor-label"><strong>Monitor</strong></p><ul class="rx-monitor-list">${symptoms
        .map((s) => `<li>${esc(s)}</li>`)
        .join("")}</ul>`;
    }
  } else {
    fuBlock = `<p><strong>Follow-up</strong><br/>As advised</p>`;
  }

  const showSig = meta.documentPrefs.showSignature;
  const sigImg =
    showSig && meta.signatureImageUrl?.trim()
      ? `<img class="rx-signature-img" src="${esc(meta.signatureImageUrl)}" alt="" />`
      : "";
  const sigLine = showSig
    ? `<p class="rx-signature-line">${esc(meta.doctorSignatureLine?.trim() || meta.doctorName)}</p>`
    : "";

  const regFooter =
    meta.documentPrefs.showRegistrationNumber && meta.registrationNumber?.trim()
      ? `<p class="rx-doctor-meta">Reg. ${esc(meta.registrationNumber)}</p>`
      : "";

  const qr = meta.qrUrl?.trim()
    ? `<img class="rx-qr" src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&amp;data=${encodeURIComponent(meta.qrUrl)}" alt="QR code" />`
    : "";

  return `
  <footer class="rx-footer">
    <div class="rx-footer-row">
      <div class="rx-footer-left">${fuBlock}${qr ? `<div class="rx-qr-wrap">${qr}</div>` : ""}</div>
      <div class="rx-footer-right">
        ${sigImg}
        ${sigLine}
        ${regFooter}
      </div>
    </div>
    <p class="rx-legal">Clinical prescription · Retain per local regulations · Valid only with authorised signature</p>
  </footer>`;
}

function wrapDocument(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${esc(title)}</title>
  <style>${RX_PRINT_STYLES}</style>
</head>
<body>
  <article class="rx-doc">${body}</article>
</body>
</html>`;
}

const DEFAULT_PATIENT_PREFS: PatientSlipPrefs = {
  showSymptoms: true,
  showNotes: false,
  showInstructions: true
};

/**
 * Zero-noise A4 patient Rx slip — pharmacy-ready table layout.
 */
export function buildPrescriptionSlipHtml(opts: BuildPrescriptionSlipOptions): string {
  const prefs = opts.patientPrefs ?? DEFAULT_PATIENT_PREFS;
  const title = `Prescription — ${opts.meta.patientName}`;
  const notes = opts.notes;

  let preamble = "";
  if (notes && prefs.showSymptoms && notes.chiefComplaints.trim()) {
    preamble += `<div class="rx-prose"><p class="rx-section-title">Visit focus</p>${bulletList(notes.chiefComplaints)}</div>`;
  }
  if (notes && prefs.showNotes) {
    const bits = [notes.modalities, notes.timeline].filter(Boolean).join("\n\n");
    if (bits.trim()) {
      preamble += `<div class="rx-prose"><p class="rx-section-title">Notes</p><p>${esc(bits)}</p></div>`;
    }
  }

  const body = `
    ${headerHtml(opts.meta)}
    ${patientStripHtml(opts.meta)}
    ${preamble}
    ${rxTableHtml(opts.lines)}
    ${adviceHtml(opts.advice.diet, opts.advice.lifestyle)}
    ${footerHtml(opts.meta)}`;

  return wrapDocument(title, body);
}

function chartSection(title: string, content: string): string {
  if (!content.trim()) return "";
  return `<div class="rx-chart-block"><p class="rx-section-title">${esc(title)}</p>${content}</div>`;
}

function observationsHtml(n: NoteBlock): string {
  const parts = [
    n.emotionalState.trim() ? `<p><strong>Mind / emotion</strong> ${esc(n.emotionalState)}</p>` : "",
    n.physicalSymptoms.trim() ? `<p><strong>Physical</strong> ${esc(n.physicalSymptoms)}</p>` : "",
    n.modalities.trim() ? `<p><strong>Modalities</strong> ${esc(n.modalities)}</p>` : "",
    n.timeline.trim() ? `<p><strong>Timeline</strong> ${esc(n.timeline)}</p>` : ""
  ].filter(Boolean);
  if (parts.length === 0) return "";
  return parts.join("");
}

/**
 * Doctor archive — clinical summary with Rx table (separate document profile from patient slip).
 */
export function buildClinicalSummaryHtml(opts: BuildClinicalSummaryOptions): string {
  const title = `Clinical summary — ${opts.meta.patientName}`;
  const ex = opts.extras;

  let extras = "";
  if (ex?.labs && ex.labs.length > 0) {
    const rows = ex.labs
      .map(
        (l) =>
          `<tr><td>${esc(l.testName)}</td><td>${esc(l.result)}</td><td>${esc(l.notes)}</td></tr>`
      )
      .join("");
    extras += chartSection(
      "Investigations",
      `<table class="rx-table"><thead><tr><th>Test</th><th>Result</th><th>Notes</th></tr></thead><tbody>${rows}</tbody></table>`
    );
  }
  if (ex?.clinicalNotes && (ex.clinicalNotes.observations || ex.clinicalNotes.diagnosisThinking)) {
    extras += chartSection(
      "Clinical notes",
      `<p><strong>Observations</strong> ${esc(ex.clinicalNotes.observations) || "—"}</p>
       <p><strong>Assessment</strong> ${esc(ex.clinicalNotes.diagnosisThinking) || "—"}</p>`
    );
  }
  if (ex?.history && (ex.history.pastDiseases || ex.history.medications)) {
    extras += chartSection(
      "History",
      `<p><strong>Past conditions</strong> ${esc(ex.history.pastDiseases) || "—"}</p>
       <p><strong>Medications</strong> ${esc(ex.history.medications) || "—"}</p>`
    );
  }

  const body = `
    ${headerHtml(opts.meta)}
    ${patientStripHtml(opts.meta)}
    ${chartSection("Chief complaints", bulletList(opts.notes.chiefComplaints))}
    ${chartSection("Observations", observationsHtml(opts.notes))}
    ${extras}
    ${rxTableHtml(opts.lines)}
    ${adviceHtml(opts.advice.diet, opts.advice.lifestyle)}
    ${footerHtml(opts.meta)}`;

  return wrapDocument(title, body);
}

export { esc };

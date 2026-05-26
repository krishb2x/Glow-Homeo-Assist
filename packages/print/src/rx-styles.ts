/** Single print stylesheet — no inline styles in markup. */
export const RX_PRINT_STYLES = `
:root {
  --rx-font: "Segoe UI", system-ui, -apple-system, Roboto, Helvetica, Arial, sans-serif;
  --rx-font-serif: Georgia, "Times New Roman", serif;
  --rx-body: 11pt;
  --rx-small: 9pt;
  --rx-label: 8pt;
  --rx-ink: #111;
  --rx-muted: #444;
  --rx-rule: #222;
  --rx-gap: 10pt;
}

@page {
  size: A4 portrait;
  margin: 12mm 14mm 16mm 14mm;
}

*, *::before, *::after { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  width: 210mm;
  color: var(--rx-ink);
  font-family: var(--rx-font);
  font-size: var(--rx-body);
  line-height: 1.4;
  -webkit-print-color-adjust: economy;
  print-color-adjust: economy;
}

.rx-doc {
  width: 100%;
  max-width: 210mm;
  margin: 0 auto;
  padding: 0;
}

.rx-header {
  display: table;
  width: 100%;
  border-bottom: 1.5pt solid var(--rx-rule);
  padding-bottom: var(--rx-gap);
  margin-bottom: var(--rx-gap);
  break-inside: avoid;
  page-break-inside: avoid;
}

.rx-header-row { display: table-row; }
.rx-header-left, .rx-header-right { display: table-cell; vertical-align: top; }
.rx-header-right { text-align: right; width: 38%; font-size: var(--rx-small); }

.rx-logo {
  max-height: 36pt;
  max-width: 120pt;
  margin-bottom: 4pt;
  display: block;
}

.rx-clinic-name {
  font-size: 14pt;
  font-weight: 700;
  letter-spacing: 0.02em;
  margin: 0 0 3pt;
}

.rx-clinic-meta, .rx-doctor-meta {
  font-size: var(--rx-small);
  color: var(--rx-muted);
  margin: 0;
  line-height: 1.45;
}

.rx-doctor-name {
  font-size: 11pt;
  font-weight: 600;
  margin: 6pt 0 0;
}

.rx-patient-strip {
  font-size: var(--rx-body);
  padding: 6pt 0;
  border-bottom: 0.75pt solid #ccc;
  margin-bottom: var(--rx-gap);
  break-inside: avoid;
  page-break-inside: avoid;
}

.rx-patient-main { margin-bottom: 2pt; }
.rx-patient-refs {
  font-size: var(--rx-small);
  color: var(--rx-muted);
}
.rx-patient-strip strong { font-weight: 700; }

.rx-monitor-label { margin: 4pt 0 2pt; font-size: var(--rx-small); }
.rx-monitor-list {
  margin: 0 0 4pt;
  padding-left: 14pt;
  font-size: var(--rx-small);
}
.rx-followup-note {
  font-size: var(--rx-small);
  color: var(--rx-muted);
  margin: 2pt 0 0;
}

.rx-section-title {
  font-size: 10pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin: 12pt 0 6pt;
  padding-bottom: 3pt;
  border-bottom: 0.75pt solid #ccc;
}

.rx-rx-symbol {
  font-family: var(--rx-font-serif);
  font-size: 16pt;
  font-weight: 700;
  margin: 0 0 6pt;
  line-height: 1;
}

.rx-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 10pt;
  margin-bottom: var(--rx-gap);
}

.rx-table thead {
  display: table-header-group;
}

.rx-table th {
  text-align: left;
  font-size: var(--rx-label);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 5pt 6pt;
  border-bottom: 1pt solid var(--rx-rule);
  color: var(--rx-muted);
}

.rx-table td {
  padding: 6pt;
  vertical-align: top;
  border-bottom: 0.5pt solid #ddd;
}

.rx-table tbody tr {
  break-inside: avoid;
  page-break-inside: avoid;
}

.rx-table .rx-med { font-weight: 600; }
.rx-table .rx-supplement { font-style: italic; }

.rx-sig-block {
  font-size: var(--rx-small);
  color: var(--rx-muted);
  margin: -4pt 0 8pt 0;
  padding-left: 6pt;
  break-inside: avoid;
  page-break-inside: avoid;
}

.rx-sig-block::before {
  content: "Sig: ";
  font-weight: 600;
  color: var(--rx-ink);
}

.rx-advice {
  font-size: var(--rx-small);
  margin-bottom: var(--rx-gap);
  break-inside: avoid;
  page-break-inside: avoid;
}

.rx-advice p { margin: 3pt 0; }

.rx-prose {
  font-size: var(--rx-small);
  line-height: 1.5;
  margin-bottom: var(--rx-gap);
}

.rx-prose ul {
  margin: 4pt 0 0;
  padding-left: 16pt;
}

.rx-prose li { margin: 2pt 0; }

.rx-chart-block {
  margin-bottom: var(--rx-gap);
  break-inside: avoid;
  page-break-inside: avoid;
}

.rx-chart-block p {
  margin: 4pt 0;
  font-size: var(--rx-small);
}

.rx-footer {
  margin-top: 14pt;
  padding-top: var(--rx-gap);
  border-top: 1pt solid var(--rx-rule);
  display: table;
  width: 100%;
  break-inside: avoid;
  page-break-inside: avoid;
}

.rx-footer-row { display: table-row; }
.rx-footer-left, .rx-footer-right { display: table-cell; vertical-align: bottom; }
.rx-footer-right { text-align: right; width: 42%; }

.rx-qr {
  width: 52pt;
  height: 52pt;
  border: 0.5pt solid #ccc;
  display: block;
}

.rx-signature-img {
  max-height: 44pt;
  max-width: 140pt;
  display: block;
  margin-left: auto;
  margin-bottom: 4pt;
}

.rx-signature-line {
  font-family: var(--rx-font-serif);
  font-size: 11pt;
  margin: 0;
}

.rx-mode-label {
  margin-top: 6pt;
  font-size: var(--rx-small);
  color: var(--rx-muted);
}

.rx-table tr.rx-sig-row td {
  border-bottom: 0.75pt solid #ddd;
  padding-top: 0;
  padding-bottom: 8pt;
}

.rx-qr-wrap {
  margin-top: 8pt;
}

.rx-legal {
  margin-top: 10pt;
  font-size: 7.5pt;
  color: #666;
  text-align: center;
  line-height: 1.35;
}

@media screen {
  body {
    background: #e8e8e8;
    padding: 12mm 0;
  }
  .rx-doc {
    background: #fff;
    box-shadow: 0 2px 12px rgb(0 0 0 / 0.12);
    padding: 12mm 14mm 16mm;
    min-height: 297mm;
  }
}

@media print {
  html, body {
    width: auto;
    background: #fff;
  }
  .rx-doc {
    box-shadow: none;
    padding: 0;
    min-height: auto;
  }
  .no-print { display: none !important; }
}
`;

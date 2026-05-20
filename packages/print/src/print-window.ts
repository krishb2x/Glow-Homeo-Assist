/**
 * Open a print-ready window (vector output via browser "Save as PDF").
 * Replaces rasterized html2pdf.js.
 *
 * IMPORTANT: do NOT pass "noopener" / "noreferrer" to `window.open`. When
 * either is set, the spec says the user agent MUST return `null`, which
 * silently breaks `Print / Save PDF` because we lose the window handle.
 * (Triggering Bug #2 reported on 20 May 2026.)
 */
function setPrintTitle(html: string, title: string): string {
  const safeTitle = title.replace(/</g, "&lt;");
  if (/<title>[^<]*<\/title>/i.test(html)) {
    return html.replace(/<title>[^<]*<\/title>/i, `<title>${safeTitle}</title>`);
  }
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (m) => `${m}<title>${safeTitle}</title>`);
  }
  return html;
}

export function openRxPrintWindow(html: string, title: string): void {
  if (typeof window === "undefined") return;

  // Open a blank popup synchronously (must happen during the click handler
  // so Safari/Chrome don't block the popup). No noopener — we need the
  // returned reference to write into the new document.
  const w = window.open("", "_blank");
  if (!w) {
    // Popup blocked → fall back to a downloadable Blob so the doctor can
    // still print the prescription manually.
    void downloadAsHtmlBlob(html, title);
    return;
  }

  const docHtml = html.includes("<!DOCTYPE") ? setPrintTitle(html, title) : html;
  try {
    w.document.open();
    w.document.write(docHtml);
    w.document.close();
  } catch {
    void downloadAsHtmlBlob(html, title);
    return;
  }

  w.focus();
  const triggerPrint = (): void => {
    try {
      w.focus();
      w.print();
    } catch {
      // Some browsers throw if invoked too eagerly; the user can press Ctrl+P.
    }
  };

  // Print once layout/fonts are ready. Belt-and-braces:
  //   1. Fire `print` when the new document loads (covers most browsers).
  //   2. Schedule a deferred print so very fast browsers (or `srcDoc`-style
  //      writes that flip readyState to `complete` immediately) still work.
  if (w.document.readyState === "complete") {
    setTimeout(triggerPrint, 200);
  } else {
    w.addEventListener("load", triggerPrint, { once: true });
    // Safety net: if `load` never fires (e.g. quirks-mode HTML), still print.
    setTimeout(triggerPrint, 1200);
  }
}

async function downloadAsHtmlBlob(html: string, title: string): Promise<void> {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  try {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sanitizeFilename(title)}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    // Last resort: open inline so the user can print themselves.
    try {
      const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
      window.location.assign(dataUrl);
    } catch {
      /* give up — nothing more we can do without throwing into the React tree. */
    }
  }
}

function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim() || "prescription";
}

/**
 * @deprecated Use openRxPrintWindow — browser Save-as-PDF is vector and matches @media print.
 */
export function downloadRxAsPdf(html: string, title: string): void {
  openRxPrintWindow(html, title);
}

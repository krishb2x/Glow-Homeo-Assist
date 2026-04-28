/**
 * Client-side A4 PDF download from consultation HTML (html2pdf.js).
 */
export async function downloadHtmlAsPdf(filename: string, html: string): Promise<void> {
  if (typeof window === "undefined") return;
  const imported = (await import("html2pdf.js")) as unknown as () => {
    from: (el: HTMLElement) => {
      set: (opts: Record<string, unknown>) => { save: () => Promise<void> };
    };
  };
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.left = "-10000px";
  iframe.style.top = "0";
  iframe.style.width = "210mm";
  iframe.style.border = "none";
  document.body.appendChild(iframe);
  const idoc = iframe.contentDocument;
  if (!idoc) {
    document.body.removeChild(iframe);
    throw new Error("Could not prepare PDF document");
  }
  idoc.open();
  idoc.write(html);
  idoc.close();
  const body = idoc.body;
  try {
    await imported()
      .from(body)
      .set({
        margin: 12,
        filename,
        image: { type: "jpeg", quality: 0.96 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] }
      })
      .save();
  } finally {
    document.body.removeChild(iframe);
  }
}

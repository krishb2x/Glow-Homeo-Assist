import { logger } from "../../lib/logger";

export type PdfRenderResult = {
  buffer: Buffer;
  mimeType: "application/pdf";
} | null;

/**
 * Render print HTML to a PDF buffer via headless Chrome (puppeteer-core).
 * Set PUPPETEER_EXECUTABLE_PATH to system Chrome/Chromium. Returns null when unavailable.
 */
export async function renderHtmlToPdf(html: string): Promise<PdfRenderResult> {
  const executablePath =
    process.env.PUPPETEER_EXECUTABLE_PATH?.trim() ||
    process.env.CHROME_EXECUTABLE_PATH?.trim() ||
    "";

  if (!executablePath) {
    logger.warn("pdf_render_skipped", { reason: "PUPPETEER_EXECUTABLE_PATH not set" });
    return null;
  }

  try {
    const puppeteer = await import("puppeteer-core");
    const browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
    });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "load" });
      const pdf = await page.pdf({
        format: "A4",
        printBackground: false,
        margin: { top: "12mm", right: "14mm", bottom: "16mm", left: "14mm" }
      });
      return { buffer: Buffer.from(pdf), mimeType: "application/pdf" };
    } finally {
      await browser.close();
    }
  } catch (e) {
    logger.warn("pdf_render_failed", { message: e instanceof Error ? e.message : String(e) });
    return null;
  }
}

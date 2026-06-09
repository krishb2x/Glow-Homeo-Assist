/**
 * lib/pdf/watermark.ts
 * Adds buyer watermark to every page of a PDF buffer.
 * Uses pdf-lib.
 */

import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';

export interface BuyerDetails {
  name: string;
  email: string;
  orderRef: string;
}

/**
 * Adds two watermarks to every page:
 * 1. Footer strip — buyer name, email, order ref (visible, subtle)
 * 2. Diagonal center — buyer name in large faint text (deters sharing)
 *
 * @param pdfBuffer - Original PDF bytes
 * @param buyer - { name, email, orderRef }
 * @returns - Watermarked PDF bytes
 */
export async function addWatermark(pdfBuffer: Buffer | Uint8Array, { name, email, orderRef }: BuyerDetails): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();

  const footerText = `Licensed to: ${name} | ${email} | Order: ${orderRef}`;
  const diagText = name.toUpperCase();

  for (const page of pages) {
    const { width, height } = page.getSize();

    // ── 1. Footer strip ──────────────────────────────────────────
    // Faint grey background bar
    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height: 18,
      color: rgb(0.96, 0.96, 0.96),
      opacity: 0.85,
    });

    // Footer text
    page.drawText(footerText, {
      x: 8,
      y: 5,
      size: 6.5,
      font,
      color: rgb(0.45, 0.45, 0.45),
      opacity: 0.75,
    });

    // ── 2. Diagonal center watermark ─────────────────────────────
    // Very faint — visible when printed, barely visible on screen
    // Prevents casual screenshot sharing
    const diagFontSize = Math.min(width / (diagText.length * 0.55), 56);
    const diagWidth = font.widthOfTextAtSize(diagText, diagFontSize);

    page.drawText(diagText, {
      x: (width - diagWidth * Math.cos(Math.PI / 4)) / 2,
      y: height / 2 - (diagFontSize * Math.sin(Math.PI / 4)) / 2,
      size: diagFontSize,
      font,
      color: rgb(0, 0, 0),
      opacity: 0.04,
      rotate: degrees(45),
    });
  }

  return await doc.save();
}

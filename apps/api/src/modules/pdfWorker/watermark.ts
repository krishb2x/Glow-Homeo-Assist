/**
 * lib/pdf/watermark.ts
 * Adds buyer watermark to every page of a PDF buffer.
 * Uses pdf-lib.
 */

import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';

export interface BuyerDetails {
  name: string;
  email: string;
  phone?: string;
  orderRef: string;
  date?: string;
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
export async function addWatermark(pdfBuffer: Buffer | Uint8Array, { name, email, phone, orderRef, date }: BuyerDetails, requiresWatermark: boolean = true): Promise<Uint8Array> {
  let finalBufferToEncrypt: Buffer | Uint8Array = pdfBuffer;

  if (requiresWatermark) {
    const doc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
    const purchaseDate = date || new Date().toLocaleDateString();

    // ── Insert License Agreement Page (Page 0) ──────────────────────────
    const licensePage = doc.insertPage(0, [595.28, 841.89]); // A4 size
    const { width: lWidth, height: lHeight } = licensePage.getSize();
    
    let yPos = lHeight - 80;
    
    licensePage.drawText("DIGITAL LICENSE & COPYRIGHT NOTICE", {
      x: 50, y: yPos, size: 14, font: boldFont, color: rgb(0, 0, 0)
    });
    
    yPos -= 30;
    licensePage.drawText("This eBook is licensed exclusively to the purchaser listed below and is intended for personal use only.", {
      x: 50, y: yPos, size: 10, font, color: rgb(0, 0, 0)
    });
    
    yPos -= 40;
    licensePage.drawText("Licensed To:", { x: 50, y: yPos, size: 10, font: boldFont, color: rgb(0, 0, 0) });
    licensePage.drawText(name, { x: 140, y: yPos, size: 10, font, color: rgb(0, 0, 0) });
    
    yPos -= 20;
    licensePage.drawText("Email:", { x: 50, y: yPos, size: 10, font: boldFont, color: rgb(0, 0, 0) });
    licensePage.drawText(email, { x: 140, y: yPos, size: 10, font, color: rgb(0, 0, 0) });
    
    yPos -= 20;
    licensePage.drawText("Order ID:", { x: 50, y: yPos, size: 10, font: boldFont, color: rgb(0, 0, 0) });
    licensePage.drawText(orderRef, { x: 140, y: yPos, size: 10, font, color: rgb(0, 0, 0) });
    
    yPos -= 20;
    licensePage.drawText("Purchase Date:", { x: 50, y: yPos, size: 10, font: boldFont, color: rgb(0, 0, 0) });
    licensePage.drawText(purchaseDate, { x: 140, y: yPos, size: 10, font, color: rgb(0, 0, 0) });

    yPos -= 50;
    licensePage.drawText("MEDICAL DISCLAIMER", { x: 50, y: yPos, size: 12, font: boldFont, color: rgb(0, 0, 0) });
    
    yPos -= 20;
    const disclaimerText = "This eBook is intended exclusively for doctors, medical students, and healthcare professionals for educational\nand informational purposes only. It is not intended for self-diagnosis, self-medication, treatment decisions,\nor independent medical practice.";
    licensePage.drawText(disclaimerText, { x: 50, y: yPos, size: 10, font, color: rgb(0.2, 0.2, 0.2), lineHeight: 14 });

    yPos -= 70;
    licensePage.drawText("COPYRIGHT NOTICE", { x: 50, y: yPos, size: 12, font: boldFont, color: rgb(0, 0, 0) });
    
    yPos -= 20;
    licensePage.drawText("Copyright © MediTonic. All Rights Reserved.", { x: 50, y: yPos, size: 10, font: boldFont, color: rgb(0, 0, 0) });
    
    yPos -= 20;
    const copyrightText = "This publication is protected under applicable copyright and intellectual property laws. Unauthorized copying,\nsharing, distribution, resale, uploading, or reproduction of this eBook, in whole or in part, is strictly prohibited.";
    licensePage.drawText(copyrightText, { x: 50, y: yPos, size: 10, font, color: rgb(0.2, 0.2, 0.2), lineHeight: 14 });

    yPos -= 60;
    licensePage.drawText("ANTI-PIRACY NOTICE", { x: 50, y: yPos, size: 12, font: boldFont, color: rgb(0, 0, 0) });
    
    yPos -= 20;
    const antiPiracyText = "This copy contains personalized ownership information and security markings for audit and verification purposes.\nUnauthorized distribution or commercial use may result in legal action under applicable laws.";
    licensePage.drawText(antiPiracyText, { x: 50, y: yPos, size: 10, font, color: rgb(0.2, 0.2, 0.2), lineHeight: 14 });

    yPos -= 60;
    licensePage.drawText("AGREEMENT", { x: 50, y: yPos, size: 12, font: boldFont, color: rgb(0, 0, 0) });
    
    yPos -= 20;
    licensePage.drawText("By accessing this eBook, the purchaser acknowledges and agrees to these terms.", { x: 50, y: yPos, size: 10, font, color: rgb(0.2, 0.2, 0.2) });

    yPos -= 50;
    licensePage.drawText("MediTonic", { x: 50, y: yPos, size: 14, font: boldFont, color: rgb(0, 0.4, 0.2) });
    
    yPos -= 20;
    licensePage.drawText("Healing Beyond Symptoms – Restoring Health, Hormones, and Happiness.", { x: 50, y: yPos, size: 10, font, color: rgb(0.2, 0.2, 0.2) });
    
    yPos -= 20;
    licensePage.drawText("https://meditonic.glowhomeo.com", { x: 50, y: yPos, size: 10, font, color: rgb(0, 0.4, 0.8) });

    // ── Apply Watermarks to ALL Pages ────────────
    const pages = doc.getPages();
    const footerText = `Licensed Copy • ${name} • ${email} • Order ${orderRef}`;

    for (const page of pages) {
      const { width, height } = page.getSize();

      // ── 1. Footer strip ──────────────────────────────────────────
      page.drawRectangle({
        x: 0,
        y: 0,
        width,
        height: 24,
        color: rgb(0.85, 0.85, 0.85),
        opacity: 0.95,
      });

      page.drawText(footerText, {
        x: 12,
        y: 8,
        size: 9,
        font,
        color: rgb(0.2, 0.2, 0.2),
        opacity: 0.9,
      });
    }

    const watermarkedBytes = await doc.save();
    finalBufferToEncrypt = Buffer.from(watermarkedBytes);
  }

  // ── 3. Apply 128-bit Encryption ─────────────────────────────
  const primaryPassword = phone && phone.trim().length >= 8 ? phone.trim() : email;
  const crypto = require('crypto');
  const os = require('os');
  const path = require('path');
  const fs = require('fs');
  const { execFile } = require('child_process');
  const util = require('util');
  const execFileAsync = util.promisify(execFile);

  const tmpId = crypto.randomUUID();
  const inFile = path.join(os.tmpdir(), `${tmpId}-in.pdf`);
  const outFile = path.join(os.tmpdir(), `${tmpId}-out.pdf`);

  const scriptCode = `
const muhammara = require('muhammara');
const inFile = process.argv[1];
const outFile = process.argv[2];
const ownerPassword = process.argv[4];
const userPassword = process.argv[5];

const passwordsToTry = [process.argv[3], 'meditonic', 'Meditonic', ''];

let success = false;
for (const pw of passwordsToTry) {
  try {
    muhammara.recrypt(inFile, outFile, {
      password: pw === 'EMPTY' ? '' : pw,
      ownerPassword: ownerPassword,
      userPassword: userPassword,
      userProtectionFlag: 4
    });
    success = true;
    break;
  } catch (e) {
    // Try next password
  }
}

if (!success) {
  console.error("Unable to recrypt files, check that input and output files are clear and arguments are coool");
  process.exit(1);
} else {
  process.exit(0);
}
`;

  try {
    fs.writeFileSync(inFile, finalBufferToEncrypt);

    try {
      await execFileAsync('node', [
        '-e',
        scriptCode,
        inFile,
        outFile,
        'MEDITONIC', // argv[3]
        'MEDITONIC_SECURE_OWNER', // argv[4]
        primaryPassword // argv[5]
      ], { timeout: 15000 });
    } catch (err: any) {
      if (err.killed) {
        throw new Error("Encryption timed out (infinite loop detected on this PDF)");
      }
      throw new Error(err.stderr || err.message || "Failed to encrypt PDF");
    }

    const encryptedBuffer = fs.readFileSync(outFile);
    return encryptedBuffer;
  } finally {
    if (fs.existsSync(inFile)) fs.unlinkSync(inFile);
    if (fs.existsSync(outFile)) fs.unlinkSync(outFile);
  }
}

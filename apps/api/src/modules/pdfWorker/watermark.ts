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
    const doc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true, password: 'MEDITONIC' });
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
    const purchaseDate = date || new Date().toLocaleDateString();

    // ── Insert License Agreement Page (Page 0) ──────────────────────────
    const licensePage = doc.insertPage(0, [595.28, 841.89]); // A4 size
    const { width: lWidth, height: lHeight } = licensePage.getSize();
    
    const licenseTextYStart = lHeight - 60;
    
    licensePage.drawText("This eBook is licensed exclusively to the purchaser listed below", {
      x: 50, y: licenseTextYStart, size: 12, font, color: rgb(0, 0, 0)
    });
    licensePage.drawText("and is intended solely for personal use.", {
      x: 50, y: licenseTextYStart - 20, size: 12, font, color: rgb(0, 0, 0)
    });

    licensePage.drawText("Licensed To:", { x: 50, y: licenseTextYStart - 60, size: 10, font: boldFont, color: rgb(0, 0, 0) });
    licensePage.drawText(name, { x: 50, y: licenseTextYStart - 75, size: 12, font, color: rgb(0, 0, 0) });

    licensePage.drawText("Email:", { x: 50, y: licenseTextYStart - 105, size: 10, font: boldFont, color: rgb(0, 0, 0) });
    licensePage.drawText(email, { x: 50, y: licenseTextYStart - 120, size: 12, font, color: rgb(0, 0, 0) });

    licensePage.drawText("Order ID:", { x: 50, y: licenseTextYStart - 150, size: 10, font: boldFont, color: rgb(0, 0, 0) });
    licensePage.drawText(orderRef, { x: 50, y: licenseTextYStart - 165, size: 12, font, color: rgb(0, 0, 0) });

    licensePage.drawText("Purchase Date:", { x: 50, y: licenseTextYStart - 195, size: 10, font: boldFont, color: rgb(0, 0, 0) });
    licensePage.drawText(purchaseDate, { x: 50, y: licenseTextYStart - 210, size: 12, font, color: rgb(0, 0, 0) });

    // --- Medical Disclaimer ---
    licensePage.drawText("Medical Disclaimer", { x: 50, y: licenseTextYStart - 250, size: 11, font: boldFont, color: rgb(0.6, 0, 0) });
    const disclaimerText = "This eBook is intended exclusively for doctors, medical students, and healthcare professionals for educational\nand informational purposes only.\n\nThe content provided in this publication is not intended for self-diagnosis, self-medication, treatment decisions,\nor independent medical practice by the general public.\n\nReaders are advised to exercise professional clinical judgment and refer to current medical guidelines, research,\nand regulatory requirements before applying any information contained herein.\n\nThe author, publisher, and MediTonic make no warranties regarding the completeness or accuracy of the information\nand shall not be held liable for any direct, indirect, incidental, or consequential damages arising from the use,\nmisuse, interpretation, or application of the content.";
    licensePage.drawText(disclaimerText, { x: 50, y: licenseTextYStart - 265, size: 9, font, color: rgb(0.2, 0.2, 0.2), lineHeight: 12 });

    // --- Copyright & Rules ---
    const copyY = licenseTextYStart - 410;
    licensePage.drawText("Copyright © MediTonic. All Rights Reserved.", {
      x: 50, y: copyY, size: 11, font: boldFont, color: rgb(0, 0, 0)
    });

    licensePage.drawText("This document is protected under the Copyright Act, 1957 (India) and applicable intellectual property laws.", {
      x: 50, y: copyY - 20, size: 9, font, color: rgb(0, 0, 0)
    });

    licensePage.drawText("The purchaser may not:", {
      x: 50, y: copyY - 45, size: 10, font: boldFont, color: rgb(0, 0, 0)
    });

    const rules = [
      "• Copy, reproduce, distribute, share, resell, upload, publish, or transmit this eBook in any form.",
      "• Share the PDF, password, download link, screenshots, or extracted content with any third party.",
      "• Upload this eBook to websites, cloud storage, social media platforms, messaging groups, forums, or marketplaces.",
      "• Modify, remove, or alter copyright notices, watermarks, or ownership information."
    ];

    let ruleY = copyY - 65;
    for (const rule of rules) {
      licensePage.drawText(rule, { x: 50, y: ruleY, size: 9, font, color: rgb(0.2, 0.2, 0.2) });
      ruleY -= 15;
    }

    licensePage.drawText("This copy contains personalized identification and security markings for audit and verification purposes.", {
      x: 50, y: ruleY - 15, size: 9, font, color: rgb(0, 0, 0)
    });

    const legalText = "Any unauthorized reproduction, distribution, or commercial use may result in civil and/or criminal\nproceedings under applicable Indian laws, including claims for damages, injunctions, legal costs,\nand other available remedies.";
    licensePage.drawText(legalText, {
      x: 50, y: ruleY - 40, size: 8, font, color: rgb(0.5, 0, 0), lineHeight: 12
    });

    licensePage.drawText("By accessing this eBook, the purchaser acknowledges and agrees to these terms.", {
      x: 50, y: ruleY - 85, size: 10, font: boldFont, color: rgb(0, 0, 0)
    });

    licensePage.drawText("MediTonic", {
      x: 50, y: ruleY - 110, size: 12, font: boldFont, color: rgb(0, 0.4, 0.2)
    });
    licensePage.drawText("https://meditonic.glowhomeo.com", {
      x: 50, y: ruleY - 125, size: 10, font, color: rgb(0, 0.4, 0.8)
    });

    // ── Apply Watermarks to ALL Pages (including license) ────────────
    const pages = doc.getPages();
    const footerText = `Licensed Copy • ${name} • ${email} • Order ${orderRef}`;
    const diagText = `Licensed to: ${name.toUpperCase()}`;

    for (const page of pages) {
      const { width, height } = page.getSize();

      // ── 1. Footer strip ──────────────────────────────────────────
      page.drawRectangle({
        x: 0,
        y: 0,
        width,
        height: 18,
        color: rgb(0.96, 0.96, 0.96),
        opacity: 0.85,
      });

      page.drawText(footerText, {
        x: 8,
        y: 5,
        size: 6.5,
        font,
        color: rgb(0.45, 0.45, 0.45),
        opacity: 0.75,
      });

      // ── 2. Diagonal center watermark ─────────────────────────────
      const diagFontSize = Math.min(width / (diagText.length * 0.55), 48);
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

    const watermarkedBytes = await doc.save();
    finalBufferToEncrypt = Buffer.from(watermarkedBytes);
  }

  // ── 3. Apply 128-bit Encryption ─────────────────────────────
  const muhammara = require('muhammara');
  let inStream;
  if (Buffer.isBuffer(finalBufferToEncrypt)) {
    inStream = new muhammara.PDFRStreamForBuffer(finalBufferToEncrypt);
  } else {
    inStream = new muhammara.PDFRStreamForBuffer(Buffer.from(finalBufferToEncrypt));
  }
  const outStream = new muhammara.PDFWStreamForBuffer();

  const primaryPassword = phone && phone.trim().length >= 8 ? phone.trim() : email;

  muhammara.recrypt(inStream, outStream, {
    password: 'MEDITONIC', 
    userPassword: primaryPassword,
    ownerPassword: 'MEDITONIC_SECURE_OWNER',
    userProtectionFlag: 4
  });

  return outStream.buffer;
}

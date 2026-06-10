"use strict";
/**
 * lib/pdf/watermark.ts
 * Adds buyer watermark to every page of a PDF buffer.
 * Uses pdf-lib.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addWatermark = addWatermark;
var pdf_lib_1 = require("pdf-lib");
/**
 * Adds two watermarks to every page:
 * 1. Footer strip — buyer name, email, order ref (visible, subtle)
 * 2. Diagonal center — buyer name in large faint text (deters sharing)
 *
 * @param pdfBuffer - Original PDF bytes
 * @param buyer - { name, email, orderRef }
 * @returns - Watermarked PDF bytes
 */
function addWatermark(pdfBuffer_1, _a) {
    return __awaiter(this, arguments, void 0, function (pdfBuffer, _b) {
        var doc, font, boldFont, purchaseDate, licensePage, _c, lWidth, lHeight, licenseTextYStart, disclaimerText, copyY, rules, ruleY, _i, rules_1, rule, legalText, pages, footerText, diagText, _d, pages_1, page, _e, width, height, diagFontSize, diagWidth, watermarkedBytes, watermarkedBuffer, muhammara, inStream, outStream, primaryPassword;
        var name = _b.name, email = _b.email, phone = _b.phone, orderRef = _b.orderRef, date = _b.date;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0: return [4 /*yield*/, pdf_lib_1.PDFDocument.load(pdfBuffer, { ignoreEncryption: true })];
                case 1:
                    doc = _f.sent();
                    return [4 /*yield*/, doc.embedFont(pdf_lib_1.StandardFonts.Helvetica)];
                case 2:
                    font = _f.sent();
                    return [4 /*yield*/, doc.embedFont(pdf_lib_1.StandardFonts.HelveticaBold)];
                case 3:
                    boldFont = _f.sent();
                    purchaseDate = date || new Date().toLocaleDateString();
                    licensePage = doc.insertPage(0, [595.28, 841.89]);
                    _c = licensePage.getSize(), lWidth = _c.width, lHeight = _c.height;
                    licenseTextYStart = lHeight - 60;
                    licensePage.drawText("This eBook is licensed exclusively to the purchaser listed below", {
                        x: 50, y: licenseTextYStart, size: 12,
                        font: font,
                        color: (0, pdf_lib_1.rgb)(0, 0, 0)
                    });
                    licensePage.drawText("and is intended solely for personal use.", {
                        x: 50, y: licenseTextYStart - 20, size: 12,
                        font: font,
                        color: (0, pdf_lib_1.rgb)(0, 0, 0)
                    });
                    licensePage.drawText("Licensed To:", { x: 50, y: licenseTextYStart - 60, size: 10, font: boldFont, color: (0, pdf_lib_1.rgb)(0, 0, 0) });
                    licensePage.drawText(name, { x: 50, y: licenseTextYStart - 75, size: 12, font: font, color: (0, pdf_lib_1.rgb)(0, 0, 0) });
                    licensePage.drawText("Email:", { x: 50, y: licenseTextYStart - 105, size: 10, font: boldFont, color: (0, pdf_lib_1.rgb)(0, 0, 0) });
                    licensePage.drawText(email, { x: 50, y: licenseTextYStart - 120, size: 12, font: font, color: (0, pdf_lib_1.rgb)(0, 0, 0) });
                    licensePage.drawText("Order ID:", { x: 50, y: licenseTextYStart - 150, size: 10, font: boldFont, color: (0, pdf_lib_1.rgb)(0, 0, 0) });
                    licensePage.drawText(orderRef, { x: 50, y: licenseTextYStart - 165, size: 12, font: font, color: (0, pdf_lib_1.rgb)(0, 0, 0) });
                    licensePage.drawText("Purchase Date:", { x: 50, y: licenseTextYStart - 195, size: 10, font: boldFont, color: (0, pdf_lib_1.rgb)(0, 0, 0) });
                    licensePage.drawText(purchaseDate, { x: 50, y: licenseTextYStart - 210, size: 12, font: font, color: (0, pdf_lib_1.rgb)(0, 0, 0) });
                    // --- Medical Disclaimer ---
                    licensePage.drawText("Medical Disclaimer", { x: 50, y: licenseTextYStart - 250, size: 11, font: boldFont, color: (0, pdf_lib_1.rgb)(0.6, 0, 0) });
                    disclaimerText = "This eBook is intended exclusively for doctors, medical students, and healthcare professionals for educational\nand informational purposes only.\n\nThe content provided in this publication is not intended for self-diagnosis, self-medication, treatment decisions,\nor independent medical practice by the general public.\n\nReaders are advised to exercise professional clinical judgment and refer to current medical guidelines, research,\nand regulatory requirements before applying any information contained herein.\n\nThe author, publisher, and MediTonic make no warranties regarding the completeness or accuracy of the information\nand shall not be held liable for any direct, indirect, incidental, or consequential damages arising from the use,\nmisuse, interpretation, or application of the content.";
                    licensePage.drawText(disclaimerText, { x: 50, y: licenseTextYStart - 265, size: 9, font: font, color: (0, pdf_lib_1.rgb)(0.2, 0.2, 0.2), lineHeight: 12 });
                    copyY = licenseTextYStart - 410;
                    licensePage.drawText("Copyright © MediTonic. All Rights Reserved.", {
                        x: 50, y: copyY, size: 11, font: boldFont, color: (0, pdf_lib_1.rgb)(0, 0, 0)
                    });
                    licensePage.drawText("This document is protected under the Copyright Act, 1957 (India) and applicable intellectual property laws.", {
                        x: 50, y: copyY - 20, size: 9,
                        font: font,
                        color: (0, pdf_lib_1.rgb)(0, 0, 0)
                    });
                    licensePage.drawText("The purchaser may not:", {
                        x: 50, y: copyY - 45, size: 10, font: boldFont, color: (0, pdf_lib_1.rgb)(0, 0, 0)
                    });
                    rules = [
                        "• Copy, reproduce, distribute, share, resell, upload, publish, or transmit this eBook in any form.",
                        "• Share the PDF, password, download link, screenshots, or extracted content with any third party.",
                        "• Upload this eBook to websites, cloud storage, social media platforms, messaging groups, forums, or marketplaces.",
                        "• Modify, remove, or alter copyright notices, watermarks, or ownership information."
                    ];
                    ruleY = copyY - 65;
                    for (_i = 0, rules_1 = rules; _i < rules_1.length; _i++) {
                        rule = rules_1[_i];
                        licensePage.drawText(rule, { x: 50, y: ruleY, size: 9, font: font, color: (0, pdf_lib_1.rgb)(0.2, 0.2, 0.2) });
                        ruleY -= 15;
                    }
                    licensePage.drawText("This copy contains personalized identification and security markings for audit and verification purposes.", {
                        x: 50, y: ruleY - 15, size: 9,
                        font: font,
                        color: (0, pdf_lib_1.rgb)(0, 0, 0)
                    });
                    legalText = "Any unauthorized reproduction, distribution, or commercial use may result in civil and/or criminal\nproceedings under applicable Indian laws, including claims for damages, injunctions, legal costs,\nand other available remedies.";
                    licensePage.drawText(legalText, {
                        x: 50, y: ruleY - 40, size: 8,
                        font: font,
                        color: (0, pdf_lib_1.rgb)(0.5, 0, 0), lineHeight: 12
                    });
                    licensePage.drawText("By accessing this eBook, the purchaser acknowledges and agrees to these terms.", {
                        x: 50, y: ruleY - 85, size: 10, font: boldFont, color: (0, pdf_lib_1.rgb)(0, 0, 0)
                    });
                    licensePage.drawText("MediTonic", {
                        x: 50, y: ruleY - 110, size: 12, font: boldFont, color: (0, pdf_lib_1.rgb)(0, 0.4, 0.2)
                    });
                    licensePage.drawText("https://meditonic.glowhomeo.com", {
                        x: 50, y: ruleY - 125, size: 10,
                        font: font,
                        color: (0, pdf_lib_1.rgb)(0, 0.4, 0.8)
                    });
                    pages = doc.getPages();
                    footerText = "Licensed Copy \u2022 ".concat(name, " \u2022 ").concat(email, " \u2022 Order ").concat(orderRef);
                    diagText = "Licensed to: ".concat(name.toUpperCase());
                    for (_d = 0, pages_1 = pages; _d < pages_1.length; _d++) {
                        page = pages_1[_d];
                        _e = page.getSize(), width = _e.width, height = _e.height;
                        // ── 1. Footer strip ──────────────────────────────────────────
                        page.drawRectangle({
                            x: 0,
                            y: 0,
                            width: width,
                            height: 18,
                            color: (0, pdf_lib_1.rgb)(0.96, 0.96, 0.96),
                            opacity: 0.85,
                        });
                        page.drawText(footerText, {
                            x: 8,
                            y: 5,
                            size: 6.5,
                            font: font,
                            color: (0, pdf_lib_1.rgb)(0.45, 0.45, 0.45),
                            opacity: 0.75,
                        });
                        diagFontSize = Math.min(width / (diagText.length * 0.55), 48);
                        diagWidth = font.widthOfTextAtSize(diagText, diagFontSize);
                        page.drawText(diagText, {
                            x: (width - diagWidth * Math.cos(Math.PI / 4)) / 2,
                            y: height / 2 - (diagFontSize * Math.sin(Math.PI / 4)) / 2,
                            size: diagFontSize,
                            font: font,
                            color: (0, pdf_lib_1.rgb)(0, 0, 0),
                            opacity: 0.04,
                            rotate: (0, pdf_lib_1.degrees)(45),
                        });
                    }
                    return [4 /*yield*/, doc.save()];
                case 4:
                    watermarkedBytes = _f.sent();
                    watermarkedBuffer = Buffer.from(watermarkedBytes);
                    muhammara = require('muhammara');
                    inStream = new muhammara.PDFRStreamForBuffer(watermarkedBuffer);
                    outStream = new muhammara.PDFWStreamForBuffer();
                    primaryPassword = phone && phone.trim().length >= 8 ? phone.trim() : email;
                    muhammara.recrypt(inStream, outStream, {
                        password: '',
                        userPassword: primaryPassword,
                        ownerPassword: 'MEDITONIC_SECURE_OWNER',
                        userProtectionFlag: 4
                    });
                    return [2 /*return*/, outStream.buffer];
            }
        });
    });
}

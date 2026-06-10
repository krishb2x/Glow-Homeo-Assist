"use strict";
/**
 * lib/pdf/s3Keys.ts
 * Builds consistent S3 key paths for PDF storage.
 * Structure: store-items/by-doctor/{slug}_{shortId}/ebooks/originals/{book-slug}/{book-slug}.pdf
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.slugify = slugify;
exports.shortId = shortId;
exports.doctorFolder = doctorFolder;
exports.originalPdfKey = originalPdfKey;
exports.watermarkedPdfKey = watermarkedPdfKey;
exports.bookSlug = bookSlug;
/**
 * Converts a doctor name to a URL-safe slug
 * "Dr. Aman Agarwal" → "dr-aman-agarwal"
 */
function slugify(name) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
}
/**
 * Gets the first 8 chars of a UUID for the folder suffix
 * "1b4b8c67-6730-4afa-b045-a4a90424059b" → "1b4b8c67"
 */
function shortId(uuid) {
    return uuid.split('-')[0];
}
/**
 * Builds the doctor folder name
 * "Dr. Aman Agarwal", "1b4b8c67-..." → "dr-aman-agarwal_1b4b8c67"
 * NOTE: For Meditonic, we just use the slugified name "dr-aman-agarwal" to match the exact S3 structure from GlowHomeo if no UUID is used.
 * If the original S3 used _UUID, we omit it if we don't know it, but let's check the old implementation:
 * Actually, the old implementation returned `slugify(doctorName)`. It didn't use doctorId!
 */
function doctorFolder(doctorName, doctorId) {
    return slugify(doctorName);
}
/**
 * S3 key for an original (master) PDF
 * store-items/by-doctor/dr-aman-agarwal/ebooks/originals/ultrasound-book/ultrasound-book.pdf
 */
function originalPdfKey(doctorName, doctorId, bookSlug) {
    return "store-items/by-doctor/".concat(doctorFolder(doctorName, doctorId), "/ebooks/originals/").concat(bookSlug, "/").concat(bookSlug, ".pdf");
}
/**
 * S3 key for a watermarked (per-order) PDF
 * store-items/by-doctor/dr-aman-agarwal/ebooks/orders/GH-ORD-20260408-482910/ultrasound-book-watermarked.pdf
 */
function watermarkedPdfKey(doctorName, doctorId, orderRef, slug) {
    return "store-items/by-doctor/".concat(doctorFolder(doctorName, doctorId), "/ebooks/orders/").concat(orderRef, "/").concat(slug, "-watermarked.pdf");
}
/**
 * Extracts book slug from a product title
 * "The Ultrasound Book" → "ultrasound-book"
 */
function bookSlug(title) {
    return slugify(title.replace(/^the\s+/i, ''));
}

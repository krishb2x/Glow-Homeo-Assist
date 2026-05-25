import crypto from "node:crypto";

const ALGO = "aes-256-gcm";

function encryptionKey(): Buffer | null {
  const raw = process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY?.trim();
  if (!raw || raw.length < 32) return null;
  return crypto.createHash("sha256").update(raw).digest();
}

/** Encrypt Meta access token at rest (AES-256-GCM). Falls back to plaintext when key unset (dev only). */
export function encryptAccessToken(plain: string): { ciphertext: string | null; legacyPlain: string | null } {
  const key = encryptionKey();
  if (!key) return { ciphertext: null, legacyPlain: plain };
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const packed = Buffer.concat([iv, tag, enc]).toString("base64url");
  return { ciphertext: packed, legacyPlain: null };
}

export function decryptAccessToken(ciphertext: string | null, legacyPlain: string | null): string | null {
  if (legacyPlain?.trim()) return legacyPlain.trim();
  if (!ciphertext?.trim()) return null;
  const key = encryptionKey();
  if (!key) return null;
  try {
    const buf = Buffer.from(ciphertext, "base64url");
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const data = buf.subarray(28);
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

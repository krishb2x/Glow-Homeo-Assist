/** Opaque cursor: base64url of `isoTimestamp|uuid`. */

export function encodeCursor(iso: string, id: string): string {
  return Buffer.from(`${iso}|${id}`, "utf8").toString("base64url");
}

export function decodeCursor(cursor: string): { iso: string; id: string } | null {
  try {
    const raw = Buffer.from(cursor, "base64url").toString("utf8");
    const pipe = raw.indexOf("|");
    if (pipe <= 0) return null;
    const iso = raw.slice(0, pipe);
    const id = raw.slice(pipe + 1);
    if (!iso || !id) return null;
    return { iso, id };
  } catch {
    return null;
  }
}

export function clampLimit(raw: number | undefined, max = 50, fallback = 20): number {
  const n = raw ?? fallback;
  return Math.min(max, Math.max(1, Math.floor(n)));
}

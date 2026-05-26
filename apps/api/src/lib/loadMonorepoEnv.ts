import fs from "node:fs";
import path from "node:path";

let loadedFrom: string | null = null;
let loadedCount = 0;

/** Walk up from start dir until monorepo root `.env` is found. */
export function findMonorepoRoot(startDir: string): string | null {
  let dir = path.resolve(startDir);
  for (let i = 0; i < 10; i++) {
    const envPath = path.join(dir, ".env");
    if (fs.existsSync(envPath)) return dir;
    try {
      const pkgPath = path.join(dir, "package.json");
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as { name?: string; workspaces?: unknown };
        if (pkg.name === "homeoassist") return dir;
      }
    } catch {
      /* ignore */
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/** Parse `.env` content — strips BOM, normalizes CRLF, handles quoted values. */
export function parseEnvContent(raw: string): Record<string, string> {
  const text = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  const out: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"') && val.length >= 2) ||
      (val.startsWith("'") && val.endsWith("'") && val.length >= 2)
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

/**
 * Load monorepo root `.env` into process.env.
 * Must run before any module reads process.env.
 */
export function loadMonorepoEnv(entryDir?: string): { path: string | null; count: number } {
  if (loadedFrom) return { path: loadedFrom, count: loadedCount };

  const start = entryDir ?? path.join(__dirname, "..");
  const root = findMonorepoRoot(start);
  if (!root) {
    return { path: null, count: 0 };
  }

  const envPath = path.join(root, ".env");
  let parsed: Record<string, string> = {};
  try {
    parsed = parseEnvContent(fs.readFileSync(envPath, "utf8"));
  } catch {
    return { path: null, count: 0 };
  }

  let count = 0;
  for (const [key, val] of Object.entries(parsed)) {
    process.env[key] = val;
    count += 1;
  }

  loadedFrom = envPath;
  loadedCount = count;
  return { path: envPath, count };
}

/** Called at startup — idempotent. */
loadMonorepoEnv(path.join(__dirname, ".."));

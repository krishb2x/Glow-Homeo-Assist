/** Comma/newline separated symptoms ↔ string[] for API storage. */
export function parseSymptomsToMonitor(text: string): string[] {
  return text
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, 20);
}

export function formatSymptomsToMonitor(items: string[] | null | undefined): string {
  if (!items?.length) return "";
  return items.join(", ");
}

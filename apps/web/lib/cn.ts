/**
 * Join class names; omit falsy values.
 * Prefer Tailwind + tokens—no ad-hoc inline class strings duplicated across the app.
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

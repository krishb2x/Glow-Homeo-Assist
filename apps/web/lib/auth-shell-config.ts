/**
 * Shared config for the auth shell (Login, Forgot password, Update password).
 * Keeps copy + links centralised so every auth page exposes the same exits.
 */

export type AuthFooterLink = { label: string; href: string };

export const AUTH_BACK_HOME_LABEL = "Back to home" as const;
export const AUTH_BACK_HOME_HREF = "/" as const;

export const AUTH_FOOTER_LINKS: AuthFooterLink[] = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Security", href: "/security" },
  { label: "Contact", href: "mailto:care@glowhomeo.in" }
];

/** Trust markers shown on the desktop split-screen brand panel. */
export const AUTH_PANEL_HIGHLIGHTS: ReadonlyArray<string> = [
  "Structured homeopathic case-taking",
  "In-clinic & online consultations on one chart",
  "Professional prescriptions in seconds",
  "Patient care app under your clinic brand"
];

/** Returns the auth page footer year — useful for testing too. */
export function authFooterYear(now: Date = new Date()): number {
  return now.getFullYear();
}

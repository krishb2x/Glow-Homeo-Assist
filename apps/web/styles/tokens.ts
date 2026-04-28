/**
 * TypeScript design tokens — use for tests, programatic spacing, and documentation.
 * Authoritative color/spacing values live in `styles/theme.css` (CSS custom properties).
 */

export const space = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32
} as const;

export type SpaceKey = keyof typeof space;

export const colorVar = {
  primary: "--ds-primary",
  primaryLight: "--ds-primary-light",
  primaryDark: "--ds-primary-dark",
  primaryVeryLight: "--ds-primary-very-light",
  accent: "--ds-accent",
  background: "--ds-bg",
  surface: "--ds-surface",
  card: "--ds-card",
  paper: "--ds-paper",
  border: "--ds-border",
  borderDark: "--ds-border-dark",
  text: "--ds-text",
  textSecondary: "--ds-text-secondary",
  textTertiary: "--ds-text-tertiary",
  success: "--ds-success",
  warning: "--ds-warning",
  error: "--ds-error",
  info: "--ds-info"
} as const;

export const motion = {
  fast: "var(--ds-duration-fast)",
  normal: "var(--ds-duration-normal)",
  easeOut: "var(--ds-ease-out)",
  easeInOut: "var(--ds-ease-in-out)"
} as const;

/** Maps semantic roles to recommended Tailwind utility classes (ds-backed). */
export const typography = {
  hero: "typo-hero font-heading",
  section: "typo-section font-heading",
  body: "typo-body",
  small: "typo-small"
} as const;

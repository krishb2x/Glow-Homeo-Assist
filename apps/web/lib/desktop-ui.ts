/**
 * Desktop clinic UI tokens — use with `cn()` for consistent spacing and surfaces.
 * Aligns with `--ds-space-*` in styles/theme.css (8px grid).
 */

/** Standard page content width (72rem / 1152px). */
export const DS_PAGE_MAX = "max-w-6xl";

/** Vertical gap between major page sections. */
export const DS_SECTION_GAP = "space-y-5";

/** Tighter stack for dense clinical panels. */
export const DS_STACK_TIGHT = "space-y-4";

/** Default card surface — calm border, minimal shadow. */
export const DS_CARD =
  "rounded-xl border border-hs-border/35 bg-hs-paper shadow-ds-sm";

/** Card inner padding (desktop). */
export const DS_CARD_PAD = "p-4 lg:p-5";

/** Section heading row */
export const DS_SECTION_HEADING =
  "font-heading text-body-md font-semibold tracking-tight text-hs-ink";

/** Muted section description */
export const DS_SECTION_DESC = "mt-0.5 text-caption-sm text-hs-text-secondary";

/** Primary action button (desktop) */
export const DS_BTN_PRIMARY =
  "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-hs-primary px-3.5 text-caption-sm font-semibold text-white transition hover:bg-hs-primary-light";

/** Secondary / ghost action */
export const DS_BTN_SECONDARY =
  "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-hs-border/45 bg-hs-paper px-3.5 text-caption-sm font-medium text-hs-ink transition hover:border-hs-primary/30 hover:bg-hs-cream/50";

/** Text-only action (reduces button clutter) */
export const DS_LINK_ACTION =
  "text-caption-sm font-semibold text-hs-primary transition hover:text-hs-primary-light hover:underline";

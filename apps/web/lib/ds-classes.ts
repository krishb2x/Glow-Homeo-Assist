/**
 * Shared Tailwind class strings for the authenticated app — keeps buttons, fields,
 * and chrome visually aligned across pages.
 */
export const DS_FIELD =
  "w-full rounded-xl border border-hs-border/40 bg-hs-cream/40 px-3 py-2.5 text-sm text-hs-ink shadow-input placeholder:text-hs-text-tertiary/80 hover:border-hs-border-dark/60 focus:border-hs-primary/45 focus:outline-none focus:ring-2 focus:ring-hs-primary/15";

export const DS_FIELD_SEARCH =
  "w-full rounded-xl border border-hs-border/40 bg-hs-paper py-2.5 pl-11 pr-4 text-body-sm text-hs-ink shadow-input placeholder:text-hs-text-tertiary focus:border-hs-primary/45 focus:outline-none focus:ring-2 focus:ring-hs-primary/15";

export const DS_BTN_PRIMARY =
  "inline-flex min-h-10 items-center justify-center rounded-xl bg-hs-primary px-4 py-2.5 text-sm font-semibold text-white shadow-ds-sm transition hover:bg-hs-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hs-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-hs-surface disabled:pointer-events-none disabled:opacity-50";

export const DS_BTN_PRIMARY_ROUNDED =
  "inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl bg-hs-primary px-4 py-2.5 text-sm font-semibold text-white shadow-ds-sm transition hover:bg-hs-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hs-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-hs-cream";

export const DS_BTN_SECONDARY =
  "inline-flex min-h-10 items-center justify-center rounded-xl border border-hs-border/60 bg-hs-paper px-4 py-2.5 text-sm font-semibold text-hs-ink transition hover:border-hs-primary/35 hover:bg-hs-cream/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hs-primary/25";

/** Pill toggle — selected state (brand-aligned; avoids one-off emerald/sky chrome). */
export const DS_SEGMENT_SELECTED =
  "border-hs-primary/45 bg-hs-primary-very-light text-hs-primary shadow-ds-sm ring-1 ring-hs-primary/20";

/** Pill toggle — idle */
export const DS_SEGMENT_IDLE =
  "border-hs-border/60 bg-hs-paper text-hs-ink hover:border-hs-primary/30 hover:bg-hs-cream/60";

/** Raised cards / list panels */
export const DS_SURFACE_PANEL =
  "rounded-xl border border-hs-border/35 bg-hs-paper shadow-ds-sm";

export const DS_SURFACE_DASHED =
  "rounded-xl border border-dashed border-hs-border/40 bg-hs-cream/40";

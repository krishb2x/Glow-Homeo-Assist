/**
 * Central motion presets — use everywhere instead of ad hoc durations/easing.
 * Matches `--ds-ease-out` in styles/theme.css.
 */
export const DS_EASE_OUT = [0.33, 1, 0.68, 1] as const;

export const DS_DURATION = {
  page: 0.24,
  modal: 0.22,
  tap: 0.2,
  hover: 0.28
} as const;

export type ReducedMotionAware = boolean;

/** Route-level enter (used by app `(app)/template.tsx`). */
export function dsPageEnterTransition(reduceMotion: ReducedMotionAware): {
  initial: false | { opacity: number; y: number };
  animate: { opacity: number; y: number };
  transition: { duration: number; ease: typeof DS_EASE_OUT };
} {
  return {
    initial: reduceMotion ? false : { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduceMotion ? 0 : DS_DURATION.page, ease: DS_EASE_OUT }
  };
}

/** Modal backdrop fade */
export const dsModalBackdropProps = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: DS_DURATION.modal }
} as const;

/** Modal panel: fade + slight lift scale */
export const dsModalContentProps = {
  initial: { opacity: 0, scale: 0.97, y: 10 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.97, y: 10 },
  transition: { duration: DS_DURATION.modal, ease: DS_EASE_OUT }
} as const;

/**
 * Stagger container — pass as `variants` to a wrapping `motion.div`.
 * Use with `initial="hidden" whileInView="show" viewport={{ once: true }}`.
 */
export function dsStaggerContainer(reduce: ReducedMotionAware) {
  return {
    hidden: {},
    show: {
      transition: {
        staggerChildren: reduce ? 0 : 0.09,
        delayChildren: reduce ? 0 : 0.06
      }
    }
  } as const;
}

/**
 * Child variant for staggered list/grid items — pair with `dsStaggerContainer`.
 */
export function dsListItemVariant(reduce: ReducedMotionAware) {
  return {
    hidden: reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 22 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.48, ease: DS_EASE_OUT }
    }
  } as const;
}

/** Single fade-up for an isolated element — use `initial/animate` directly. */
export function dsFadeUp(reduce: ReducedMotionAware, delay = 0) {
  return {
    initial: reduce ? false : ({ opacity: 0, y: 16 } as const),
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduce ? 0 : 0.55, ease: DS_EASE_OUT, delay }
  } as const;
}

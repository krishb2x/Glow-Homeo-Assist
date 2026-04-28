"use client";

import { useReducedMotion } from "framer-motion";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

type MotionSectionProps = {
  id?: string;
  className?: string;
  children: ReactNode;
  delay?: number;
};

/**
 * Subtle in-view rise for marketing sections. Respects prefers-reduced-motion.
 */
export function MotionSection({ id, className = "", children, delay = 0 }: MotionSectionProps): JSX.Element {
  const reduce = useReducedMotion();
  if (reduce) {
    return (
      <section id={id} className={className}>
        {children}
      </section>
    );
  }
  return (
    <motion.section
      id={id}
      className={className}
      initial={{ opacity: 0, y: 24, scale: 0.995 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-60px 0px -60px 0px", amount: 0.08 }}
      transition={{ duration: 0.58, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.section>
  );
}

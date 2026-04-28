"use client";

import { useReducedMotion } from "framer-motion";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type WorkflowItem = {
  step: string;
  title: string;
  description: string;
  accent: string;
  Icon: LucideIcon;
};

const containerV = (reduce: boolean) => ({
  hidden: {},
  show: { transition: { staggerChildren: reduce ? 0 : 0.07, delayChildren: 0.04 } }
});

const itemV = (reduce: boolean) => ({
  hidden: reduce
    ? { opacity: 1, y: 0 }
    : { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as const } }
});

const bentoColClass = (index: number) => {
  const spans = [
    "lg:col-span-3",
    "lg:col-span-3",
    "lg:col-span-2",
    "lg:col-span-2",
    "lg:col-span-2",
    "lg:col-span-6"
  ] as const;
  return spans[index] ?? "lg:col-span-2";
};

export function WorkflowStagger({
  items,
  renderCard,
  layout = "grid"
}: {
  items: readonly WorkflowItem[];
  renderCard: (w: WorkflowItem, index: number) => ReactNode;
  /** `bento`: 6+4 column feature grid on large screens (first row two halves; middle row three; last row full width). */
  layout?: "grid" | "bento";
}): JSX.Element {
  const reduce = useReducedMotion();
  const gridClass =
    layout === "bento"
      ? "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-6"
      : "grid gap-5 sm:grid-cols-2 lg:grid-cols-3";
  return (
    <motion.div
      className={gridClass}
      variants={containerV(!!reduce)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-6% 0px", amount: 0.12 }}
    >
      {items.map((w, i) => (
        <motion.div
          key={w.step}
          variants={itemV(!!reduce)}
          className={`h-full min-h-0 ${layout === "bento" ? bentoColClass(i) : ""}`}
        >
          {renderCard(w, i)}
        </motion.div>
      ))}
    </motion.div>
  );
}

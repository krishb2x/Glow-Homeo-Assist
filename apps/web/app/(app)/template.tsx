"use client";

import { motion, useReducedMotion } from "framer-motion";
import { type ReactNode } from "react";
import { dsPageEnterTransition } from "../../lib/ds-motion";

export default function AppSectionTemplate({ children }: { children: ReactNode }): JSX.Element {
  const reduce = !!useReducedMotion();
  const enter = dsPageEnterTransition(reduce);
  return (
    <motion.div className="min-h-0" initial={enter.initial} animate={enter.animate} transition={enter.transition}>
      {children}
    </motion.div>
  );
}

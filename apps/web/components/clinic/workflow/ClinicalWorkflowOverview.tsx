"use client";

import Link from "next/link";
import { ArrowRight, Calendar, FileSignature, Stethoscope, ChevronRight } from "lucide-react";
import { CLINICAL_PHASES } from "../../../lib/clinical-workflow-config";

import { motion } from "framer-motion";

const PHASE_ICONS = {
  arrival: Stethoscope,
  treatment: FileSignature,
  continuity: Calendar
} as const;

export function ClinicalWorkflowOverview(): JSX.Element {
  const phases = ["arrival", "treatment", "continuity"] as const;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-hs-border/20 bg-white/40 px-6 py-4 backdrop-blur-xl shadow-lg"
      aria-label="Visit flow"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-hs-text-secondary/70">Visit Workflow</span>
        <div className="hidden sm:block h-4 w-px bg-hs-border/30" />
        {phases.map((phase, i) => {
          const meta = CLINICAL_PHASES[phase];
          const Icon = PHASE_ICONS[phase];
          return (
            <div key={phase} className="flex items-center gap-3">
              {i > 0 && <ChevronRight className="h-4 w-4 text-hs-border-dark/50" aria-hidden />}
              <span className="group flex items-center gap-2 rounded-xl bg-white/60 px-3 py-1.5 text-sm font-semibold text-hs-ink shadow-sm ring-1 ring-black/5 transition-all hover:bg-white hover:shadow-md hover:ring-black/10">
                <Icon className="h-4 w-4 text-emerald-500 transition-transform group-hover:scale-110 group-hover:text-emerald-600" aria-hidden />
                {meta.label}
              </span>
            </div>
          );
        })}
      </div>
      
      <Link
        href="/consultation"
        className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-hs-ink px-5 py-2 text-sm font-bold text-white transition-all hover:bg-black hover:shadow-md"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/20 to-emerald-500/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        <span className="relative">Start visit</span>
        <ArrowRight className="relative h-4 w-4 transition-transform group-hover:translate-x-1 text-emerald-400" aria-hidden />
      </Link>
    </motion.div>
  );
}

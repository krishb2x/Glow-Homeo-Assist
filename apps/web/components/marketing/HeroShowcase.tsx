"use client";

import { useReducedMotion } from "framer-motion";
import { FileStack, MessageCircle, Stethoscope } from "lucide-react";
import { motion } from "framer-motion";
import { BRAND_NAME } from "../../lib/brand";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.18 } }
};

function item(reduce: boolean) {
  return {
    hidden: { opacity: reduce ? 1 : 0, y: reduce ? 0 : 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: reduce ? 0.01 : 0.55, ease: [0.25, 0.46, 0.45, 0.94] as const }
    }
  };
}

function hoverLift(reduce: boolean) {
  return reduce ? undefined : { y: -2, scale: 1.005, transition: { type: "spring" as const, stiffness: 360, damping: 32 } };
}

export function HeroShowcase(): JSX.Element {
  const reduce = useReducedMotion();
  const v = item(!!reduce);
  return (
    <div
      className="relative mx-auto w-full max-w-[22rem] overflow-hidden sm:max-w-md lg:mx-0 lg:max-w-none lg:overflow-visible"
      aria-hidden
    >
      {/* Decorative glows — hidden on mobile to avoid paint cost */}
      <div className="pointer-events-none absolute -left-8 top-1/2 hidden h-56 w-56 -translate-y-1/2 rounded-full bg-slate-200/40 blur-3xl sm:block" />
      <div className="pointer-events-none absolute -right-4 top-0 hidden h-40 w-40 rounded-full bg-slate-300/20 blur-3xl sm:block" />
      <motion.div
        className="relative flex min-h-[300px] flex-col items-center justify-center sm:min-h-[330px] lg:min-h-[370px]"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {/* Card 1: Case file — top-left */}
        <motion.div
          variants={v}
          whileHover={hoverLift(!!reduce)}
          className="marketing-card-premium !rounded-xl absolute left-0 top-0 z-20 w-[86%] max-w-[300px] p-4 sm:w-[88%] sm:max-w-sm"
        >
          <div className="mb-2 flex items-center justify-between text-[0.7rem] font-medium uppercase tracking-[0.1em] text-slate-500">
            <span className="inline-flex items-center gap-1.5 text-slate-700">
              <FileStack className="h-3.5 w-3.5 text-hs-primary" strokeWidth={1.75} />
              Case
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-hs-primary/80" />
          </div>
          <p className="text-[0.8rem] font-medium text-slate-800">One record for every visit</p>
          <p className="mt-1 text-[0.75rem] leading-relaxed text-slate-600">OPD, video, and phone in the same file.</p>
        </motion.div>

        {/* Card 2: Consult — middle-right */}
        <motion.div
          variants={v}
          whileHover={hoverLift(!!reduce)}
          className="marketing-card-premium !rounded-xl absolute right-0 top-[30%] z-10 w-[78%] max-w-[280px] p-4 sm:w-[82%] sm:max-w-[19rem]"
        >
          <div className="mb-1.5 flex items-center justify-between text-[0.7rem] font-medium uppercase tracking-[0.1em] text-slate-500">
            <span className="inline-flex items-center gap-1.5 text-slate-700">
              <Stethoscope className="h-3.5 w-3.5 text-hs-primary" strokeWidth={1.75} />
              Consult
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-4/5 rounded-full bg-hs-primary" />
          </div>
          <p className="mt-2 text-[0.75rem] text-slate-600">Structured assessment, one chart</p>
        </motion.div>

        {/* Card 3: Between visits — bottom-center */}
        <motion.div
          variants={v}
          whileHover={hoverLift(!!reduce)}
          className="marketing-card-premium !rounded-xl !border-emerald-200/45 absolute bottom-0 left-1/2 z-30 w-[88%] max-w-[320px] -translate-x-1/2 p-4 sm:w-[90%] sm:max-w-[340px] [background:linear-gradient(165deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.96)_45%,rgba(236,253,245,0.35)_100%)]"
        >
          <div className="mb-1.5 flex items-center justify-between text-[0.7rem] font-medium uppercase tracking-[0.1em] text-slate-500">
            <span className="inline-flex items-center gap-1.5 text-slate-700">
              <MessageCircle className="h-3.5 w-3.5 text-emerald-700/90" strokeWidth={1.75} />
              Between visits
            </span>
            <span className="text-slate-500">Clinic</span>
          </div>
          <p className="text-[0.8rem] font-medium text-slate-800">WhatsApp + patient reminders</p>
          <p className="mt-0.5 text-[0.72rem] text-slate-600">Tied to what you prescribed in {BRAND_NAME}.</p>
        </motion.div>
      </motion.div>
    </div>
  );
}

"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  FileText,
  Package,
  Smartphone,
  Sparkles,
  Stethoscope,
  TrendingUp
} from "lucide-react";
import { dsListItemVariant, dsStaggerContainer } from "../../lib/ds-motion";

const features = [
  {
    Icon: Stethoscope,
    title: "Consultation workspace",
    body: "Take homeopathic cases in OPD and online with the same chart and the same steps every time. AI notes help in the background without interrupting you.",
    tag: "In-clinic & online",
    accent: "border-hs-primary/20 bg-hs-primary/[0.03]",
    iconBg: "bg-hs-primary/[0.09] text-hs-primary ring-hs-primary/15"
  },
  {
    Icon: Smartphone,
    title: "Patient care app",
    body: "Your patients use an app under your clinic name. Medicine reminders, diet and lifestyle guidance, tasks you assign, and follow-up dates match what you prescribed.",
    tag: "Your biggest differentiator",
    accent: "border-emerald-200/60 bg-emerald-50/30",
    iconBg: "bg-emerald-600/[0.08] text-emerald-700 ring-emerald-200/60"
  },
  {
    Icon: Sparkles,
    title: "AI notetaker",
    body: "Records and drafts clinical notes during the consultation. You review, edit, and approve before anything is saved.",
    accent: "border-sky-200/60 bg-sky-50/25",
    iconBg: "bg-sky-500/[0.07] text-sky-700 ring-sky-200/60"
  },
  {
    Icon: FileText,
    title: "Professional prescriptions",
    body: "Print-ready PDFs with your name, registration, clinic details, and signature. Send to the patient app, WhatsApp, or email. Doctor and patient copies stay aligned.",
    accent: "border-amber-200/60 bg-amber-50/25",
    iconBg: "bg-amber-500/[0.08] text-amber-700 ring-amber-200/60"
  },
  {
    Icon: Package,
    title: "Remedy inventory",
    body: "Track remedy and supplement stock, build kits for common cases, and get alerts before you run out.",
    accent: "border-violet-200/60 bg-violet-50/25",
    iconBg: "bg-violet-500/[0.08] text-violet-700 ring-violet-200/60"
  },
  {
    Icon: TrendingUp,
    title: "Practice growth",
    body: "Reach patients under your clinic brand, not your personal WhatsApp. Referrals and follow-ups stay professional.",
    accent: "border-rose-200/60 bg-rose-50/25",
    iconBg: "bg-rose-500/[0.08] text-rose-700 ring-rose-200/60"
  }
];

export function FeatureGrid(): JSX.Element {
  const reduce = !!useReducedMotion();
  const container = dsStaggerContainer(reduce);
  const item = dsListItemVariant(reduce);

  return (
    <motion.div
      className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      variants={container}
    >
      {features.map(({ Icon, title, body, tag, accent, iconBg }) => (
        <motion.div
          key={title}
          variants={item}
          className={`marketing-card-hover group rounded-2xl border p-6 ${accent}`}
        >
          <div
            className={`marketing-icon-ring mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl ring-1 transition-transform duration-300 group-hover:scale-110 ${iconBg}`}
          >
            <Icon className="h-5 w-5" strokeWidth={1.6} />
          </div>

          {tag ? (
            <span className="mb-2 inline-block rounded-full bg-hs-primary/10 px-2.5 py-0.5 text-[0.67rem] font-bold uppercase tracking-wider text-hs-primary">
              {tag}
            </span>
          ) : null}

          <h3 className="font-heading mb-2 text-[0.98rem] font-semibold leading-snug text-slate-900">
            {title}
          </h3>
          <p className="text-[0.86rem] leading-relaxed text-slate-500">{body}</p>
        </motion.div>
      ))}
    </motion.div>
  );
}

"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { BRAND_NAME } from "../../lib/brand";
import { MotionSection } from "./MotionSection";

const faqs = [
  {
    q: "Who is HomeoAssist designed for?",
    a: `For homeopathy doctors and clinics of any size — solo practitioners, small clinics, and multi-doctor setups. Every feature is shaped around how homeopathy practice actually works, not adapted from a generic medical tool.`
  },
  {
    q: `What does the patient care app do?`,
    a: `Your patients get a clinic app personalised to your practice. It sends medicine reminders at the exact times you prescribe, delivers diet and lifestyle guidance from your case notes, tracks todos you assign between visits, stores follow-up dates, and keeps the full clinical picture — so the care you provide stays active long after they leave your clinic.`
  },
  {
    q: "Does it work for online consultations too?",
    a: "Fully. Whether the patient is sitting in front of you or joining remotely on a call, the same case file, AI notetaker, prescription workflow, and advice templates apply. In-clinic and online consultations are treated identically inside the system."
  },
  {
    q: "Will this replace my paper register and case files?",
    a: `Yes. Patient records, structured homeopathic case notes, prescriptions, follow-up plans, remedy history, and the full clinical timeline all live in ${BRAND_NAME} — organised, searchable, and accessible from any device, including your phone.`
  },
  {
    q: "Is my patient data private and secure?",
    a: "Your data belongs entirely to your clinic. Access is controlled by you and your authorised team only. We do not share, mix, or expose records across clinics or to any third party."
  },
  {
    q: "How do I get started?",
    a: `${BRAND_NAME} is currently in early access. Book a walkthrough and we will set up your clinic personally, help move your existing patient list if needed, and stay available while your team gets comfortable with the system.`
  }
];

export function FAQSection(): JSX.Element {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <MotionSection
      id="faq"
      className="scroll-mt-20 ms-section-light px-5 py-16 sm:px-6 sm:py-20 md:px-10 md:py-24"
    >
      <div className="mx-auto max-w-2xl">
        <p className="ms-eyebrow text-center">Common questions</p>
        <h2 className="ms-h2 mt-2 max-w-none text-center">Everything you need to know</h2>

        <dl className="mt-10 divide-y divide-slate-100">
          {faqs.map((faq, i) => (
            <div key={i} className="py-4">
              <dt>
                <button
                  type="button"
                  onClick={() => setOpen(open === i ? null : i)}
                  className="flex w-full items-start justify-between gap-4 text-left"
                  aria-expanded={open === i}
                >
                  <span className="font-heading text-[0.95rem] font-semibold leading-snug text-slate-900">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`mt-0.5 h-5 w-5 shrink-0 text-hs-primary transition-transform duration-200 ${
                      open === i ? "rotate-180" : ""
                    }`}
                    strokeWidth={2}
                  />
                </button>
              </dt>
              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.dd
                    key="answer"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.24, ease: [0.33, 1, 0.68, 1] }}
                    className="overflow-hidden"
                  >
                    <p className="mt-3 pb-1 text-[0.9rem] leading-relaxed text-slate-500">{faq.a}</p>
                  </motion.dd>
                )}
              </AnimatePresence>
            </div>
          ))}
        </dl>
      </div>
    </MotionSection>
  );
}

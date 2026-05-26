"use client";

import {
  FileText,
  MessageCircle,
  Smartphone,
  Stethoscope,
  Users
} from "lucide-react";
import { MotionSection } from "./MotionSection";
import { WorkflowStagger, type WorkflowItem } from "./WorkflowStagger";

const workflow: readonly WorkflowItem[] = [
  {
    step: "01",
    title: "Patient and case file",
    description:
      "One case sheet per person for your clinic. Demographics, history, and who is looking after the file stay together so your team does not hunt in three folders.",
    accent: "ms-accent-brand",
    Icon: Users
  },
  {
    step: "02",
    title: "OPD / consulting room and online, one record",
    description:
      "In-person consultation in the OPD or consulting room, or a tele-consultation on video or phone, both update the same structured homeopathic case. No separate “video only” file.",
    accent: "ms-accent-visit",
    Icon: Stethoscope
  },
  {
    step: "03",
    title: "Structured clinical record",
    description:
      "Document chief complaints, modalities, mental and physical state, and your clinical impression in a consistent homeopathic format. Every note stays in the patient chart you control.",
    accent: "ms-accent-doc",
    Icon: FileText
  },
  {
    step: "04",
    title: "Prescription, advice, and handouts",
    description:
      "Print-ready documents for the patient and your file: remedy list, clear instructions, and the advice you actually gave, not a generic template you edit again at night.",
    accent: "ms-accent-doc",
    Icon: FileText
  },
  {
    step: "05",
    title: "Your clinic on WhatsApp",
    description:
      "Patients can reach your practice on WhatsApp: follow-up questions, simple coordination, and light communication under your clinic name, not a mix of private numbers and lost threads.",
    accent: "ms-accent-wa",
    Icon: MessageCircle
  },
  {
    step: "06",
    title: "Patient app and your follow-up list",
    description:
      "The patient can get reminders for medicine times and the lifestyle follow-through you set. You see who is due for a repeat consultation and where adherence is weak, in one place.",
    accent: "ms-accent-follow",
    Icon: Smartphone
  }
];

export function MarketingWorkflowSection(): JSX.Element {
  return (
    <MotionSection
      id="workflow"
      className="scroll-mt-20 relative border-b border-slate-200/40 bg-slate-50/20 px-5 py-14 sm:px-6 sm:py-16 md:px-10 md:py-24"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgb(61_105_100/0.04),transparent_55%)]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-5xl">
        <p className="ms-eyebrow">What is inside the product</p>
        <h2 className="ms-h2 mt-2 max-w-2xl text-2xl md:text-3xl">Six parts that plug into the same case</h2>
        <p className="mt-4 max-w-2xl text-[0.94rem] leading-relaxed text-slate-600">
          The list below is <strong className="font-medium text-slate-800">one connected system</strong>. The patient file, OPD and
          online consultations, notes, documents, WhatsApp, and the patient app all refer to the same person and the same line of
          treatment, so you are not retyping the same story in a new app each time.
        </p>
        <div className="mt-12">
          <WorkflowStagger
            layout="bento"
            items={workflow}
            renderCard={(w, i) => {
              const Icon = w.Icon;
              const isWide = i === workflow.length - 1;
              return (
                <article
                  className={`group marketing-card-premium marketing-sheen marketing-card-hover flex h-full flex-col pl-0 pr-4 pb-5 pt-5 md:pr-5 ${w.accent} ${isWide ? "lg:py-6" : ""}`}
                >
                  <div className="flex items-start gap-3 pl-4 md:pl-5">
                    <div className="marketing-icon-ring shrink-0 text-hs-primary transition group-hover:ring-slate-300/80">
                      <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-heading text-sm font-medium tabular-nums text-slate-400">{w.step}</p>
                      <h3 className="ms-h3 mt-0.5 text-[0.95rem] leading-tight !tracking-[-0.01em]">{w.title}</h3>
                      <p className="mt-2 text-[0.84rem] leading-[1.55] text-slate-600">{w.description}</p>
                    </div>
                  </div>
                </article>
              );
            }}
          />
        </div>
      </div>
    </MotionSection>
  );
}

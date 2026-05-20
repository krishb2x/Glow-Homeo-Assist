import type { Metadata } from "next";
import Link from "next/link";
import {
  Bell,
  CalendarCheck,
  ClipboardList,
  FileSignature,
  FileText,
  Package,
  Smartphone,
  Sparkles,
  Stethoscope,
  TrendingUp,
  Users
} from "lucide-react";
import { LandingHeader } from "../../components/LandingHeader";
import { MarketingFooter } from "../../components/marketing/MarketingFooter";
import { HowItWorks } from "../../components/marketing/HowItWorks";
import { ClinicalCTAGroup } from "../../components/marketing/ClinicalCTAGroup";
import { BRAND_NAME } from "../../lib/brand";

export const metadata: Metadata = {
  title: `Features | ${BRAND_NAME}`,
  description:
    "Every module inside GlowHomeo Assist — the clinical operating system designed with practising homeopaths. Consultation, prescriptions, patient app, inventory, and clinic growth."
};

type Module = {
  Icon: typeof Stethoscope;
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[];
};

const MODULES: Module[] = [
  {
    Icon: Stethoscope,
    eyebrow: "Consultation workspace",
    title: "A structured case file — for OPD and online, identical.",
    body:
      "Take homeopathic cases the way you already do — chief complaints, modalities, mental and physical state, family history, past treatments — in a structured workspace that doesn't change between in-clinic and online visits.",
    bullets: [
      "One chart for in-clinic and online consultations",
      "Repertorisation-ready structured fields, not free-text fields",
      "Past visits, prescriptions, and follow-ups in one timeline",
      "Auto-saved drafts you can resume at any time"
    ]
  },
  {
    Icon: Sparkles,
    eyebrow: "AI notetaker",
    title: "AI takes the notes. You stay with the patient.",
    body:
      "The AI notetaker listens, transcribes, and structures notes in the homeopathic format. Every word stays a draft until you review and approve it.",
    bullets: [
      "Live transcription on consultation",
      "Structured output: chief complaints, modalities, mental state, etc.",
      "Doctor approval required — nothing auto-saves",
      "Opt-in per consultation, with audio purged on a strict schedule"
    ]
  },
  {
    Icon: FileSignature,
    eyebrow: "Prescriptions",
    title: "Professional prescriptions, generated and sent in seconds.",
    body:
      "Print-ready prescription PDFs with your registration number, clinic details, and digital signature. Doctor and patient versions stay aligned automatically.",
    bullets: [
      "Doctor and patient prescription versions in one click",
      "Send via patient app, WhatsApp, email, or print",
      "Automatically stored against the patient's chart",
      "Letterhead, signature, and compliance details handled"
    ]
  },
  {
    Icon: Smartphone,
    eyebrow: "Patient care app",
    title: "Your patient gets a clinic app — not a generic health app.",
    body:
      "Reminders, diet, lifestyle, todos, follow-ups, and case history — under your clinic brand, personalised to the exact prescription you wrote.",
    bullets: [
      "Branded under your clinic — patients see your name, not ours",
      "Medicine reminders at the times you prescribe",
      "Diet and lifestyle plans pulled from your case notes",
      "Doctor-assigned todos tracked between visits"
    ]
  },
  {
    Icon: Package,
    eyebrow: "Remedy inventory",
    title: "Stock that travels with the chart.",
    body:
      "Track remedy and supplement stock, build treatment kits for common case types, and get alerts before you run out.",
    bullets: [
      "Track potency-wise stock, dispense quantity, and lot info",
      "Build kits for common case types you treat",
      "Low-stock alerts before they hit the consultation room",
      "Linked to prescriptions for accurate billing"
    ]
  },
  {
    Icon: TrendingUp,
    eyebrow: "Practice growth",
    title: "Grow your practice under your clinic brand — not your personal number.",
    body:
      "A professional clinic page, referral tracking, and branded communications. Move patient interactions off your personal accounts.",
    bullets: [
      "Clinic profile page with appointment booking",
      "Referral tracking from existing patients",
      "Branded WhatsApp and email messages",
      "Reports that show where your patients are coming from"
    ]
  },
  {
    Icon: Users,
    eyebrow: "Team & roles",
    title: "Built for solo, clinic, and multi-doctor setups.",
    body:
      "Each doctor sees their own patients. Receptionists handle appointments. Clinic admins see the full operation.",
    bullets: [
      "Role-based access: Doctor, Receptionist, Clinic Admin",
      "Records scoped per doctor by default",
      "Clinic-level visibility configurable per role",
      "Audit trail of every record access and edit"
    ]
  },
  {
    Icon: ClipboardList,
    eyebrow: "Clinic operations",
    title: "Everything else a clinic actually runs on.",
    body:
      "Appointments, follow-up queues, patient documents, simple reporting — without bolting on a separate practice-management tool.",
    bullets: [
      "Appointment scheduling for OPD and online",
      "Follow-up queue with priority lanes",
      "Document storage on each patient's chart",
      "Daily case-load reports for solo and team setups"
    ]
  }
];

export default function FeaturesPage(): JSX.Element {
  return (
    <div className="bg-white text-slate-900">
      <LandingHeader />

      <main id="main-content" className="relative">
        {/* ── Hero ───────────────────────────────────────────────── */}
        <section className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-b from-[#f7faf9] via-white to-white px-5 pb-12 pt-14 sm:px-6 sm:pt-20 md:px-10 md:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-hs-primary">
              Features
            </p>
            <h1 className="font-heading mt-3 text-balance text-[2rem] font-semibold leading-tight tracking-tight text-slate-900 sm:text-[2.5rem]">
              Every module, end-to-end — designed with practising homeopaths.
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-[0.98rem] leading-relaxed text-slate-500">
              {BRAND_NAME} replaces the five disconnected tools most clinics run on. Here is what
              you get, module by module.
            </p>
          </div>
        </section>

        {/* ── Module list ───────────────────────────────────────── */}
        <section className="bg-white px-5 py-16 sm:px-6 sm:py-20 md:px-10">
          <div className="mx-auto max-w-5xl space-y-12">
            {MODULES.map(({ Icon, eyebrow, title, body, bullets }) => (
              <article
                key={eyebrow}
                className="grid gap-6 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_0_rgba(15,23,42,0.04)] sm:p-8 lg:grid-cols-[1.05fr_1fr] lg:gap-10"
              >
                <div>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-hs-primary/10 text-hs-primary">
                    <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden />
                  </span>
                  <p className="mt-4 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-hs-primary">
                    {eyebrow}
                  </p>
                  <h2 className="font-heading mt-2 text-balance text-[1.35rem] font-semibold leading-tight text-slate-900 sm:text-[1.55rem]">
                    {title}
                  </h2>
                  <p className="mt-3 text-[0.93rem] leading-relaxed text-slate-500">{body}</p>
                </div>
                <ul className="space-y-3 self-center">
                  {bullets.map((b) => (
                    <li
                      key={b}
                      className="flex items-start gap-3 text-[0.9rem] leading-relaxed text-slate-700"
                    >
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-hs-primary" aria-hidden />
                      {b}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        {/* ── Patient app deep-dive ─────────────────────────────── */}
        <section className="bg-slate-50/60 px-5 py-20 sm:px-6 sm:py-24 md:px-10">
          <div className="mx-auto max-w-5xl">
            <div className="max-w-2xl">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-hs-primary">
                What the patient sees
              </p>
              <h2 className="font-heading mt-3 text-balance text-[1.6rem] font-semibold leading-tight tracking-tight text-slate-900 sm:text-[1.85rem]">
                A clinic app that actually keeps the patient on track.
              </h2>
            </div>

            <ul className="mt-10 grid gap-3 sm:grid-cols-2">
              {[
                { Icon: Bell, title: "Medicine reminders", body: "At the exact times you prescribe — morning, afternoon, evening, night." },
                { Icon: CalendarCheck, title: "Follow-up dates", body: "Their next visit, in their pocket — with a one-tap reschedule." },
                { Icon: FileText, title: "Prescription history", body: "Every prescription you've written, neatly organised." },
                { Icon: ClipboardList, title: "Diet & lifestyle todos", body: "Directly from your case notes — checked off as they go." }
              ].map(({ Icon, title, body }) => (
                <li
                  key={title}
                  className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_0_rgba(15,23,42,0.04)]"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-hs-primary/10 text-hs-primary">
                    <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
                  </span>
                  <div>
                    <p className="font-heading text-[0.9rem] font-semibold text-slate-900">{title}</p>
                    <p className="mt-1 text-[0.83rem] leading-relaxed text-slate-500">{body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── How it works (re-used) ────────────────────────────── */}
        <HowItWorks />

        {/* ── CTA ───────────────────────────────────────────────── */}
        <section className="border-t border-slate-100 bg-white px-5 py-20 sm:px-6 sm:py-24 md:px-10">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-heading text-balance text-[1.75rem] font-semibold leading-tight tracking-tight text-slate-900 sm:text-[2rem]">
              Want to see it on your own caseload?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-[0.95rem] leading-relaxed text-slate-500">
              A 20-minute walkthrough is the fastest way to judge fit. Or read the{" "}
              <Link href="/pricing" className="font-semibold text-hs-primary hover:underline">
                pricing
              </Link>{" "}
              before you reach out.
            </p>

            <div className="mt-10 flex justify-center">
              <ClinicalCTAGroup className="w-full justify-center" />
            </div>
          </div>
        </section>

        <MarketingFooter />
      </main>
    </div>
  );
}

import {
  Bell,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Smartphone,
  Sparkles,
  Stethoscope
} from "lucide-react";
import Link from "next/link";
import { ClinicalCTAGroup } from "../components/marketing/ClinicalCTAGroup";
import { GuidedTrialSection } from "../components/marketing/GuidedTrialSection";
import { LandingHeader } from "../components/LandingHeader";
import { FAQSection } from "../components/marketing/FAQSection";
import { FeatureGrid } from "../components/marketing/FeatureGrid";
import { HowItWorks } from "../components/marketing/HowItWorks";
import { MarketingFooter } from "../components/marketing/MarketingFooter";
import { MotionSection } from "../components/marketing/MotionSection";
import { TrustStrip } from "../components/marketing/TrustStrip";
import { BRAND_NAME } from "../lib/brand";

/* ─── Inline mockups (pure CSS) ───────────────────────────────────── */

function PhoneAppMockup(): JSX.Element {
  return (
    <div className="relative mx-auto w-52 select-none sm:w-60" aria-hidden>
      <div className="absolute inset-0 -m-8 rounded-full bg-emerald-400/10 blur-3xl" />
      <div className="relative rounded-[2.8rem] border-[3px] border-slate-700/90 bg-slate-900 shadow-2xl shadow-slate-900/60">
        <div className="mx-auto mt-3 h-6 w-20 rounded-full bg-slate-800" />
        <div className="overflow-hidden rounded-b-[2.5rem] bg-gradient-to-b from-[#0d2b24] to-[#0a2020] px-3.5 pb-5 pt-3">
          <div className="mb-3 flex justify-between text-[8px] text-white/40">
            <span>9:41</span>
            <span className="tracking-widest">●●●</span>
          </div>
          <div className="mb-3 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-[11px] font-semibold text-white/90">Dr. Sharma's Clinic</span>
          </div>
          <div className="space-y-2">
            <div className="rounded-xl bg-white/10 p-2.5 backdrop-blur-sm">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[9px] font-medium text-emerald-300">8:00 AM · Medicine</span>
                <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[7px] font-bold text-emerald-300">Due</span>
              </div>
              <p className="text-[11px] font-semibold text-white">Arnica 30 · 4 pills</p>
              <p className="mt-0.5 text-[9px] text-white/50">Before breakfast · Empty stomach</p>
            </div>
            <div className="rounded-xl bg-white/[0.07] p-2.5">
              <span className="text-[9px] font-medium text-amber-300">Today's diet</span>
              <p className="mt-0.5 text-[11px] font-medium text-white">Avoid sour & spicy foods</p>
              <p className="text-[9px] text-white/40">Set by your doctor</p>
            </div>
            <div className="rounded-xl bg-white/[0.07] p-2.5">
              <span className="text-[9px] font-medium text-sky-300">Lifestyle</span>
              <p className="mt-0.5 text-[11px] font-medium text-white">Morning walk · 30 min</p>
            </div>
            <div className="flex items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-900/30 px-2.5 py-2">
              <CalendarCheck className="h-3 w-3 shrink-0 text-emerald-400" strokeWidth={2} />
              <div>
                <p className="text-[9px] font-semibold text-emerald-300">Follow-up</p>
                <p className="text-[9px] text-white/60">15 Jan · Dr. Sharma</p>
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-center">
            <div className="h-1 w-12 rounded-full bg-white/20" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ConsultationMockup(): JSX.Element {
  const steps = [
    { label: "Patient overview", done: true },
    { label: "Clinical history", done: true },
    { label: "AI Notetaker", active: true },
    { label: "Prescription draft", done: false },
    { label: "Advice & follow-up", done: false }
  ];
  return (
    <div className="relative mx-auto max-w-xs select-none" aria-hidden>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/8">
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Consultation</p>
            <p className="text-sm font-semibold text-slate-800">Priya Mehta</p>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-hs-primary/10 px-2 py-1 text-[10px] font-bold text-hs-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-hs-primary" />
            In progress
          </span>
        </div>
        <div className="space-y-1.5">
          {steps.map((s) => (
            <div
              key={s.label}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[11px] font-medium transition ${
                s.active
                  ? "bg-hs-primary text-white shadow-sm"
                  : s.done
                  ? "bg-slate-50 text-slate-400 line-through"
                  : "text-slate-400"
              }`}
            >
              {s.done ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-slate-300" strokeWidth={2} />
              ) : s.active ? (
                <Sparkles className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
              ) : (
                <span className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-slate-200" />
              )}
              {s.label}
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-lg border border-sky-100 bg-sky-50/60 px-3 py-2">
          <div className="mb-1.5 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
            <p className="text-[10px] font-semibold text-sky-600">AI Notetaker · Recording</p>
          </div>
          <div className="flex items-end gap-0.5">
            {[3, 5, 4, 6, 3, 5, 4, 3, 6, 4, 5, 3].map((h, i) => (
              <div
                key={i}
                className="w-1 rounded-full bg-sky-400/70"
                style={{ height: `${h * 3}px` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PrescriptionMockup(): JSX.Element {
  return (
    <div className="relative mx-auto max-w-xs select-none" aria-hidden>
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xl shadow-slate-900/8">
        <div className="mb-3 border-b border-slate-100 pb-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-heading text-sm font-bold text-slate-900">Dr. R. Sharma</p>
              <p className="text-[10px] text-slate-400">Reg. No. MCI-12345 · BHMS</p>
              <p className="text-[10px] text-slate-400">Sharma Homeopathy Clinic, Pune</p>
            </div>
            <div className="rounded-lg bg-hs-primary/10 p-2">
              <p className="font-heading text-xs font-bold text-hs-primary">Rx</p>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
            <span>Patient: Priya Mehta, 34F</span>
            <span>15 Jan 2026</span>
          </div>
        </div>
        <div className="space-y-2">
          {[
            { name: "Arnica Montana", potency: "30C", dose: "4 pills · 3× daily · 7 days" },
            { name: "Bryonia Alba", potency: "200C", dose: "2 pills · Morning · 5 days" }
          ].map((r) => (
            <div key={r.name} className="rounded-lg bg-slate-50 px-2.5 py-2">
              <p className="text-[11px] font-semibold text-slate-800">
                {r.name} <span className="font-normal text-hs-primary">{r.potency}</span>
              </p>
              <p className="text-[10px] text-slate-400">{r.dose}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── JSON-LD structured data ─────────────────────────────────────── */

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://app.glowhomeo.com").replace(/\/$/, "");
const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: BRAND_NAME,
      applicationCategory: "HealthApplication",
      operatingSystem: "Web, iOS, Android",
      description:
        "Clinic software for homeopathy doctors: step-by-step consultations, AI-assisted notes, professional prescriptions, online visits, and a patient app under your clinic name.",
      url: SITE_URL,
      offers: { "@type": "Offer", priceCurrency: "INR", price: "1499" }
    },
    {
      "@type": "MedicalBusiness",
      name: BRAND_NAME,
      description:
        "Clinic software for homeopathy practices in India and beyond, for in-clinic and online consultations.",
      url: SITE_URL,
      medicalSpecialty: "Alternative Medicine"
    }
  ]
};

/* ─── Page ────────────────────────────────────────────────────────── */

export default function LandingPage(): JSX.Element {
  return (
    <div className="bg-white text-slate-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
      />
      <LandingHeader />

      <main id="main-content" className="relative">
        {/* ── Hero ─────────────────────────────────────────────────── */}
        <section
          id="home"
          className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-b from-[#f7faf9] via-white to-white px-5 pb-20 pt-14 sm:px-6 sm:pb-24 sm:pt-20 md:px-10 md:pb-28 md:pt-24"
        >
          <div
            className="pointer-events-none absolute left-1/2 top-0 h-[28rem] w-[60rem] -translate-x-1/2 -translate-y-1/3 rounded-full opacity-50"
            style={{ background: "radial-gradient(ellipse, rgb(14 124 102 / 0.14) 0%, transparent 65%)" }}
            aria-hidden
          />

          <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-hs-primary/20 bg-hs-primary/[0.06] px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-hs-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-hs-primary" />
                Built for homeopathy practice
              </div>

              <h1 className="font-heading mt-5 text-balance text-[2.1rem] font-semibold leading-[1.08] tracking-tight text-slate-900 sm:text-[2.6rem] md:text-[3rem]">
                One place to run your homeopathy clinic.
              </h1>

              <p className="mt-5 max-w-xl text-pretty text-[1rem] leading-relaxed text-slate-600 sm:text-[1.05rem]">
                Take the case, write the prescription, and stay in touch with patients after they
                leave. Built with practising homeopaths so it matches how you already work in OPD
                and online.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <Link
                  href="/demo"
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-hs-primary px-6 py-3 text-[0.95rem] font-semibold text-white shadow-[0_10px_30px_-12px_rgba(14,124,102,0.5)] transition-colors hover:bg-hs-primary-dark"
                >
                  Book a 20-minute walkthrough
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-[0.95rem] font-semibold text-slate-800 transition-colors hover:border-slate-300"
                >
                  See pricing
                </Link>
              </div>

              <p className="mt-4 text-[0.8rem] text-slate-500">
                No card required for the walkthrough. We onboard each clinic personally.
              </p>
            </div>

            <div className="relative">
              <div className="absolute -inset-6 -z-10 rounded-3xl bg-gradient-to-br from-hs-primary/10 via-transparent to-emerald-100/40 blur-2xl" aria-hidden />
              <div className="relative grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <ConsultationMockup />
                </div>
                <div className="hidden sm:block">
                  <PrescriptionMockup />
                </div>
                <div className="hidden sm:flex sm:justify-center">
                  <PhoneAppMockup />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Trust strip ──────────────────────────────────────────── */}
        <TrustStrip />

        {/* ── How it works ─────────────────────────────────────────── */}
        <HowItWorks />

        {/* ── Feature overview ─────────────────────────────────────── */}
        <MotionSection
          id="features"
          className="scroll-mt-20 bg-white px-5 py-20 sm:px-6 sm:py-24 md:px-10"
        >
          <div className="mx-auto max-w-5xl">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-hs-primary">
                  What's inside
                </p>
                <h2 className="font-heading mt-3 text-balance text-[1.6rem] font-semibold leading-tight tracking-tight text-slate-900 sm:text-[1.85rem]">
                  Everything you need in one patient chart.
                </h2>
              </div>
              <Link
                href="/features"
                className="text-[0.86rem] font-semibold text-hs-primary hover:underline"
              >
                Explore every feature →
              </Link>
            </div>

            <FeatureGrid />
          </div>
        </MotionSection>

        {/* ── Patient app spotlight (dark teal) ────────────────────── */}
        <section className="relative overflow-hidden bg-[#0d2b24] px-5 py-20 sm:px-6 sm:py-24 md:px-10">
          <div className="pointer-events-none absolute left-0 top-0 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute bottom-0 right-0 h-48 w-48 rounded-full bg-teal-400/8 blur-3xl" aria-hidden />

          <div className="relative mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-emerald-400/80">
                Patient care app
              </p>
              <h2 className="font-heading mt-3 text-balance text-[1.65rem] font-semibold leading-tight tracking-tight text-white sm:text-[2rem]">
                Care continues after the patient leaves your clinic.
              </h2>
              <p className="mt-4 text-[0.93rem] leading-relaxed text-slate-300/80">
                When a patient goes home, their treatment should not stop. Your clinic&apos;s patient
                app keeps them on the plan you set: medicines, diet, lifestyle, and follow-up dates.
              </p>

              <ul className="mt-6 space-y-3">
                {[
                  { icon: Bell, text: "Medicine reminders at the exact times you prescribe" },
                  { icon: CheckCircle2, text: "Diet & lifestyle guidance from your case notes" },
                  { icon: ClipboardList, text: "Doctor-assigned todos tracked between visits" },
                  { icon: CalendarCheck, text: "Follow-up dates and full case history in their pocket" }
                ].map(({ icon: Icon, text }) => (
                  <li
                    key={text}
                    className="flex items-start gap-3 text-[0.9rem] leading-relaxed text-slate-300/90"
                  >
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                      <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                    </span>
                    {text}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex justify-center lg:justify-end">
              <PhoneAppMockup />
            </div>
          </div>
        </section>

        {/* ── AI notetaker spotlight ───────────────────────────────── */}
        <MotionSection
          id="ai-notetaker"
          className="bg-white px-5 py-20 sm:px-6 sm:py-24 md:px-10"
        >
          <div className="mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="order-2 flex justify-center lg:order-1">
              <ConsultationMockup />
            </div>
            <div className="order-1 lg:order-2">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-hs-primary">
                AI notetaker
              </p>
              <h2 className="font-heading mt-3 text-balance text-[1.6rem] font-semibold leading-tight tracking-tight text-slate-900 sm:text-[1.85rem]">
                AI takes the notes. You run the consultation.
              </h2>
              <p className="mt-4 text-[0.93rem] leading-relaxed text-slate-500">
                The AI notetaker listens while you consult. It drafts chief complaints, modalities,
                emotional and physical symptoms in the homeopathic format you already use. Nothing is
                saved until you approve it.
              </p>
              <ul className="mt-5 space-y-2.5 text-[0.88rem] text-slate-600">
                {[
                  "Works in the clinic and on video calls",
                  "Output matches your usual case structure",
                  "You edit, approve, or discard. It never saves on its own"
                ].map((t) => (
                  <li key={t} className="flex items-center gap-2.5">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-hs-primary" aria-hidden />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </MotionSection>

        {/* ── Prescription spotlight ───────────────────────────────── */}
        <MotionSection className="bg-slate-50/60 px-5 py-20 sm:px-6 sm:py-24 md:px-10">
          <div className="mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-hs-primary">
                Prescriptions
              </p>
              <h2 className="font-heading mt-3 text-balance text-[1.6rem] font-semibold leading-tight tracking-tight text-slate-900 sm:text-[1.85rem]">
                Professional prescriptions generated and sent in seconds.
              </h2>
              <p className="mt-4 text-[0.93rem] leading-relaxed text-slate-500">
                Stop typing prescriptions into Word at night. {BRAND_NAME} makes a clean,
                print-ready PDF with your clinic details, registration number, and signature, then
                sends it to the patient app, WhatsApp, or email.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Doctor version", desc: "Full clinical detail for your file" },
                  { label: "Patient version", desc: "Clean instructions for the patient" },
                  { label: "Send instantly", desc: "App, WhatsApp, email, or print" }
                ].map((c) => (
                  <div
                    key={c.label}
                    className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-[0_1px_0_rgba(15,23,42,0.04)]"
                  >
                    <p className="text-[0.85rem] font-semibold text-slate-800">{c.label}</p>
                    <p className="mt-0.5 text-[0.78rem] text-slate-500">{c.desc}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-center">
              <PrescriptionMockup />
            </div>
          </div>
        </MotionSection>

        {/* ── Built for every clinic ───────────────────────────────── */}
        <MotionSection className="bg-white px-5 py-20 sm:px-6 sm:py-24 md:px-10">
          <div className="mx-auto max-w-5xl">
            <div className="max-w-2xl">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-hs-primary">
                Built for every clinic
              </p>
              <h2 className="font-heading mt-3 text-balance text-[1.6rem] font-semibold leading-tight tracking-tight text-slate-900 sm:text-[1.85rem]">
                Works the way your team is set up.
              </h2>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                {
                  Icon: Stethoscope,
                  title: "Solo practitioner",
                  body: "Run the day from one screen: patient list, consultations, and prescriptions without jumping between apps."
                },
                {
                  Icon: Smartphone,
                  title: "Clinic with staff",
                  body: "Your receptionist books appointments and registers patients. You see only your cases. Access stays under your control."
                },
                {
                  Icon: Sparkles,
                  title: "Multi-doctor setup",
                  body: "Each doctor sees their own patients. The clinic owner can see the full picture when needed."
                }
              ].map(({ Icon, title, body }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_0_rgba(15,23,42,0.04)] transition-colors hover:border-hs-primary/30"
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-hs-primary/10 text-hs-primary">
                    <Icon className="h-5 w-5" strokeWidth={1.6} aria-hidden />
                  </span>
                  <h3 className="font-heading mt-4 text-[0.98rem] font-semibold text-slate-900">
                    {title}
                  </h3>
                  <p className="mt-2 text-[0.85rem] leading-relaxed text-slate-500">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </MotionSection>

        {/* ── Guided trial ─────────────────────────────────────────── */}
        <GuidedTrialSection />

        {/* ── FAQ ──────────────────────────────────────────────────── */}
        <FAQSection />

        {/* ── Final CTA ────────────────────────────────────────────── */}
        <section
          id="get-started"
          className="scroll-mt-20 border-t border-slate-100 bg-gradient-to-b from-white to-slate-50/80 px-5 py-20 sm:px-6 sm:py-24 md:px-10"
        >
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-hs-primary">
              Ready when you are
            </p>
            <h2 className="font-heading mt-3 text-balance text-[1.75rem] font-semibold leading-tight tracking-tight text-slate-900 sm:text-[2.1rem]">
              See {BRAND_NAME} on your clinic's caseload.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[0.95rem] leading-relaxed text-slate-500">
              A 20-minute walkthrough is the fastest way to see if it fits. We show real workflows
              on cases like yours, not a slide deck.
            </p>

            <div className="mt-10 flex justify-center">
              <ClinicalCTAGroup className="w-full justify-center" size="hero" />
            </div>
          </div>
        </section>

        <MarketingFooter />
      </main>
    </div>
  );
}

import {
  Bell,
  Building2,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  FileText,
  type LucideIcon,
  Package,
  Shield,
  Smartphone,
  Sparkles,
  Stethoscope,
  TrendingUp,
  Users
} from "lucide-react";
import Link from "next/link";
import { CTAButtons } from "../components/CTAButtons";
import { LandingHeader } from "../components/LandingHeader";
import { LeadForm } from "../components/LeadForm";
import { FAQSection } from "../components/marketing/FAQSection";
import { FeatureGrid } from "../components/marketing/FeatureGrid";
import { MotionSection } from "../components/marketing/MotionSection";
import { BRAND_NAME, CONTACT_EMAIL, CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL } from "../lib/brand";

/* ─── Data ─────────────────────────────────────────────────────────── */

const problems = [
  { icon: ClipboardList, label: "Paper registers", sub: "Patient records split across files" },
  { icon: FileText, label: "Word / print prescriptions", sub: "Typed, printed, and lost" },
  { icon: Package, label: "Inventory in your head", sub: "No tracking of remedy stock" },
  { icon: Smartphone, label: "No patient follow-up app", sub: "Care stops when they leave" },
  { icon: TrendingUp, label: "Marketing done manually", sub: "Personal accounts, no clinic brand" }
] as const;

const teamCards: { Icon: LucideIcon; title: string; body: string }[] = [
  {
    Icon: Users,
    title: "Solo practitioner",
    body: "Run everything from one screen. From the morning's case list to the last prescription of the day — no switching between tools."
  },
  {
    Icon: Building2,
    title: "Clinic with staff",
    body: "Your receptionist handles appointments and registration. You handle the case. Records stay private, access stays controlled."
  },
  {
    Icon: Shield,
    title: "Multi-doctor setup",
    body: "Each doctor sees their own patients. Cases, notes, and prescriptions are scoped per doctor — with clinic-level visibility where you need it."
  }
];

const trustPills: { label: string; icon: LucideIcon }[] = [
  { label: "AI-assisted consultation", icon: Sparkles },
  { label: "Patient care app", icon: Smartphone },
  { label: "Professional prescriptions", icon: FileText },
  { label: "Remedy inventory", icon: Package },
  { label: "In-clinic & online", icon: Stethoscope },
  { label: "Team-ready", icon: Users }
];

/* ─── Visual mockups (CSS-only, no screenshots needed) ─────────────── */

function PhoneAppMockup(): JSX.Element {
  return (
    <div className="animate-ms-float relative mx-auto w-52 select-none sm:w-60" aria-hidden>
      {/* Glow behind phone */}
      <div className="absolute inset-0 -m-8 rounded-full bg-emerald-400/10 blur-3xl" />
      {/* Phone shell */}
      <div className="relative rounded-[2.8rem] border-[3px] border-slate-700/90 bg-slate-900 shadow-2xl shadow-slate-900/60">
        {/* Notch */}
        <div className="mx-auto mt-3 h-6 w-20 rounded-full bg-slate-800" />
        {/* Screen */}
        <div className="overflow-hidden rounded-b-[2.5rem] bg-gradient-to-b from-[#0d2b24] to-[#0a2020] px-3.5 pb-5 pt-3">
          {/* Status */}
          <div className="mb-3 flex justify-between text-[8px] text-white/40">
            <span>9:41</span>
            <span className="tracking-widest">●●●</span>
          </div>
          {/* App header */}
          <div className="mb-3 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-[11px] font-semibold text-white/90">Dr. Sharma's Clinic</span>
          </div>
          {/* Cards */}
          <div className="space-y-2">
            {/* Medicine reminder */}
            <div className="rounded-xl bg-white/10 p-2.5 backdrop-blur-sm">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[9px] font-medium text-emerald-300">8:00 AM · Medicine</span>
                <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[7px] font-bold text-emerald-300">Due</span>
              </div>
              <p className="text-[11px] font-semibold text-white">Arnica 30 · 4 pills</p>
              <p className="mt-0.5 text-[9px] text-white/50">Before breakfast · Empty stomach</p>
            </div>
            {/* Diet card */}
            <div className="rounded-xl bg-white/[0.07] p-2.5">
              <span className="text-[9px] font-medium text-amber-300">Today's diet</span>
              <p className="mt-0.5 text-[11px] font-medium text-white">Avoid sour & spicy foods</p>
              <p className="text-[9px] text-white/40">Set by your doctor</p>
            </div>
            {/* Lifestyle */}
            <div className="rounded-xl bg-white/[0.07] p-2.5">
              <span className="text-[9px] font-medium text-sky-300">Lifestyle</span>
              <p className="mt-0.5 text-[11px] font-medium text-white">Morning walk · 30 min</p>
            </div>
            {/* Follow-up */}
            <div className="flex items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-900/30 px-2.5 py-2">
              <CalendarCheck className="h-3 w-3 shrink-0 text-emerald-400" strokeWidth={2} />
              <div>
                <p className="text-[9px] font-semibold text-emerald-300">Follow-up</p>
                <p className="text-[9px] text-white/60">15 Jan · Dr. Sharma</p>
              </div>
            </div>
          </div>
          {/* Bottom indicator */}
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
        {/* Header */}
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Consultation</p>
            <p className="text-sm font-semibold text-slate-800">Priya Mehta</p>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-hs-primary/10 px-2 py-1 text-[10px] font-bold text-hs-primary">
            <span className="animate-ms-pulse h-1.5 w-1.5 rounded-full bg-hs-primary" />
            In progress
          </span>
        </div>
        {/* Steps */}
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
        {/* AI waveform indicator */}
        <div className="mt-4 rounded-lg border border-sky-100 bg-sky-50/60 px-3 py-2">
          <div className="mb-1.5 flex items-center gap-1.5">
            <span className="animate-ms-pulse h-1.5 w-1.5 rounded-full bg-sky-500" />
            <p className="text-[10px] font-semibold text-sky-600">AI Notetaker · Recording</p>
          </div>
          <div className="flex items-end gap-0.5">
            {[3, 5, 4, 6, 3, 5, 4, 3, 6, 4, 5, 3].map((h, i) => (
              <div
                key={i}
                className="animate-ms-waveform w-1 rounded-full bg-sky-400/70"
                style={{ height: `${h * 3}px`, animationDelay: `${i * 65}ms` }}
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
        {/* Rx header */}
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
        {/* Remedies */}
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
        {/* Send buttons */}
        <div className="mt-4 flex gap-2">
          <span className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-center text-[10px] font-semibold text-slate-600">
            📄 PDF
          </span>
          <span className="flex-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-center text-[10px] font-semibold text-emerald-700">
            📲 Send to patient
          </span>
          <span className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-center text-[10px] font-semibold text-slate-600">
            🖨 Print
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Wave dividers ─────────────────────────────────────────────────── */

function WaveDown({ from = "fill-white/60" }: { from?: string }): JSX.Element {
  return (
    <div className="relative -mb-px h-12 w-full overflow-hidden sm:h-16" aria-hidden>
      <svg className={`absolute bottom-0 h-full w-full ${from}`} viewBox="0 0 1440 64" preserveAspectRatio="none">
        <path d="M0 32C240 0 480 0 720 18C960 36 1200 56 1440 36V64H0Z" />
        <path opacity="0.35" d="M0 44C300 18 600 12 900 30C1100 44 1300 60 1440 50V64H0Z" />
      </svg>
    </div>
  );
}

function WaveUp({ from = "fill-white" }: { from?: string }): JSX.Element {
  return (
    <div className="relative -mt-px h-12 w-full overflow-hidden sm:h-16" aria-hidden>
      <svg className={`absolute top-0 h-full w-full ${from}`} viewBox="0 0 1440 64" preserveAspectRatio="none">
        <path d="M0 32C240 64 480 64 720 46C960 28 1200 8 1440 28V0H0Z" />
        <path opacity="0.35" d="M0 20C300 46 600 52 900 34C1100 20 1300 4 1440 14V0H0Z" />
      </svg>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────── */

export default function LandingPage(): JSX.Element {
  return (
    <div className="marketing-site marketing-page-shell overflow-x-hidden text-slate-900">
      <LandingHeader />

      <main className="relative z-[1]">

        {/* ══ HERO ════════════════════════════════════════════════════ */}
        <section
          id="home"
          className="ms-hero relative overflow-hidden px-5 pb-24 pt-16 sm:px-6 sm:pb-28 sm:pt-20 md:px-10 md:pb-32 md:pt-28"
        >
          <div className="marketing-dots" aria-hidden />
          <div className="marketing-hero-noise" aria-hidden />
          <div
            className="pointer-events-none absolute left-1/2 top-0 h-[30rem] w-[70rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30"
            style={{ background: "radial-gradient(ellipse, rgb(61 141 123 / 0.22) 0%, transparent 65%)" }}
            aria-hidden
          />

          <div className="relative z-10 mx-auto max-w-3xl text-center">
            {/* Eyebrow — delay 0 */}
            <div
              className="animate-marketing-hero mb-6 inline-flex items-center gap-2 rounded-full border border-hs-primary/20 bg-hs-primary/[0.06] px-4 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-hs-primary"
              style={{ animationDelay: "0ms" }}
            >
              <span className="animate-ms-pulse h-1.5 w-1.5 rounded-full bg-hs-primary" />
              Built for homeopathy doctors
            </div>

            {/* Headline — delay 80ms */}
            <h1
              className="animate-marketing-hero ms-h1 ms-h1-balance mx-auto"
              style={{ animationDelay: "80ms" }}
            >
              The complete practice system for homeopathy doctors
            </h1>

            {/* Sub-headline — delay 220ms */}
            <p
              className="animate-marketing-hero ms-lead mx-auto mt-6 text-center"
              style={{ animationDelay: "220ms" }}
            >
              Structured consultations, AI-assisted notes, professional prescriptions, a patient care app
              your patients actually use, remedy inventory, and clinic growth tools — all in one place,
              shaped by experienced homeopathy practitioners.
            </p>

            {/* CTA buttons — delay 360ms */}
            <div
              className="animate-marketing-hero mx-auto mt-10 flex max-w-md justify-center"
              style={{ animationDelay: "360ms" }}
            >
              <CTAButtons className="justify-center" />
            </div>

            {/* Trust pills — staggered from 480ms */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
              {trustPills.map(({ label, icon: Icon }, idx) => (
                <span
                  key={label}
                  className="animate-marketing-hero marketing-trust-pill"
                  style={{ animationDelay: `${480 + idx * 55}ms` }}
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ══ PROBLEM STRIP ═══════════════════════════════════════════ */}
        <section className="relative border-y border-slate-100 bg-slate-50/60 px-5 py-10 sm:px-6 md:px-10">
          <div className="mx-auto max-w-5xl">
            <p className="mb-6 text-center text-[0.82rem] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Most homeopathy doctors manage their practice across 5+ disconnected tools
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {problems.map(({ icon: Icon, label, sub }, idx) => (
                <div
                  key={label}
                  className="animate-marketing-hero flex flex-col items-center gap-1.5 rounded-2xl border border-slate-200/70 bg-white px-4 py-4 text-center shadow-sm transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md"
                  style={{ animationDelay: `${idx * 70}ms` }}
                >
                  <Icon className="h-5 w-5 text-slate-400" strokeWidth={1.5} />
                  <p className="text-[0.8rem] font-semibold text-slate-700">{label}</p>
                  <p className="text-[0.72rem] leading-snug text-slate-400">{sub}</p>
                </div>
              ))}
            </div>
            <p className="mt-8 text-center text-[0.92rem] font-medium text-slate-600">
              {BRAND_NAME} connects all of this into one system —{" "}
              <span className="font-semibold text-hs-primary">so you spend time treating, not managing.</span>
            </p>
          </div>
        </section>

        <WaveDown from="fill-white/60" />

        {/* ══ FEATURE OVERVIEW BENTO ══════════════════════════════════ */}
        <MotionSection
          id="features"
          className="scroll-mt-20 ms-section-light px-5 py-16 sm:px-6 sm:py-20 md:px-10 md:py-24"
        >
          <div className="mx-auto max-w-5xl">
            <p className="ms-eyebrow">What's inside</p>
            <h2 className="ms-h2 mt-2">Six parts. One connected system.</h2>
            <p className="mt-3 max-w-2xl text-[0.93rem] leading-relaxed text-slate-500">
              Everything a homeopathy doctor needs — linked to the same patient, the same case, and
              the same line of treatment.
            </p>

            <FeatureGrid />
          </div>
        </MotionSection>

        {/* ══ PATIENT APP SPOTLIGHT — dark teal ═══════════════════════ */}
        <WaveUp from="fill-[#0d2b24]" />
        <section className="relative overflow-hidden bg-[#0d2b24] px-5 py-16 sm:px-6 sm:py-20 md:px-10 md:py-24">
          {/* Ambient glows */}
          <div className="pointer-events-none absolute left-0 top-0 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute bottom-0 right-0 h-48 w-48 rounded-full bg-teal-400/8 blur-3xl" aria-hidden />

          <div className="relative mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Text */}
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-emerald-400/80">
                Patient care app
              </p>
              <h2 className="ms-h2 ms-h2-on-dark mt-3 max-w-none">
                Your patients stay on track — long after they leave your clinic
              </h2>
              <p className="mt-4 text-[0.93rem] leading-relaxed text-slate-300/80">
                When a patient leaves your clinic, their care shouldn't stop. The patient app, shaped
                by experienced homeopathy doctors, keeps them on the treatment plan you designed.
              </p>

              <ul className="mt-6 space-y-3">
                {[
                  { icon: Bell, text: "Medicine reminders at the exact times you prescribe — morning, afternoon, evening, night" },
                  { icon: CheckCircle2, text: "Diet and lifestyle guidance from your case notes, delivered daily" },
                  { icon: ClipboardList, text: "Doctor-assigned todos between visits — tracked, checked off, reported back" },
                  { icon: CalendarCheck, text: "Follow-up dates, consultation history, and records — all in their pocket" }
                ].map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-start gap-3 text-[0.88rem] leading-relaxed text-slate-300/90">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                      <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                    </span>
                    {text}
                  </li>
                ))}
              </ul>

              <p className="mt-6 text-[0.82rem] text-slate-400">
                The app is designed under the guidance of experienced homeopathy doctors — not a generic health app adapted for homeopathy.
              </p>
            </div>

            {/* Phone mockup */}
            <div className="flex justify-center lg:justify-end">
              <PhoneAppMockup />
            </div>
          </div>
        </section>
        <WaveDown from="fill-[#0d2b24]" />

        {/* ══ AI CONSULTATION SPOTLIGHT ════════════════════════════════ */}
        <MotionSection
          id="consultation"
          className="scroll-mt-20 ms-section-light px-5 py-16 sm:px-6 sm:py-20 md:px-10 md:py-24"
        >
          <div className="mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Mockup */}
            <div className="order-2 flex justify-center lg:order-1">
              <ConsultationMockup />
            </div>
            {/* Text */}
            <div className="order-1 lg:order-2">
              <p className="ms-eyebrow">AI notetaker</p>
              <h2 className="ms-h2 mt-2 max-w-none">
                AI takes the notes. You run the consultation.
              </h2>
              <p className="mt-4 text-[0.93rem] leading-relaxed text-slate-500">
                The AI notetaker listens while you take the case. It writes up structured homeopathic
                notes — chief complaints, modalities, emotional state, physical symptoms — and waits
                for your approval before saving anything.
              </p>
              <ul className="mt-5 space-y-2.5 text-[0.88rem] text-slate-600">
                {[
                  "Live transcription — works in-clinic and for online calls",
                  "Structured output matched to homeopathic case format",
                  "You edit, approve, or discard — nothing auto-saves",
                  "Saves 10–15 minutes per patient on documentation"
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

        {/* ══ PRESCRIPTION SPOTLIGHT ═══════════════════════════════════ */}
        <MotionSection className="ms-section-form px-5 py-16 sm:px-6 sm:py-20 md:px-10 md:py-24">
          <div className="mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Text */}
            <div>
              <p className="ms-eyebrow">Prescriptions</p>
              <h2 className="ms-h2 mt-2 max-w-none">
                Professional prescriptions — generated and sent in seconds
              </h2>
              <p className="mt-4 text-[0.93rem] leading-relaxed text-slate-500">
                Stop typing prescriptions into Word and printing them at night. {BRAND_NAME} generates
                a clean, professional prescription PDF with your clinic details, registration number,
                and digital signature — automatically.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Doctor version", desc: "Full clinical detail for your file" },
                  { label: "Patient version", desc: "Clean instructions for the patient" },
                  { label: "Send instantly", desc: "Email, patient app, or print" }
                ].map((c, idx) => (
                  <div
                    key={c.label}
                    className="animate-marketing-hero rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-hs-primary/20 hover:shadow-md"
                    style={{ animationDelay: `${idx * 80}ms` }}
                  >
                    <p className="text-[0.82rem] font-semibold text-slate-800">{c.label}</p>
                    <p className="mt-0.5 text-[0.76rem] text-slate-500">{c.desc}</p>
                  </div>
                ))}
              </div>
            </div>
            {/* Mockup */}
            <div className="flex justify-center">
              <PrescriptionMockup />
            </div>
          </div>
        </MotionSection>

        <WaveDown from="fill-slate-50" />

        {/* ══ FOR YOUR TEAM ════════════════════════════════════════════ */}
        <MotionSection className="bg-slate-50/60 px-5 py-16 sm:px-6 sm:py-20 md:px-10 md:py-24">
          <div className="mx-auto max-w-5xl">
            <p className="ms-eyebrow">Flexible for every clinic</p>
            <h2 className="ms-h2 mt-2">Works the way your team is set up</h2>
            <div className="mt-10 grid gap-5 sm:grid-cols-3">
              {teamCards.map((t, idx) => {
                const Icon = t.Icon;
                return (
                  <div
                    key={t.title}
                    className="animate-marketing-hero group rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-hs-primary/25 hover:shadow-[0_8px_24px_-8px_rgba(61,141,123,0.14)]"
                    style={{ animationDelay: `${idx * 90}ms` }}
                  >
                    <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-hs-primary/[0.07] text-hs-primary ring-1 ring-hs-primary/15 transition-transform duration-300 group-hover:scale-110">
                      <Icon className="h-5 w-5" strokeWidth={1.5} />
                    </div>
                    <h3 className="font-heading text-[0.93rem] font-semibold text-slate-900">{t.title}</h3>
                    <p className="mt-2 text-[0.85rem] leading-relaxed text-slate-500">{t.body}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </MotionSection>

        <WaveUp from="fill-slate-50/60" />

        {/* ══ FAQ ══════════════════════════════════════════════════════ */}
        <FAQSection />

        {/* ══ BOOK DEMO ════════════════════════════════════════════════ */}
        <MotionSection
          id="book-demo"
          className="scroll-mt-20 ms-section-form relative overflow-hidden px-5 py-16 sm:px-6 md:px-10 md:py-24"
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgb(61 141 123 / 0.07) 0%, transparent 65%)" }}
            aria-hidden
          />
          <div className="relative mx-auto max-w-lg">
            <p className="ms-eyebrow text-center">Get started</p>
            <h2 className="ms-h2 mt-2 max-w-none text-center">Book a walkthrough</h2>
            <p className="mt-2 text-center text-[0.9rem] text-slate-500">
              Tell us about your clinic — we will set it up personally and follow up shortly.
            </p>
            <div className="mt-8 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-lg shadow-slate-900/6 ring-1 ring-hs-primary/8">
              <LeadForm idPrefix="page" />
            </div>
          </div>
        </MotionSection>

        {/* ══ DARK CTA ═════════════════════════════════════════════════ */}
        <MotionSection className="marketing-cta-dark px-5 py-16 sm:px-6 sm:py-20 md:px-10 md:py-28">
          <div className="marketing-cta-grid-overlay" aria-hidden />
          <div className="relative z-10 mx-auto max-w-2xl text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
              For your practice
            </p>
            <h2 className="ms-h2 ms-h2-on-dark mx-auto mt-3 max-w-xl text-center font-semibold text-white">
              Bring your whole practice into one system
            </h2>
            <p className="mx-auto mt-4 max-w-md text-[0.92rem] leading-relaxed text-slate-300/80">
              Request early access and we will set up your clinic personally. Your records, your
              patients, your growth — in one place built for homeopathy.
            </p>
            <div className="mx-auto mt-10 max-w-sm">
              <CTAButtons className="justify-center" variant="dark" />
            </div>
          </div>
        </MotionSection>

        {/* ══ FOOTER ═══════════════════════════════════════════════════ */}
        <footer className="footer-site" role="contentinfo">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 md:px-10 md:py-16">
            {/* Top grid
                Mobile : Brand full-width, then 3 link cols side-by-side
                Desktop: 5-col grid — Brand(2) + ForDoctors + Product + Legal */}
            <div className="grid gap-8 lg:grid-cols-5 lg:gap-10">
              {/* Brand — full width on mobile, 2 of 5 cols on lg */}
              <div className="lg:col-span-2">
                <p className="footer-site-brand font-heading text-base font-bold">{BRAND_NAME}</p>
                <p className="mt-2 max-w-sm text-[0.8rem] leading-relaxed text-slate-500">
                  The complete practice system for homeopathy doctors — shaped by practitioners who
                  have seen every workflow gap first-hand.
                </p>
                <div className="mt-4 flex flex-col gap-1 text-[0.78rem]">
                  <a href={`mailto:${CONTACT_EMAIL}`} className="footer-site-link hover:underline">
                    {CONTACT_EMAIL}
                  </a>
                  <a href={`tel:${CONTACT_PHONE_TEL}`} className="footer-site-link">
                    {CONTACT_PHONE_DISPLAY}
                  </a>
                </div>
              </div>

              {/* Link columns — 3-col on mobile/tablet, dissolve into parent grid on lg */}
              <div className="grid grid-cols-3 gap-4 sm:gap-6 lg:contents">
                {/* For Doctors */}
                <div>
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 sm:text-[11px]">For Doctors</p>
                  <ul className="space-y-2 text-[0.76rem] sm:text-[0.82rem]">
                    {[
                      { label: "Why HomeoAssist", href: "#features" },
                      { label: "Patient app", href: "#features" },
                      { label: "AI consultation", href: "#consultation" },
                      { label: "Early access", href: "#book-demo" },
                      { label: "Guidance", href: "#" }
                    ].map((l) => (
                      <li key={l.label}>
                        <a href={l.href} className="footer-site-link transition-colors hover:text-white">
                          {l.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Product */}
                <div>
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 sm:text-[11px]">Product</p>
                  <ul className="space-y-2 text-[0.76rem] sm:text-[0.82rem]">
                    {[
                      { label: "Features", href: "#features" },
                      { label: "How it works", href: "#consultation" },
                      { label: "Book demo", href: "#book-demo" },
                      { label: "FAQ", href: "#faq" },
                      { label: "Log in", href: "/login" }
                    ].map((l) => (
                      <li key={l.label}>
                        <a href={l.href} className="footer-site-link transition-colors hover:text-white">
                          {l.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Legal */}
                <div>
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 sm:text-[11px]">Legal</p>
                  <ul className="space-y-2 text-[0.76rem] sm:text-[0.82rem]">
                    {[
                      { label: "Privacy", href: "#" },
                      { label: "Terms", href: "#" },
                      { label: "Cookies", href: "#" },
                      { label: "Refunds", href: "#" }
                    ].map((l) => (
                      <li key={l.label}>
                        <a href={l.href} className="footer-site-link transition-colors hover:text-white">
                          {l.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Bottom bar */}
            <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/[0.06] pt-8 text-[0.75rem] text-slate-600 sm:flex-row">
              <p>© {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.</p>
              <div className="flex items-center gap-5">
                <Link href="/login" className="transition-colors hover:text-slate-300">Log in</Link>
                <a href="#book-demo" className="font-semibold text-hs-primary transition-colors hover:text-hs-primary/80">
                  Request access →
                </a>
              </div>
            </div>
          </div>
        </footer>

      </main>
    </div>
  );
}

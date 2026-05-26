import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertCircle,
  Database,
  EyeOff,
  Fingerprint,
  KeyRound,
  Lock,
  ServerCog,
  Shield,
  UserCog
} from "lucide-react";
import { LandingHeader } from "../../components/LandingHeader";
import { MarketingFooter } from "../../components/marketing/MarketingFooter";
import { BRAND_NAME, CONTACT_EMAIL } from "../../lib/brand";

export const metadata: Metadata = {
  title: `Security & privacy | ${BRAND_NAME}`,
  description:
    "How GlowHomeo Assist stores, protects, and isolates your clinic and patient data. Encryption, access control, and audit logging built in."
};

type Pillar = {
  Icon: typeof Lock;
  title: string;
  body: string;
};

const PILLARS: Pillar[] = [
  {
    Icon: Lock,
    title: "Encryption everywhere",
    body: "TLS 1.2+ in transit and AES-256 at rest. Backups inherit the same encryption. No clear-text patient data leaves your clinic's tenant."
  },
  {
    Icon: KeyRound,
    title: "Role-based access",
    body: "Doctors, receptionists, and admins see only what they should. Records stay scoped per doctor unless a clinic admin grants visibility."
  },
  {
    Icon: Fingerprint,
    title: "Audit trail",
    body: "Every record access, edit, prescription, and admin action is logged with time and user. Logs can be exported for compliance reviews."
  },
  {
    Icon: ServerCog,
    title: "Tenant isolation",
    body: "Each clinic is a fully isolated tenant. Data and operational logs are scoped so no information ever crosses clinics."
  },
  {
    Icon: EyeOff,
    title: "Minimal data exposure",
    body: "Role-based access and audit logging limit who can view or change patient records. Exports and deletion follow documented schedules."
  },
  {
    Icon: Database,
    title: "Your data, on demand",
    body: "Patient records and prescriptions can be exported in standard formats at any time. We don't lock your clinic in."
  },
  {
    Icon: UserCog,
    title: "Granular roles",
    body: "Built-in roles for Solo Doctor, Multi-Doctor Clinic, Receptionist, and Admin. Permissions follow the principle of least privilege."
  },
  {
    Icon: AlertCircle,
    title: "Incident response",
    body: "If something does go wrong, we tell you. Customers are notified of any incident with an impact assessment within 72 hours."
  }
];

export default function SecurityPage(): JSX.Element {
  return (
    <div className="bg-white text-slate-900">
      <LandingHeader />

      <main id="main-content" className="relative">
        {/* ── Hero ───────────────────────────────────────────────── */}
        <section className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-b from-[#f7faf9] via-white to-white px-5 pb-12 pt-14 sm:px-6 sm:pt-20 md:px-10 md:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-hs-primary/10 text-hs-primary">
              <Shield className="h-6 w-6" strokeWidth={1.8} aria-hidden />
            </span>
            <p className="mt-5 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-hs-primary">
              Security & privacy
            </p>
            <h1 className="font-heading mt-3 text-balance text-[2rem] font-semibold leading-tight tracking-tight text-slate-900 sm:text-[2.4rem]">
              Patient trust starts with how we store the record.
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-[0.98rem] leading-relaxed text-slate-500">
              Your patient data is a clinical responsibility, not only a technical one. Here is
              how {BRAND_NAME} protects it.
            </p>
          </div>
        </section>

        {/* ── Pillars ───────────────────────────────────────────── */}
        <section className="bg-white px-5 py-16 sm:px-6 sm:py-20 md:px-10 md:py-24">
          <div className="mx-auto max-w-5xl">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {PILLARS.map(({ Icon, title, body }) => (
                <article
                  key={title}
                  className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_0_rgba(15,23,42,0.04)]"
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-hs-primary/10 text-hs-primary">
                    <Icon className="h-4.5 w-4.5" strokeWidth={2} aria-hidden />
                  </span>
                  <h2 className="font-heading mt-4 text-[0.95rem] font-semibold text-slate-900">
                    {title}
                  </h2>
                  <p className="mt-2 text-[0.83rem] leading-relaxed text-slate-500">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── Commitments ───────────────────────────────────────── */}
        <section className="border-t border-slate-100 bg-slate-50/60 px-5 py-20 sm:px-6 sm:py-24 md:px-10">
          <div className="mx-auto max-w-3xl">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-hs-primary">
              Our commitments
            </p>
            <h2 className="font-heading mt-3 text-balance text-[1.6rem] font-semibold leading-tight tracking-tight text-slate-900 sm:text-[1.85rem]">
              What we promise, in plain language.
            </h2>

            <ul className="mt-8 space-y-5 text-[0.93rem] leading-relaxed text-slate-700">
              {[
                <>
                  We will <span className="font-semibold">never share, sell, or rent</span> your
                  clinic&apos;s patient data to advertisers, insurers, or any third party.
                </>,
                <>
                  We will <span className="font-semibold">never use your clinical data</span> to
                  train third-party models or sell insights derived from patient records.
                </>,
                <>
                  We give you a <span className="font-semibold">full export</span> of your patient
                  records and prescriptions on request, in standard formats.
                </>,
                <>
                  We <span className="font-semibold">delete your data</span> on a documented
                  schedule when you leave, and confirm that deletion in writing.
                </>,
                <>
                  We <span className="font-semibold">tell you what happened</span> if there is a
                  security incident, including the impact and the fix.
                </>
              ].map((line, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-hs-primary" aria-hidden />
                  <span>{line}</span>
                </li>
              ))}
            </ul>

            <div className="mt-12 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
              <p className="font-heading text-[0.95rem] font-semibold text-slate-900">
                Need a security review for your clinic?
              </p>
              <p className="mt-2 text-[0.88rem] leading-relaxed text-slate-500">
                Larger practices and clinic groups can request a written security questionnaire,
                data-processing addendum, and architecture overview.
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <a
                  href={`mailto:${CONTACT_EMAIL}?subject=Security%20questionnaire`}
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-hs-primary px-5 py-2.5 text-[0.88rem] font-semibold text-white transition-colors hover:bg-hs-primary-dark"
                >
                  Email security@{CONTACT_EMAIL.split("@")[1]}
                </a>
                <Link
                  href="/privacy"
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-[0.88rem] font-semibold text-slate-800 transition-colors hover:border-slate-300"
                >
                  Read the privacy policy
                </Link>
              </div>
            </div>
          </div>
        </section>

        <MarketingFooter />
      </main>
    </div>
  );
}

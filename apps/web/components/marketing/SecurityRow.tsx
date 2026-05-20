import Link from "next/link";
import { Fingerprint, KeyRound, Lock, ServerCog } from "lucide-react";

type Pillar = {
  Icon: typeof Lock;
  title: string;
  body: string;
};

const PILLARS: Pillar[] = [
  {
    Icon: Lock,
    title: "Encrypted in transit & at rest",
    body: "All clinic and patient data is encrypted with TLS in transit and AES-256 at rest on managed infrastructure."
  },
  {
    Icon: KeyRound,
    title: "Role-based access",
    body: "Doctors, receptionists, and admins see only what they should. Patient records stay scoped per doctor by default."
  },
  {
    Icon: Fingerprint,
    title: "Audit-ready logs",
    body: "Every record access, edit, and prescription event is timestamped — so you always know what happened, by whom."
  },
  {
    Icon: ServerCog,
    title: "Your data, your clinic",
    body: "We never share, sell, or use your clinic's case data to train external models. Exports are available on request."
  }
];

export function SecurityRow(): JSX.Element {
  return (
    <section
      id="security-row"
      className="bg-white px-5 py-20 sm:px-6 sm:py-24 md:px-10"
    >
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:items-start lg:gap-16">
          <div>
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-hs-primary">
              Security & privacy
            </p>
            <h2 className="font-heading mt-3 text-balance text-[1.6rem] font-semibold leading-tight tracking-tight text-slate-900 sm:text-[1.85rem]">
              Patient trust starts with how we store their record.
            </h2>
            <p className="mt-4 text-[0.93rem] leading-relaxed text-slate-500">
              We treat your clinic's records the way you'd expect a medical system to — locked
              down, access-controlled, and fully owned by you. Nothing is shared across clinics.
            </p>
            <Link
              href="/security"
              className="mt-6 inline-flex items-center gap-1 text-[0.86rem] font-semibold text-hs-primary hover:underline"
            >
              Read the full security overview →
            </Link>
          </div>

          <ul className="grid gap-3 sm:grid-cols-2">
            {PILLARS.map(({ Icon, title, body }) => (
              <li
                key={title}
                className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_0_rgba(15,23,42,0.04)]"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-hs-primary/10 text-hs-primary">
                  <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
                </span>
                <p className="font-heading mt-3 text-[0.92rem] font-semibold text-slate-900">
                  {title}
                </p>
                <p className="mt-1.5 text-[0.82rem] leading-relaxed text-slate-500">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

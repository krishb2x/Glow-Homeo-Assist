import { ShieldCheck, Sparkles, Stethoscope, Users } from "lucide-react";

type Marker = { Icon: typeof ShieldCheck; label: string };

const MARKERS: Marker[] = [
  { Icon: Stethoscope, label: "Built with practising homeopaths" },
  { Icon: Users, label: "Solo, clinic & multi-doctor ready" },
  { Icon: Sparkles, label: "AI assistance you control" },
  { Icon: ShieldCheck, label: "Patient data stays in your clinic" }
];

/**
 * Lightweight credibility row immediately under the hero. Replaces noisy
 * decorative pills with a clean clinical-trust strip.
 */
export function TrustStrip(): JSX.Element {
  return (
    <section
      aria-label="Why doctors choose GlowHomeo Assist"
      className="border-y border-slate-100 bg-white px-5 py-7 sm:px-6 md:px-10"
    >
      <ul className="mx-auto grid max-w-5xl grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
        {MARKERS.map(({ Icon, label }) => (
          <li key={label} className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-hs-primary/10 text-hs-primary">
              <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            </span>
            <p className="text-[0.78rem] font-medium leading-snug text-slate-700 sm:text-[0.82rem]">
              {label}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

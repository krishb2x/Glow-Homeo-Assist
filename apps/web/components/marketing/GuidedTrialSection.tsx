import { Check } from "lucide-react";

const points = [
  {
    title: "Onboarding with your workflow",
    body: "We configure the workspace around how you take cases, prescribe, and follow up — not a generic template."
  },
  {
    title: "Real clinic usage from week one",
    body: "You run live OPD and online visits inside the system while we stay available for questions and refinements."
  },
  {
    title: "Guided setup — not self-serve",
    body: "A structured programme with check-ins so your team is confident before you rely on it for every patient."
  }
] as const;

export function GuidedTrialSection(): JSX.Element {
  return (
    <section
      id="clinical-onboarding"
      className="scroll-mt-20 border-y border-slate-200/80 bg-gradient-to-b from-slate-50/90 via-white to-[rgb(248,250,249)] px-5 py-16 sm:px-6 sm:py-20 md:px-10 md:py-24"
    >
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-hs-primary/90">Clinical onboarding</p>
        <h2 className="font-heading mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[1.75rem] md:text-3xl">
          90-day guided trial
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-[0.95rem] leading-relaxed text-slate-600">
          A premium onboarding experience for serious practices — structured like a clinical quality programme, not a
          self-serve software trial. You work in your real case load with dedicated support until the rhythm of the
          system matches your practice.
        </p>
      </div>

      <ul className="mx-auto mt-12 grid max-w-3xl gap-4 sm:grid-cols-3 sm:gap-5">
        {points.map((item) => (
          <li
            key={item.title}
            className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 text-left shadow-sm ring-1 ring-slate-900/[0.03]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-hs-primary/10 text-hs-primary">
              <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden />
            </span>
            <p className="font-heading mt-3 text-[0.9rem] font-semibold text-slate-900">{item.title}</p>
            <p className="mt-2 text-[0.82rem] leading-relaxed text-slate-600">{item.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

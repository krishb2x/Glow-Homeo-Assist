import { ClipboardCheck, FileSignature, HeartHandshake } from "lucide-react";

type Step = {
  number: string;
  Icon: typeof ClipboardCheck;
  title: string;
  body: string;
};

const STEPS: Step[] = [
  {
    number: "01",
    Icon: ClipboardCheck,
    title: "Take the case",
    body: "Run a structured homeopathic consultation — in-clinic or online. The AI notetaker quietly records and structures every detail. You stay focused on the patient."
  },
  {
    number: "02",
    Icon: FileSignature,
    title: "Approve and prescribe",
    body: "Review the AI draft, edit anything, and generate a professional prescription with your registration number, signature, and clinic details. Nothing is saved until you approve."
  },
  {
    number: "03",
    Icon: HeartHandshake,
    title: "Care continues at home",
    body: "Your patient receives the prescription instantly on the clinic app. Medicine reminders, diet, lifestyle, and follow-up tracking keep them on plan between visits."
  }
];

export function HowItWorks(): JSX.Element {
  return (
    <section
      id="how"
      className="relative scroll-mt-20 border-y border-slate-100 bg-white px-5 py-20 sm:px-6 sm:py-24 md:px-10"
    >
      <div className="mx-auto max-w-5xl">
        <div className="max-w-2xl">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-hs-primary">
            How it works
          </p>
          <h2 className="font-heading mt-3 text-balance text-[1.65rem] font-semibold leading-tight tracking-tight text-slate-900 sm:text-[2rem] md:text-[2.25rem]">
            Three steps from first complaint to continuous care.
          </h2>
          <p className="mt-4 max-w-xl text-[0.95rem] leading-relaxed text-slate-500">
            The system is shaped by experienced homeopathy practitioners — every step mirrors how
            you already work, only faster and without scattered files.
          </p>
        </div>

        <ol className="mt-12 grid gap-4 sm:grid-cols-3 sm:gap-5">
          {STEPS.map(({ number, Icon, title, body }) => (
            <li
              key={number}
              className="relative flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_0_rgba(15,23,42,0.04)] transition-colors hover:border-hs-primary/30"
            >
              <div className="flex items-center justify-between">
                <span className="font-heading text-[0.78rem] font-bold uppercase tracking-[0.16em] text-hs-primary/80">
                  Step {number}
                </span>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-hs-primary/10 text-hs-primary">
                  <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
                </span>
              </div>
              <h3 className="font-heading text-[1.02rem] font-semibold leading-snug text-slate-900">
                {title}
              </h3>
              <p className="text-[0.88rem] leading-relaxed text-slate-500">{body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

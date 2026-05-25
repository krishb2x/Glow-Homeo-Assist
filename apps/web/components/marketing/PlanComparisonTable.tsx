import { Fragment } from "react";
import { Check, Minus } from "lucide-react";
import { PRICING_PLANS } from "../../lib/pricing-plans";
import { cn } from "../../lib/cn";

type Cell = boolean | string;

type ComparisonRow = {
  label: string;
  detail?: string;
  values: [Cell, Cell, Cell]; // solo, clinic, scale
};

type Group = {
  group: string;
  rows: ComparisonRow[];
};

const GROUPS: Group[] = [
  {
    group: "Clinical workflow",
    rows: [
      { label: "Structured 9-step consultation", values: [true, true, true] },
      { label: "AI notetaker (transcription + draft)", values: [true, true, true] },
      { label: "Vitals, examination & labs capture", values: [true, true, true] },
      { label: "In-clinic + online consultations", values: [true, true, true] },
      {
        label: "Recording of online consultations",
        detail: "Secure S3 storage with signed download links",
        values: [false, true, true]
      }
    ]
  },
  {
    group: "Patient communication",
    rows: [
      { label: "Branded patient care app", values: [true, true, true] },
      { label: "WhatsApp + email delivery", values: [true, true, true] },
      { label: "Personalised templates with variables", values: [true, true, true] },
      {
        label: "WhatsApp broadcast (with Meta templates)",
        detail: "Audience segments, scheduling, delivery reports",
        values: [false, true, true]
      },
      { label: "Appointment reminders (24h + 1h)", values: [true, true, true] }
    ]
  },
  {
    group: "Team & operations",
    rows: [
      { label: "Doctor seats", values: ["1", "Up to 3", "Unlimited"] },
      { label: "Receptionist & multi-role access", values: [false, true, true] },
      { label: "Multi-clinic management", values: [false, false, true] },
      { label: "Appointment scheduling", values: [true, true, true] },
      { label: "Remedy inventory tracking", values: [true, true, true] }
    ]
  },
  {
    group: "Reliability & support",
    rows: [
      { label: "Standard email support", values: [true, true, true] },
      { label: "Priority onboarding", values: [false, true, true] },
      { label: "Dedicated success manager", values: [false, false, true] },
      { label: "Custom data migration", values: [false, false, true] },
      { label: "99.9% uptime SLA", values: [false, true, true] }
    ]
  }
];

function CellValue({ value }: { value: Cell }): JSX.Element {
  if (value === true) {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-hs-primary/10 text-hs-primary">
        <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
        <span className="sr-only">Included</span>
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center text-slate-300">
        <Minus className="h-4 w-4" aria-hidden />
        <span className="sr-only">Not included</span>
      </span>
    );
  }
  return <span className="text-[0.85rem] font-semibold text-slate-700">{value}</span>;
}

export function PlanComparisonTable(): JSX.Element {
  return (
    <section className="bg-white px-5 py-16 sm:px-6 sm:py-20 md:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="max-w-2xl">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-hs-primary">
            Compare plans
          </p>
          <h2 className="font-heading mt-3 text-balance text-[1.6rem] font-semibold leading-tight tracking-tight text-slate-900 sm:text-[1.85rem]">
            Side-by-side feature comparison
          </h2>
          <p className="mt-3 text-[0.95rem] leading-relaxed text-slate-500">
            Every plan ships with the full clinical chart, prescription PDFs, and the branded
            patient app. Higher tiers add multi-doctor operations, broadcast messaging, and
            enterprise reliability.
          </p>
        </div>

        <div className="mt-10 overflow-x-auto rounded-2xl border border-slate-200/80 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
          <table className="min-w-[720px] w-full border-collapse text-left">
            <thead className="bg-slate-50/80">
              <tr>
                <th
                  scope="col"
                  className="px-5 py-4 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-slate-500"
                >
                  Feature
                </th>
                {PRICING_PLANS.map((p) => (
                  <th
                    key={p.id}
                    scope="col"
                    className={cn(
                      "px-5 py-4 text-center text-[0.78rem] font-semibold text-slate-700",
                      p.featured && "bg-hs-primary/[0.06] text-hs-primary"
                    )}
                  >
                    <span className="block font-heading text-[0.95rem] text-slate-900">
                      {p.name}
                    </span>
                    <span className="mt-0.5 block text-[0.72rem] font-medium text-slate-500">
                      {p.audience}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {GROUPS.map((g) => (
                <Fragment key={g.group}>
                  <tr>
                    <th
                      colSpan={4}
                      scope="colgroup"
                      className="border-t border-slate-200/80 bg-slate-50/40 px-5 py-3 text-left text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-slate-500"
                    >
                      {g.group}
                    </th>
                  </tr>
                  {g.rows.map((row) => (
                    <tr key={`${g.group}-${row.label}`} className="border-t border-slate-100">
                      <th
                        scope="row"
                        className="max-w-md px-5 py-3 text-left font-normal text-slate-700"
                      >
                        <span className="block text-[0.88rem] font-medium text-slate-800">
                          {row.label}
                        </span>
                        {row.detail ? (
                          <span className="mt-0.5 block text-[0.76rem] leading-snug text-slate-500">
                            {row.detail}
                          </span>
                        ) : null}
                      </th>
                      {row.values.map((value, i) => (
                        <td
                          key={`${row.label}-${i}`}
                          className={cn(
                            "px-5 py-3 text-center align-middle",
                            i === 1 && "bg-hs-primary/[0.04]"
                          )}
                        >
                          <CellValue value={value} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

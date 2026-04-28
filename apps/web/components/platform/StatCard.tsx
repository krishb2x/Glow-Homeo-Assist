import { type LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  hint
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
}): JSX.Element {
  return (
    <div className="ds-app-card flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-caption-sm font-medium uppercase tracking-wide text-hs-text-tertiary">{label}</p>
        <Icon className="h-5 w-5 shrink-0 text-hs-primary/80" strokeWidth={1.5} />
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums tracking-tight text-hs-ink">{value}</p>
      {hint ? <p className="mt-1 text-caption-sm text-hs-text-tertiary">{hint}</p> : null}
    </div>
  );
}

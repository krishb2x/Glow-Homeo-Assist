import { type LucideIcon } from "lucide-react";
import { type ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-hs-border/50 bg-hs-cream/40 px-8 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-hs-primary-very-light/80 text-hs-primary">
        <Icon className="h-6 w-6" strokeWidth={1.5} />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-hs-ink">{title}</h2>
      <p className="mt-1 max-w-md text-sm text-hs-text-secondary">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

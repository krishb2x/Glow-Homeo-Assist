import { cn } from "../../lib/cn";

type Variant = "active" | "inactive" | "neutral";

const styles: Record<Variant, string> = {
  active: "bg-emerald-50 text-emerald-800 ring-emerald-200/60",
  inactive: "bg-hs-cream text-hs-text-secondary ring-hs-border/50",
  neutral: "bg-slate-50 text-slate-700 ring-slate-200/60"
};

export function StatusBadge({ children, variant = "neutral" }: { children: string; variant?: Variant }): JSX.Element {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-caption-sm font-medium ring-1 ring-inset",
        styles[variant]
      )}
    >
      {children}
    </span>
  );
}

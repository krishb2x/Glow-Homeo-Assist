import { ShieldCheck } from "lucide-react";
import { cn } from "../../lib/cn";

export function OfficialTemplateBadge({ className }: { className?: string }): JSX.Element {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-600/20",
        className
      )}
    >
      <ShieldCheck className="h-3 w-3" />
      Official GlowHomeo
    </span>
  );
}

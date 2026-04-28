import { type ReactNode } from "react";
import { cn } from "../../lib/cn";

export function TableCard({ children, className }: { children: ReactNode; className?: string }): JSX.Element {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-hs-border/30 bg-hs-card shadow-ds-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

export function TableShell({ children, className }: { children: ReactNode; className?: string }): JSX.Element {
  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">{children}</table>
    </div>
  );
}

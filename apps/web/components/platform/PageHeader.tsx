import { type ReactNode } from "react";
import { cn } from "../../lib/cn";

export function PageHeader({
  title,
  description,
  action,
  className
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <div className={cn("mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-hs-ink">{title}</h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-body-sm leading-relaxed text-hs-text-secondary">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0 sm:ml-4">{action}</div> : null}
    </div>
  );
}

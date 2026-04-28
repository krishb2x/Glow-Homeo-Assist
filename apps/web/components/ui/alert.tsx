import { type ReactNode } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, RefreshCw } from "lucide-react";
import { cn } from "../../lib/cn";

const variants = {
  error: {
    box: "border-hs-danger/30 bg-hs-danger/5 text-hs-ink",
    icon: "text-hs-danger",
    Icon: AlertCircle
  },
  success: {
    box: "border-hs-success/30 bg-hs-success/5 text-hs-ink",
    icon: "text-hs-success",
    Icon: CheckCircle2
  },
  warning: {
    box: "border-hs-warning/40 bg-hs-warning/8 text-hs-ink",
    icon: "text-hs-warning",
    Icon: AlertTriangle
  },
  info: {
    box: "border-hs-info/30 bg-hs-info/5 text-hs-ink",
    icon: "text-hs-info",
    Icon: Info
  }
} as const;

export type AlertVariant = keyof typeof variants;

type AlertProps = {
  variant: AlertVariant;
  title: string;
  children?: ReactNode;
  onRetry?: () => void;
  className?: string;
};

export function Alert({ variant, title, children, onRetry, className }: AlertProps): JSX.Element {
  const { Icon, box, icon } = variants[variant];
  return (
    <div className={cn("rounded-2xl border p-ds-md shadow-ds-sm", box, className)} role="alert">
      <div className="flex gap-ds-sm">
        <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", icon)} strokeWidth={2} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-heading text-typo-section text-hs-ink">{title}</p>
          {children ? <div className="mt-ds-sm text-typo-body text-hs-text-secondary">{children}</div> : null}
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="mt-ds-md inline-flex min-h-10 items-center gap-2 rounded-xl border border-hs-border/50 bg-hs-paper px-ds-md text-caption-md font-semibold text-hs-ink transition hover:border-hs-primary/30"
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              Try again
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

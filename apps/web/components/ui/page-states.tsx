import React, { type ReactNode } from "react";
import { Alert } from "./alert";
import { PageSkeleton } from "./skeleton";
import { friendlyLoadError } from "../../lib/friendly-error";
import { Card } from "./card";
import { cn } from "../../lib/cn";

type PageErrorProps = {
  err: unknown;
  title?: string;
  onRetry?: () => void;
  className?: string;
};

/** Friendly, retryable error — replaces raw “Failed to fetch” */
export function PageError({ err, title = "We couldn’t load this", onRetry, className }: PageErrorProps): JSX.Element {
  const message = err instanceof Error ? friendlyLoadError(err) : friendlyLoadError(new Error(String(err)));
  return (
    <Alert variant="error" title={title} onRetry={onRetry} className={className}>
      {message}
    </Alert>
  );
}

type PageEmptyProps = {
  title: string;
  description: string;
  className?: string;
  action?: ReactNode;
};

export function PageEmpty({ title, description, className, action }: PageEmptyProps): JSX.Element {
  return (
    <Card className={cn("border-dashed border-hs-border/50 bg-hs-cream/30 p-ds-xl text-center", className)}>
      <p className="font-heading text-typo-section text-hs-ink">{title}</p>
      <p className="mt-ds-sm text-typo-body text-hs-text-secondary">{description}</p>
      {action ? <div className="mt-ds-lg flex flex-wrap justify-center gap-ds-sm">{action}</div> : null}
    </Card>
  );
}

type PageLoadProps = { className?: string };
export function PageLoad({ className }: PageLoadProps): JSX.Element {
  return <PageSkeleton className={className} />;
}

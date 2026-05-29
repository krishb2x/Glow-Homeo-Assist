import React, { type ReactNode } from "react";
import { PageEmpty, PageError } from "./page-states";

type ErrorStateProps = {
  err: unknown;
  title?: string;
  onRetry?: () => void;
  className?: string;
};

/** @deprecated Use `PageError` from `@/components/ui` — alias kept for existing imports. */
export function ErrorState({ err, title, onRetry, className }: ErrorStateProps): JSX.Element {
  return <PageError err={err} title={title} onRetry={onRetry} className={className} />;
}

type EmptyStateProps = {
  title: string;
  description: string;
  className?: string;
  action?: ReactNode;
};

/** @deprecated Use `PageEmpty` from `@/components/ui` */
export function EmptyState({ title, description, className, action }: EmptyStateProps): JSX.Element {
  return <PageEmpty title={title} description={description} className={className} action={action} />;
}

"use client";

import { type ReactNode } from "react";
import { SupabaseSessionSync } from "../auth/SupabaseSessionSync";
import { ToastProvider } from "./toast";

/**
 * App-level client providers (toast, future theme, etc.)
 */
export function AppProviders({ children }: { children: ReactNode }): JSX.Element {
  return (
    <ToastProvider>
      <SupabaseSessionSync />
      {children}
    </ToastProvider>
  );
}

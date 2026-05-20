"use client";

import { type ReactNode } from "react";
import { SupabaseSessionSync } from "../auth/SupabaseSessionSync";
import { ThemeProvider } from "./ThemeProvider";
import { ToastProvider } from "./toast";

/**
 * App-level client providers (toast, theme, etc.)
 */
export function AppProviders({ children }: { children: ReactNode }): JSX.Element {
  return (
    <ThemeProvider>
      <ToastProvider>
        <SupabaseSessionSync />
        {children}
      </ToastProvider>
    </ThemeProvider>
  );
}

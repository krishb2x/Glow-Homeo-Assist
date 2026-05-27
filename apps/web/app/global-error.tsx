"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): JSX.Element {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-hs-surface px-6 py-16 text-center text-hs-ink antialiased">
        <h1 className="font-display text-2xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-hs-ink-muted">An unexpected error occurred. You can try again.</p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 inline-flex rounded-lg bg-hs-primary px-4 py-2 text-sm font-semibold text-white hover:bg-hs-primary/90"
        >
          Try again
        </button>
      </body>
    </html>
  );
}

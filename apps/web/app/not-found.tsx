import Link from "next/link";

export default function NotFound(): JSX.Element {
  return (
    <main id="main-content" className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
      <h1 className="font-display text-2xl font-semibold text-hs-ink">Page not found</h1>
      <p className="mt-2 text-sm text-hs-ink-muted">The page you requested does not exist or was moved.</p>
      <Link
        href="/"
        className="mt-6 inline-flex rounded-lg bg-hs-primary px-4 py-2 text-sm font-semibold text-white hover:bg-hs-primary/90"
      >
        Back to home
      </Link>
    </main>
  );
}

export function SkeletonCard({ className = "" }: { className?: string }): JSX.Element {
  return (
    <div
      className={
        "animate-pulse rounded-2xl border border-stone-200/80 bg-gh-paper p-5 shadow-sm " + className
      }
    >
      <div className="h-4 w-1/3 rounded bg-stone-200/80" />
      <div className="mt-3 h-3 w-2/3 rounded bg-stone-100" />
      <div className="mt-2 h-3 w-1/2 rounded bg-stone-100" />
    </div>
  );
}

export function PatientListSkeleton({ count = 4 }: { count?: number }): JSX.Element {
  return (
    <ul className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <li key={i}>
          <SkeletonCard className="h-[132px]" />
        </li>
      ))}
    </ul>
  );
}

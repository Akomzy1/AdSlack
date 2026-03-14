function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-surface-2 ${className ?? ""}`} />;
}

export default function BillingLoading() {
  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-8 space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Current plan card */}
      <div className="mb-8 rounded-2xl border border-border bg-surface p-6 space-y-4">
        <Skeleton className="h-5 w-28" />
        <div className="flex items-end gap-2">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-5 w-16" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-full rounded-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-surface p-6 space-y-4">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-9 w-24" />
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton key={j} className="h-4 w-full" />
              ))}
            </div>
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

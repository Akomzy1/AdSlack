function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-surface-2 ${className ?? ""}`} />;
}

export default function AdminLoading() {
  return (
    <div className="max-w-5xl p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-36" />
        </div>
        <Skeleton className="h-7 w-24 rounded-full" />
      </div>

      {/* Stat grid × 3 sections */}
      {Array.from({ length: 3 }).map((_, s) => (
        <section key={s} className="mb-8">
          <Skeleton className="mb-4 h-4 w-20" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-surface p-5 space-y-3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-9 w-16" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

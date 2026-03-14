// Generic dashboard loading skeleton — shown while any dashboard page fetches data

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-surface-2 ${className ?? ""}`}
    />
  );
}

export default function DashboardLoading() {
  return (
    <div className="flex h-full flex-col gap-6 p-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <SkeletonBlock className="h-8 w-48" />
        <SkeletonBlock className="h-9 w-32 rounded-full" />
      </div>

      {/* Filter / toolbar row */}
      <div className="flex gap-3">
        <SkeletonBlock className="h-9 w-64 rounded-full" />
        <SkeletonBlock className="h-9 w-24 rounded-full" />
        <SkeletonBlock className="h-9 w-24 rounded-full" />
      </div>

      {/* Card grid — mimics a 4-col ad grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-2xl border border-border bg-surface"
          >
            {/* Thumbnail */}
            <SkeletonBlock className="aspect-video rounded-none" />
            {/* Card body */}
            <div className="space-y-2 p-4">
              <SkeletonBlock className="h-4 w-3/4" />
              <SkeletonBlock className="h-3 w-1/2" />
              <div className="flex justify-between pt-1">
                <SkeletonBlock className="h-3 w-16" />
                <SkeletonBlock className="h-3 w-12" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

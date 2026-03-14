import { PatternCardSkeleton } from "@/components/patterns/PatternCard";

export default function PatternsLoading() {
  return (
    <div className="flex h-full flex-col">
      {/* Fake hero banner */}
      <div className="border-b border-border bg-gradient-to-br from-surface to-surface-2 p-6 pb-8">
        <div className="h-5 w-40 animate-pulse rounded bg-surface-2 mb-3" />
        <div className="h-8 w-72 animate-pulse rounded bg-surface-2 mb-2" />
        <div className="h-4 w-52 animate-pulse rounded bg-surface-2" />
      </div>
      {/* Fake toolbar */}
      <div className="border-b border-border/60 px-6 py-3">
        <div className="flex gap-2">
          {[80, 96, 80, 88, 72].map((w, i) => (
            <div key={i} className="h-7 rounded-full bg-surface-2 animate-pulse" style={{ width: w }} />
          ))}
        </div>
      </div>
      <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <PatternCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

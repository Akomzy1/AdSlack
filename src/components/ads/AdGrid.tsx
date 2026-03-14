"use client";

import { useEffect, useRef } from "react";
import { AdCard, AdCardSkeleton } from "@/components/ads/AdCard";
import { useInfiniteAds } from "@/hooks/useInfiniteAds";
import type { AdFilters, AdWithMetrics } from "@/types/ads";

export { useInfiniteAds };

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 text-5xl opacity-30">{hasFilters ? "🔍" : "📢"}</div>
      <h3 className="text-base font-semibold text-foreground">
        {hasFilters ? "No ads match your filters" : "No ads yet"}
      </h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {hasFilters
          ? "Try adjusting your search terms or clearing some filters to see more results."
          : "The ad discovery pipeline will start populating ads here shortly."}
      </p>
    </div>
  );
}

// ── Error state ───────────────────────────────────────────────────────────────

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 text-4xl">⚠️</div>
      <h3 className="text-sm font-semibold text-foreground">Failed to load ads</h3>
      <p className="mt-1 text-xs text-muted-foreground">{message}</p>
      <button onClick={onRetry} className="btn-secondary mt-4 px-4 py-2 text-sm">
        Try again
      </button>
    </div>
  );
}

// ── Sentinel (infinite scroll trigger) ───────────────────────────────────────

interface SentinelProps {
  onVisible: () => void;
  isLoading: boolean;
}

function Sentinel({ onVisible, isLoading }: SentinelProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isLoading) {
          onVisible();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [onVisible, isLoading]);

  return <div ref={ref} aria-hidden className="h-1 w-full" />;
}

// ── AdGrid ────────────────────────────────────────────────────────────────────

interface AdGridProps {
  filters: AdFilters;
  onAdClick?: (ad: AdWithMetrics) => void;
}

export function AdGrid({ filters, onAdClick }: AdGridProps) {
  const { ads, total, isLoading, isLoadingMore, hasMore, error, fetchNextPage, reset } =
    useInfiniteAds(filters);

  const hasFilters =
    !!filters.q ||
    filters.platforms.length > 0 ||
    filters.niches.length > 0 ||
    !!filters.country ||
    filters.adTypes.length > 0;

  if (error) {
    return (
      <div className="grid">
        <ErrorState message={error} onRetry={reset} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4">
        {/* Initial skeleton */}
        {isLoading &&
          Array.from({ length: 12 }).map((_, i) => <AdCardSkeleton key={i} />)}

        {/* Ads */}
        {!isLoading &&
          ads.map((ad) => (
            <AdCard key={ad.id} ad={ad} onClick={onAdClick} />
          ))}

        {/* Empty state */}
        {!isLoading && ads.length === 0 && (
          <EmptyState hasFilters={hasFilters} />
        )}

        {/* Load-more skeletons */}
        {isLoadingMore &&
          Array.from({ length: 4 }).map((_, i) => (
            <AdCardSkeleton key={`more-${i}`} />
          ))}
      </div>

      {/* Infinite scroll sentinel */}
      {!isLoading && hasMore && (
        <Sentinel onVisible={fetchNextPage} isLoading={isLoadingMore} />
      )}

      {/* End of results */}
      {!isLoading && !hasMore && ads.length > 0 && (
        <p className="py-6 text-center font-mono text-xs text-muted">
          — {ads.length} of {total} ads —
        </p>
      )}
    </div>
  );
}

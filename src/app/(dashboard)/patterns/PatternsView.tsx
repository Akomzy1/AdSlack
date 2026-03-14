"use client";

import { useState, useEffect, useCallback } from "react";
import { PatternStatus } from "@prisma/client";
import { PatternCard, PatternCardSkeleton, type PatternData } from "@/components/patterns/PatternCard";

const STATUS_FILTERS: { label: string; value: PatternStatus | "ALL" }[] = [
  { label: "All",      value: "ALL"                  },
  { label: "🌱 Emerging",  value: PatternStatus.EMERGING  },
  { label: "🔥 Trending",  value: PatternStatus.TRENDING  },
  { label: "📈 Peaked",   value: PatternStatus.PEAKED    },
  { label: "📉 Fading",   value: PatternStatus.FADING    },
];

const SORT_OPTIONS = [
  { label: "Virality",    value: "virality" },
  { label: "Growth Rate", value: "growth"   },
  { label: "Ad Count",    value: "adCount"  },
  { label: "Newest",      value: "newest"   },
];

const HOOK_OPTIONS = [
  "ALL",
  "CURIOSITY_GAP",
  "PAIN_POINT",
  "SOCIAL_PROOF",
  "PATTERN_INTERRUPT",
  "BOLD_CLAIM",
  "QUESTION",
  "STORY",
  "TUTORIAL",
  "OFFER",
  "FEAR",
] as const;

interface PatternsResponse {
  patterns: PatternData[];
  total: number;
  page: number;
  hasMore: boolean;
}

export function PatternsView() {
  const [statusFilter, setStatusFilter] = useState<PatternStatus | "ALL">("ALL");
  const [hookFilter, setHookFilter]     = useState<string>("ALL");
  const [sortBy, setSortBy]             = useState<string>("virality");
  const [nicheQuery, setNicheQuery]     = useState<string>("");
  const [page, setPage]                 = useState(1);

  const [data, setData]       = useState<PatternsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPatterns = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ sort: sortBy, page: String(page) });
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (hookFilter !== "ALL")   params.set("hookType", hookFilter);
      if (nicheQuery)             params.set("niche", nicheQuery);

      const res = await fetch(`/api/patterns?${params.toString()}`);
      if (res.ok) {
        const json = await res.json() as PatternsResponse;
        setData(json);
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter, hookFilter, sortBy, nicheQuery, page]);

  useEffect(() => {
    void fetchPatterns();
  }, [fetchPatterns]);

  // Reset page on filter change
  function handleStatusChange(v: PatternStatus | "ALL") {
    setStatusFilter(v);
    setPage(1);
  }

  function handleHookChange(v: string) {
    setHookFilter(v);
    setPage(1);
  }

  function handleSortChange(v: string) {
    setSortBy(v);
    setPage(1);
  }

  function handleGenerateAd(pattern: PatternData) {
    // Navigate to discover/remix page with pattern pre-filled
    const params = new URLSearchParams({
      patternId:   pattern.id,
      patternName: pattern.patternName,
      hookType:    pattern.hookType,
      formula:     pattern.scriptStructure,
    });
    window.open(`/discover?${params.toString()}`, "_blank");
  }

  return (
    <div className="flex flex-col gap-0">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border/60 px-6 py-3">
        {/* Status pills */}
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTERS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => handleStatusChange(value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === value
                  ? "bg-accent text-white"
                  : "bg-surface-2 text-muted hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-border hidden sm:block" />

        {/* Hook filter */}
        <select
          value={hookFilter}
          onChange={(e) => handleHookChange(e.target.value)}
          className="rounded-lg border border-border bg-surface px-2 py-1 text-xs text-foreground"
        >
          {HOOK_OPTIONS.map((h) => (
            <option key={h} value={h}>
              {h === "ALL" ? "All Hook Types" : h.replace(/_/g, " ")}
            </option>
          ))}
        </select>

        {/* Niche search */}
        <input
          type="text"
          placeholder="Filter by niche…"
          value={nicheQuery}
          onChange={(e) => { setNicheQuery(e.target.value); setPage(1); }}
          className="rounded-lg border border-border bg-surface px-3 py-1 text-xs text-foreground placeholder:text-muted w-36 focus:outline-none focus:ring-1 focus:ring-accent"
        />

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => handleSortChange(e.target.value)}
          className="rounded-lg border border-border bg-surface px-2 py-1 text-xs text-foreground ml-auto"
        >
          {SORT_OPTIONS.map(({ label, value }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Count */}
      {data && !loading && (
        <div className="px-6 pt-4 pb-1">
          <p className="text-xs text-muted">
            {data.total} pattern{data.total !== 1 ? "s" : ""} detected
          </p>
        </div>
      )}

      {/* Grid */}
      <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <PatternCardSkeleton key={i} />)
          : data?.patterns.map((pattern, i) => (
              <PatternCard
                key={pattern.id}
                pattern={pattern}
                rank={(page - 1) * 20 + i + 1}
                onGenerateAd={handleGenerateAd}
              />
            ))}

        {!loading && data?.patterns.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-sm font-medium text-foreground">No patterns found</p>
            <p className="text-xs text-muted mt-1">Try adjusting your filters or check back after the next cron run.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && (data.hasMore || page > 1) && (
        <div className="flex justify-center gap-2 pb-8">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:bg-surface-2 disabled:opacity-40"
          >
            ← Prev
          </button>
          <span className="flex items-center text-xs text-muted px-2">Page {page}</span>
          <button
            disabled={!data.hasMore}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:bg-surface-2 disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

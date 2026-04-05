"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import type { Route } from "next";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Creator {
  id:              string;
  name:            string;
  profileImageUrl: string | null;
  bio:             string | null;
  platforms:       string[];
  niches:          string[];
  contentStyles:   string[];
  priceRange:      string;
  turnaroundDays:  number;
  rating:          number;
  reviewCount:     number;
  completedBriefs: number;
  country:         string;
  isVerified:      boolean;
  isAvailable:     boolean;
}

interface CreatorsResponse {
  creators: Creator[];
  total:    number;
  page:     number;
  hasMore:  boolean;
}

interface Filters {
  q:          string;
  platform:   string;
  niche:      string;
  style:      string;
  maxPrice:   string;
  turnaround: string;
  minRating:  string;
  available:  boolean;
  sort:       string;
}

const DEFAULT_FILTERS: Filters = {
  q:          "",
  platform:   "",
  niche:      "",
  style:      "",
  maxPrice:   "",
  turnaround: "",
  minRating:  "",
  available:  false,
  sort:       "rating",
};

const PLATFORMS    = ["TikTok", "Instagram", "YouTube Shorts"];
const NICHES       = ["Beauty", "Skincare", "Fitness", "Health", "Kitchen", "Food", "Tech", "Gaming", "Fashion", "Lifestyle", "Pets", "Family", "Home", "Travel", "Wellness"];
const STYLES       = ["UGC Review", "Tutorial", "Unboxing", "Storytime", "GRWM", "Haul", "Before & After", "Educational", "POV", "Day in the Life"];
const SORT_OPTIONS = [
  { value: "rating",     label: "Top Rated" },
  { value: "price",      label: "Lowest Price" },
  { value: "turnaround", label: "Fastest" },
  { value: "briefs",     label: "Most Hired" },
  { value: "newest",     label: "Newest" },
];

// ─── Star rating ──────────────────────────────────────────────────────────────

function Stars({ rating }: { rating: number }) {
  const full  = Math.floor(rating);
  const half  = rating % 1 >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <span className="text-yellow-400 text-xs">
      {"★".repeat(full)}
      {half ? "½" : ""}
      <span className="text-surface-3">{"★".repeat(empty)}</span>
    </span>
  );
}

// ─── Creator card ─────────────────────────────────────────────────────────────

function CreatorCard({ creator }: { creator: Creator }) {
  const priceMatch = creator.priceRange.match(/\$(\d+)/);
  const priceFrom  = priceMatch?.[1] ? `from $${priceMatch[1]}` : creator.priceRange;

  return (
    <Link
      href={`/creators/${creator.id}` as Route}
      className="group flex flex-col rounded-xl border border-border bg-surface hover:border-accent/40 hover:bg-surface-2 transition-all p-4 gap-3"
    >
      {/* Avatar + name row */}
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          {creator.profileImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={creator.profileImageUrl}
              alt={creator.name}
              width={48}
              height={48}
              className="w-12 h-12 rounded-full object-cover bg-surface-2"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-surface-3 flex items-center justify-center text-xl font-bold text-muted">
              {creator.name[0]}
            </div>
          )}
          {creator.isAvailable && (
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-surface" title="Available" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-sm text-foreground truncate">{creator.name}</span>
            {creator.isVerified && (
              <span className="text-accent text-xs" title="Verified">✓</span>
            )}
            <span className="text-[10px] text-muted ml-auto shrink-0">{creator.country}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Stars rating={creator.rating} />
            <span className="text-[11px] text-muted">({creator.reviewCount})</span>
          </div>
        </div>
      </div>

      {/* Bio */}
      {creator.bio && (
        <p className="text-xs text-muted line-clamp-2 leading-relaxed">{creator.bio}</p>
      )}

      {/* Platforms */}
      <div className="flex flex-wrap gap-1">
        {creator.platforms.map((p) => (
          <span key={p} className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
            {p}
          </span>
        ))}
      </div>

      {/* Niches */}
      <div className="flex flex-wrap gap-1">
        {creator.niches.slice(0, 3).map((n) => (
          <span key={n} className="rounded-full bg-surface-3 px-2 py-0.5 text-[10px] text-muted">
            {n}
          </span>
        ))}
        {creator.niches.length > 3 && (
          <span className="text-[10px] text-muted">+{creator.niches.length - 3}</span>
        )}
      </div>

      {/* Footer: price + turnaround + briefs */}
      <div className="flex items-center justify-between border-t border-border pt-3 mt-auto">
        <div>
          <p className="text-[10px] text-muted">Starting</p>
          <p className="text-sm font-semibold text-foreground">{priceFrom}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-muted">Delivery</p>
          <p className="text-sm font-medium text-foreground">{creator.turnaroundDays}d</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-muted">Hired</p>
          <p className="text-sm font-medium text-foreground">{creator.completedBriefs}×</p>
        </div>
      </div>
    </Link>
  );
}

// ─── Filter sidebar ───────────────────────────────────────────────────────────

function FilterSidebar({
  filters,
  onChange,
  onReset,
  total,
}: {
  filters:  Filters;
  onChange: (f: Partial<Filters>) => void;
  onReset:  () => void;
  total:    number;
}) {
  const isDirty = JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS);

  return (
    <aside className="w-56 shrink-0 flex flex-col gap-4 overflow-y-auto pr-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted uppercase tracking-wide">Filters</span>
        {isDirty && (
          <button onClick={onReset} className="text-[10px] text-accent hover:underline">
            Reset
          </button>
        )}
      </div>

      {/* Platform */}
      <div>
        <p className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-2">Platform</p>
        <div className="flex flex-col gap-1">
          {PLATFORMS.map((p) => (
            <label key={p} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="platform"
                value={p}
                checked={filters.platform === p}
                onChange={() => onChange({ platform: filters.platform === p ? "" : p })}
                className="accent-accent"
              />
              <span className="text-xs text-foreground">{p}</span>
            </label>
          ))}
          {filters.platform && (
            <button onClick={() => onChange({ platform: "" })} className="text-[10px] text-muted hover:text-accent text-left mt-0.5">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Niche */}
      <div>
        <p className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-2">Niche</p>
        <select
          value={filters.niche}
          onChange={(e) => onChange({ niche: e.target.value })}
          className="w-full rounded-lg bg-surface-2 border border-border text-xs text-foreground px-2 py-1.5"
        >
          <option value="">All niches</option>
          {NICHES.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>

      {/* Content style */}
      <div>
        <p className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-2">Content Style</p>
        <select
          value={filters.style}
          onChange={(e) => onChange({ style: e.target.value })}
          className="w-full rounded-lg bg-surface-2 border border-border text-xs text-foreground px-2 py-1.5"
        >
          <option value="">All styles</option>
          {STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Max price */}
      <div>
        <p className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-2">Max Price</p>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted">$</span>
          <input
            type="number"
            min="0"
            max="5000"
            step="50"
            placeholder="e.g. 300"
            value={filters.maxPrice}
            onChange={(e) => onChange({ maxPrice: e.target.value })}
            className="w-full rounded-lg bg-surface-2 border border-border text-xs text-foreground px-2 py-1.5"
          />
        </div>
      </div>

      {/* Turnaround */}
      <div>
        <p className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-2">Turnaround</p>
        <div className="flex flex-col gap-1">
          {(["1-3", "3-7", "7+"] as const).map((t) => {
            const label = t === "1-3" ? "1–3 days" : t === "3-7" ? "3–7 days" : "7+ days";
            return (
              <label key={t} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="turnaround"
                  value={t}
                  checked={filters.turnaround === t}
                  onChange={() => onChange({ turnaround: filters.turnaround === t ? "" : t })}
                  className="accent-accent"
                />
                <span className="text-xs text-foreground">{label}</span>
              </label>
            );
          })}
          {filters.turnaround && (
            <button onClick={() => onChange({ turnaround: "" })} className="text-[10px] text-muted hover:text-accent text-left mt-0.5">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Min rating */}
      <div>
        <p className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-2">Min Rating</p>
        <div className="flex flex-col gap-1">
          {(["4", "4.5"] as const).map((r) => (
            <label key={r} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="minRating"
                value={r}
                checked={filters.minRating === r}
                onChange={() => onChange({ minRating: filters.minRating === r ? "" : r })}
                className="accent-accent"
              />
              <span className="text-xs text-foreground">{r}+ ★</span>
            </label>
          ))}
          {filters.minRating && (
            <button onClick={() => onChange({ minRating: "" })} className="text-[10px] text-muted hover:text-accent text-left mt-0.5">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Availability */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={filters.available}
          onChange={(e) => onChange({ available: e.target.checked })}
          className="accent-accent"
        />
        <span className="text-xs text-foreground">Available now only</span>
      </label>

      <div className="text-[11px] text-muted mt-2">{total} creators</div>
    </aside>
  );
}

// ─── PRO paywall ──────────────────────────────────────────────────────────────

const PRO_ROLES = new Set(["PRO", "SCALE", "AGENCY", "ADMIN"]);

function ProPaywall() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-24 px-6 text-center">
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-accent/10 text-4xl">
        🎬
      </div>
      <h2 className="mb-2 text-2xl font-bold text-foreground">Creator Marketplace</h2>
      <p className="mb-1 text-sm text-muted-foreground max-w-md">
        Browse verified UGC creators, send creative briefs, and manage your campaigns — all from one place.
      </p>
      <p className="mb-8 text-xs text-muted">Available on Pro, Scale, and Agency plans.</p>
      <Link
        href={"/billing" as Route}
        className="rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
      >
        Upgrade to Pro →
      </Link>
      <p className="mt-4 text-xs text-muted">
        Starting at $59/mo · Cancel anytime
      </p>
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function CreatorsView() {
  const { data: session, status } = useSession();
  const [filters, setFilters]   = useState<Filters>(DEFAULT_FILTERS);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [hasMore, setHasMore]   = useState(false);
  const [loading, setLoading]   = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const hasPro = status === "loading" || PRO_ROLES.has(session?.user?.role ?? "");

  // "/" shortcut to focus search
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "/" && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);

  const buildParams = useCallback((f: Filters, p: number) => {
    const params = new URLSearchParams();
    if (f.q)          params.set("q",          f.q);
    if (f.platform)   params.set("platform",   f.platform);
    if (f.niche)      params.set("niche",       f.niche);
    if (f.style)      params.set("style",       f.style);
    if (f.maxPrice)   params.set("maxPrice",    f.maxPrice);
    if (f.turnaround) params.set("turnaround",  f.turnaround);
    if (f.minRating)  params.set("minRating",   f.minRating);
    if (f.available)  params.set("available",   "true");
    params.set("sort",  f.sort);
    params.set("page",  String(p));
    params.set("limit", "24");
    return params;
  }, []);

  const fetchCreators = useCallback(async (f: Filters, p: number, append = false) => {
    if (p === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const params = buildParams(f, p);
      const res    = await fetch(`/api/creators?${params}`);
      if (!res.ok) return;
      const data: CreatorsResponse = await res.json() as CreatorsResponse;

      setCreators((prev) => append ? [...prev, ...data.creators] : data.creators);
      setTotal(data.total);
      setHasMore(data.hasMore);
      setPage(p);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [buildParams]);

  // Initial + filter-change fetch
  useEffect(() => {
    void fetchCreators(filters, 1, false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleFilterChange = useCallback((partial: Partial<Filters>) => {
    setFilters((f) => ({ ...f, ...partial }));
  }, []);

  const handleReset = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  const handleLoadMore = useCallback(() => {
    if (!hasMore || loadingMore) return;
    void fetchCreators(filters, page + 1, true);
  }, [fetchCreators, filters, hasMore, loadingMore, page]);

  if (!hasPro) return <ProPaywall />;

  return (
    <div className="flex h-[calc(100vh-48px)] overflow-hidden">
      {/* Filter sidebar */}
      <div className="w-60 shrink-0 border-r border-border p-4 overflow-y-auto bg-surface">
        <FilterSidebar
          filters={filters}
          onChange={handleFilterChange}
          onReset={handleReset}
          total={total}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center gap-3 border-b border-border px-5 py-3 bg-surface shrink-0">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">🔍</span>
            <input
              ref={searchRef}
              type="text"
              placeholder='Search creators… ("/")'
              value={filters.q}
              onChange={(e) => handleFilterChange({ q: e.target.value })}
              className="w-full rounded-lg bg-surface-2 border border-border text-sm text-foreground pl-9 pr-3 py-2 focus:outline-none focus:border-accent/50"
            />
          </div>

          {/* Sort */}
          <select
            value={filters.sort}
            onChange={(e) => handleFilterChange({ sort: e.target.value })}
            className="rounded-lg bg-surface-2 border border-border text-sm text-foreground px-3 py-2"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <span className="text-xs text-muted shrink-0">{total} creators</span>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border bg-surface animate-pulse h-64" />
              ))}
            </div>
          ) : creators.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <p className="text-4xl">🎬</p>
              <p className="text-lg font-semibold text-foreground">No creators found</p>
              <p className="text-sm text-muted">Try adjusting your filters</p>
              <button onClick={handleReset} className="text-sm text-accent hover:underline">
                Reset filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {creators.map((c) => <CreatorCard key={c.id} creator={c} />)}
              </div>

              {hasMore && (
                <div className="flex justify-center mt-8">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="px-6 py-2.5 rounded-lg bg-surface-2 border border-border text-sm text-foreground hover:bg-surface-3 disabled:opacity-50 transition-colors"
                  >
                    {loadingMore ? "Loading…" : "Load more"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { ProductCard, ProductCardSkeleton } from "@/components/products/ProductCard";
import type { ProductCardData } from "@/components/products/ProductCard";
import type { LifecycleStage, TrendDirection } from "@/services/lifecycleEngine";

// ── Filter state ──────────────────────────────────────────────────────────────

interface Filters {
  stage: LifecycleStage | "";
  niche: string;
  platform: string;
  trend: TrendDirection | "";
  sort: "saturation" | "opps" | "adCount" | "newest";
  page: number;
}

const DEFAULT_FILTERS: Filters = {
  stage:    "",
  niche:    "",
  platform: "",
  trend:    "",
  sort:     "opps",
  page:     0,
};

// ── Constants ─────────────────────────────────────────────────────────────────

const STAGES: { value: LifecycleStage | ""; label: string }[] = [
  { value: "",               label: "All stages" },
  { value: "HIDDEN_GEM",    label: "💎 Hidden Gem" },
  { value: "EARLY_SCALING", label: "🚀 Early Scaling" },
  { value: "GROWTH",        label: "📈 Growth" },
  { value: "SATURATED",     label: "⚠️ Saturated" },
  { value: "DYING",         label: "📉 Dying" },
];

const SORT_OPTIONS: { value: Filters["sort"]; label: string }[] = [
  { value: "opps",       label: "Best opportunity (low sat)" },
  { value: "saturation", label: "Most saturated" },
  { value: "adCount",    label: "Most ads" },
  { value: "newest",     label: "Newest" },
];

const PLATFORMS = ["TIKTOK", "FACEBOOK", "INSTAGRAM", "YOUTUBE"];

const TRENDS: { value: TrendDirection | ""; label: string }[] = [
  { value: "",          label: "All trends" },
  { value: "RISING",    label: "↑ Rising" },
  { value: "STABLE",    label: "→ Stable" },
  { value: "DECLINING", label: "↓ Declining" },
];

// ── Component ─────────────────────────────────────────────────────────────────

interface ProductsResponse {
  products: ProductCardData[];
  pagination: { page: number; total: number; pages: number };
}

export function ProductsView() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [data, setData] = useState<ProductsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async (f: Filters) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (f.stage)    params.set("stage",    f.stage);
      if (f.niche)    params.set("niche",    f.niche);
      if (f.platform) params.set("platform", f.platform);
      if (f.trend)    params.set("trend",    f.trend);
      params.set("sort", f.sort);
      params.set("page", String(f.page));

      const res = await fetch(`/api/products/trending?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load products");
      const json = await res.json() as { data: ProductsResponse };
      setData(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProducts(filters);
  }, [filters, fetchProducts]);

  function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((f) => ({ ...f, [key]: value, page: key === "page" ? (value as number) : 0 }));
  }

  const { products = [], pagination } = data ?? {};

  return (
    <div className="flex h-full flex-col">
      {/* ── Toolbar ────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 border-b border-border/60 bg-background/95 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-2 px-6 py-3">
          {/* Stage pills */}
          <div className="flex flex-wrap gap-1.5">
            {STAGES.map((s) => (
              <button
                key={s.value}
                onClick={() => setFilter("stage", s.value)}
                className={[
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  filters.stage === s.value
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border bg-surface text-muted hover:border-border-hover hover:text-foreground",
                ].join(" ")}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Platform filter */}
            <select
              value={filters.platform}
              onChange={(e) => setFilter("platform", e.target.value)}
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-foreground focus:border-accent focus:outline-none"
            >
              <option value="">All platforms</option>
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>
              ))}
            </select>

            {/* Trend filter */}
            <select
              value={filters.trend}
              onChange={(e) => setFilter("trend", e.target.value as TrendDirection | "")}
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-foreground focus:border-accent focus:outline-none"
            >
              {TRENDS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={filters.sort}
              onChange={(e) => setFilter("sort", e.target.value as Filters["sort"])}
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-foreground focus:border-accent focus:outline-none"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {/* Meta row */}
        {!loading && pagination && (
          <p className="mb-4 text-xs text-muted">
            {pagination.total.toLocaleString()} product
            {pagination.total !== 1 ? "s" : ""} found
          </p>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
            {error}
          </div>
        )}

        {/* Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {loading
            ? Array.from({ length: 12 }).map((_, i) => <ProductCardSkeleton key={i} />)
            : products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>

        {/* Empty state */}
        {!loading && !error && products.length === 0 && (
          <div className="py-24 text-center">
            <p className="text-lg font-semibold text-foreground">No products found</p>
            <p className="mt-1 text-sm text-muted">
              Try a different filter or run the lifecycle recalculation.
            </p>
          </div>
        )}

        {/* Pagination */}
        {!loading && pagination && pagination.pages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <button
              onClick={() => setFilter("page", filters.page - 1)}
              disabled={filters.page === 0}
              className="rounded-lg border border-border px-4 py-2 text-sm text-muted transition-colors hover:border-border-hover hover:text-foreground disabled:opacity-40"
            >
              ← Prev
            </button>
            <span className="text-xs text-muted">
              {filters.page + 1} / {pagination.pages}
            </span>
            <button
              onClick={() => setFilter("page", filters.page + 1)}
              disabled={filters.page >= pagination.pages - 1}
              className="rounded-lg border border-border px-4 py-2 text-sm text-muted transition-colors hover:border-border-hover hover:text-foreground disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

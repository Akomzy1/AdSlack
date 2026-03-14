"use client";

import { useCallback, useEffect, useState } from "react";
import { FilterSidebar } from "@/components/ads/FilterSidebar";
import { SearchBar } from "@/components/ads/SearchBar";
import { SortControls } from "@/components/ads/SortControls";
import { AdGrid, useInfiniteAds } from "@/components/ads/AdGrid";
import { DEFAULT_FILTERS } from "@/types/ads";
import type { AdFilters, SortOption } from "@/types/ads";

export function DiscoverView() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [filters, setFilters] = useState<AdFilters>(DEFAULT_FILTERS);

  // Close sidebar on mobile by default
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth < 1024) setSidebarOpen(false);
      else setSidebarOpen(true);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Keyboard shortcut: "/" to focus search
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "/" && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        document.getElementById("discover-search")?.focus();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const handleSearch = useCallback((q: string) => {
    setFilters((f) => ({ ...f, q, page: 0 }));
  }, []);

  const handleSort = useCallback((sort: SortOption) => {
    setFilters((f) => ({ ...f, sort, page: 0 }));
  }, []);

  const handleApplyFilters = useCallback((newFilters: AdFilters) => {
    setFilters((f) => ({ ...f, ...newFilters, page: 0 }));
  }, []);

  // We need total count for SortControls — re-use state from AdGrid
  // For this we lift a minimal piece of state up
  const [adsMeta, setAdsMeta] = useState({ total: 0, isLoading: true });

  return (
    <div className="flex h-[calc(100vh-0px)] overflow-hidden">
      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={[
          "z-40 flex flex-col border-r border-border",
          "transition-all duration-300 ease-in-out",
          sidebarOpen ? "w-60" : "w-0",
          "fixed inset-y-0 left-0 overflow-hidden lg:relative lg:inset-auto",
        ].join(" ")}
        style={{ minWidth: sidebarOpen ? 240 : 0 }}
      >
        <FilterSidebar
          filters={filters}
          onApply={handleApplyFilters}
          onClose={() => setSidebarOpen(false)}
        />
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex flex-col gap-3 border-b border-border bg-surface/50 px-5 py-4 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            {/* Sidebar toggle */}
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className={[
                "btn-ghost flex h-9 w-9 shrink-0 items-center justify-center rounded-lg p-0",
                sidebarOpen ? "text-accent" : "text-muted-foreground",
              ].join(" ")}
              title={sidebarOpen ? "Hide filters" : "Show filters"}
              aria-label="Toggle filter sidebar"
            >
              <FilterIcon open={sidebarOpen} />
            </button>

            {/* Page title */}
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-foreground">Discover</h1>
              <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">
                Beta
              </span>
            </div>

            {/* Search bar */}
            <div className="flex-1" id="discover-search">
              <SearchBar value={filters.q} onChange={handleSearch} />
            </div>
          </div>

          {/* Sort controls */}
          <SortControls
            value={filters.sort}
            onChange={handleSort}
            total={adsMeta.total}
            isLoading={adsMeta.isLoading}
          />
        </div>

        {/* Grid area */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <AdGridWithMeta
            filters={filters}
            onMetaChange={setAdsMeta}
          />
        </div>
      </div>
    </div>
  );
}

// ── AdGrid wrapper that lifts meta state ──────────────────────────────────────

function AdGridWithMeta({
  filters,
  onMetaChange,
}: {
  filters: AdFilters;
  onMetaChange: (meta: { total: number; isLoading: boolean }) => void;
}) {
  const adsState = useInfiniteAds(filters);

  useEffect(() => {
    onMetaChange({ total: adsState.total, isLoading: adsState.isLoading });
  }, [adsState.total, adsState.isLoading, onMetaChange]);

  return <AdGrid filters={filters} />;
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function FilterIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
    >
      {open ? (
        // X (close) icon
        <>
          <line x1="4" y1="4" x2="14" y2="14" />
          <line x1="14" y1="4" x2="4" y2="14" />
        </>
      ) : (
        // Filter sliders icon
        <>
          <line x1="3" y1="5" x2="15" y2="5" />
          <line x1="3" y1="9" x2="15" y2="9" />
          <line x1="3" y1="13" x2="15" y2="13" />
          <circle cx="7" cy="5" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="11" cy="9" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="7" cy="13" r="1.5" fill="currentColor" stroke="none" />
        </>
      )}
    </svg>
  );
}

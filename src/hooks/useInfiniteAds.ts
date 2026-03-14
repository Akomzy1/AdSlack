"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AdFilters, AdWithMetrics, AdsResponse } from "@/types/ads";
import { ADS_PER_PAGE } from "@/types/ads";

function buildQueryString(filters: AdFilters): string {
  const params = new URLSearchParams();

  if (filters.q) params.set("q", filters.q);
  if (filters.platforms.length) params.set("platforms", filters.platforms.join(","));
  if (filters.niches.length) params.set("niches", filters.niches.join(","));
  if (filters.country) params.set("country", filters.country);
  if (filters.adTypes.length) params.set("adTypes", filters.adTypes.join(","));
  if (filters.dateRange) params.set("dateRange", filters.dateRange);
  if (filters.velocityMin > 0) params.set("velocityMin", String(filters.velocityMin));
  if (filters.velocityMax < 100) params.set("velocityMax", String(filters.velocityMax));
  if (filters.spendMin) params.set("spendMin", filters.spendMin);
  if (filters.spendMax) params.set("spendMax", filters.spendMax);
  params.set("sort", filters.sort);

  return params.toString();
}

interface UseInfiniteAdsReturn {
  ads: AdWithMetrics[];
  total: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  fetchNextPage: () => void;
  reset: () => void;
}

export function useInfiniteAds(filters: AdFilters): UseInfiniteAdsReturn {
  const [ads, setAds] = useState<AdWithMetrics[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track a "session key" derived from filters (excludes page).
  // When filters change, we reset to page 0.
  const filterKey = buildQueryString({ ...filters, page: 0 });
  const prevFilterKey = useRef<string>("");

  const fetchPage = useCallback(
    async (pageNum: number, isFirstPage: boolean) => {
      if (isFirstPage) setIsLoading(true);
      else setIsLoadingMore(true);
      setError(null);

      try {
        const qs = buildQueryString(filters);
        const res = await fetch(`/api/ads?${qs}&page=${pageNum}&limit=${ADS_PER_PAGE}`);
        if (!res.ok) throw new Error("Failed to load ads");

        const data: AdsResponse = await res.json() as AdsResponse;

        setAds((prev) => (isFirstPage ? data.ads : [...prev, ...data.ads]));
        setTotal(data.total);
        setHasMore(data.hasMore);
        setPage(pageNum);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        if (isFirstPage) setIsLoading(false);
        else setIsLoadingMore(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filterKey]
  );

  // Reset + re-fetch when filters change
  useEffect(() => {
    if (prevFilterKey.current !== filterKey) {
      prevFilterKey.current = filterKey;
      setAds([]);
      setPage(0);
      setHasMore(true);
      void fetchPage(0, true);
    }
  }, [filterKey, fetchPage]);

  // Initial load
  useEffect(() => {
    prevFilterKey.current = filterKey;
    void fetchPage(0, true);
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchNextPage = useCallback(() => {
    if (!hasMore || isLoadingMore || isLoading) return;
    void fetchPage(page + 1, false);
  }, [hasMore, isLoadingMore, isLoading, page, fetchPage]);

  const reset = useCallback(() => {
    prevFilterKey.current = "";
  }, []);

  return { ads, total, isLoading, isLoadingMore, hasMore, error, fetchNextPage, reset };
}

import type { AdStatus, AdType, CtaType, HookType, Platform } from "@prisma/client";

/** Metrics snapshot attached to an ad (latest record) */
export interface AdMetricsSnapshot {
  likes: number;
  comments: number;
  shares: number;
  views: number;
  earlyVelocityScore: number;
}

/** Ad with its most recent metrics included — shape returned by /api/ads */
export interface AdWithMetrics {
  id: string;
  platform: Platform;
  externalId: string;
  brandName: string;
  productName: string | null;
  niche: string;
  adType: AdType;
  duration: number | null;
  country: string;
  language: string;
  hookText: string | null;
  hookType: HookType | null;
  ctaText: string | null;
  ctaType: CtaType | null;
  thumbnailUrl: string | null;
  landingPageUrl: string | null;
  estimatedSpendMin: number | null;
  estimatedSpendMax: number | null;
  firstSeenAt: string;
  lastSeenAt: string;
  daysRunning: number;
  isActive: boolean;
  status: AdStatus;
  // Cached velocity fields (updated by cron every 6h)
  velocityScore: number;
  velocityTier: VelocityTier;
  latestMetrics: AdMetricsSnapshot | null;
}

/** Velocity tier classification */
export type VelocityTier = "EXPLOSIVE" | "HIGH" | "RISING" | "STEADY";

/** Full result from the velocity engine for one ad */
export interface VelocityResult {
  score: number;            // 0–100
  tier: VelocityTier;
  velocityRaw: number;
  velocityNormalized: number;
  deltaEngagement24h: number;
  deltaEngagement72h: number;
  adAgeHours: number;
  totalEngagement: number;
}

/** Response envelope for GET /api/ads */
export interface AdsResponse {
  ads: AdWithMetrics[];
  total: number;
  hasMore: boolean;
  page: number;
}

/** Filter and sort state — mirrors URL search params */
export type SortOption = "velocity" | "engagement" | "newest" | "longest" | "spend";
export type DateRange = "7d" | "14d" | "30d" | "90d" | "all";

export interface AdFilters {
  q: string;
  platforms: Platform[];
  niches: string[];
  country: string;
  adTypes: AdType[];
  dateRange: DateRange;
  velocityMin: number;
  velocityMax: number;
  spendMin: string;
  spendMax: string;
  sort: SortOption;
  page: number;
}

export const DEFAULT_FILTERS: AdFilters = {
  q: "",
  platforms: [],
  niches: [],
  country: "",
  adTypes: [],
  dateRange: "30d",
  velocityMin: 0,
  velocityMax: 100,
  spendMin: "",
  spendMax: "",
  sort: "velocity",
  page: 0,
};

export const ADS_PER_PAGE = 20;

/**
 * Shared types for the Adslack ingestion pipeline.
 *
 * RawAdData is the canonical intermediate format every ingester produces.
 * The normalizer consumes it and writes to the database.
 */

export type RawPlatform = "FACEBOOK" | "INSTAGRAM" | "TIKTOK" | "YOUTUBE";
export type RawAdType  = "VIDEO" | "IMAGE" | "CAROUSEL";

/** Canonical intermediate shape — platform-agnostic. */
export interface RawAdData {
  /** Globally unique within the source platform (e.g. Meta ad ID, TikTok vid). */
  externalId: string;
  platform: RawPlatform;

  brandName: string;
  productName?: string;

  adType: RawAdType;
  /** Video length in seconds; omit for IMAGE/CAROUSEL. */
  duration?: number;

  country: string;
  language: string;

  /** Primary hook / first line of ad copy. */
  hookText?: string;
  /** CTA button label (e.g. "Shop Now"). */
  ctaText?: string;

  thumbnailUrl?: string;
  videoUrl?: string;
  landingPageUrl?: string;

  /** Estimated monthly spend range in USD. */
  estimatedSpendMin?: number;
  estimatedSpendMax?: number;

  firstSeenAt: Date;
  lastSeenAt: Date;
  isActive: boolean;

  rawMetrics: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
  };

  /**
   * Optional niche hint from the source (e.g. TikTok industry key).
   * The normalizer uses this as a tie-breaker before keyword matching.
   */
  rawNicheHint?: string;
}

// ─── Result shapes ────────────────────────────────────────────────────────────

export interface IngestionResult {
  source: string;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  duration_ms: number;
  messages: string[];
}

export interface SchedulerResult {
  sources: IngestionResult[];
  total: {
    created: number;
    updated: number;
    skipped: number;
    errors: number;
  };
  duration_ms: number;
}

// ─── Ingester options ─────────────────────────────────────────────────────────

export interface IngesterOptions {
  /** Max ads to fetch per source (safety cap). Default: 500 */
  limit?: number;
  /** ISO-2 country code filter. Default: "US" */
  country?: string;
  /** When true, normalizes and logs but does NOT write to DB. */
  dryRun?: boolean;
}

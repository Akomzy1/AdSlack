/**
 * tiktokIngester.ts
 *
 * Fetches trending/top ads from the TikTok Creative Center API and normalizes
 * them to RawAdData for the Adslack pipeline.
 *
 * Docs:
 *   https://business-api.tiktok.com/portal/docs?id=1738864915188737
 *   Endpoint: GET /open_api/v1.3/creative/intelligence/top_ads/get/
 *
 * Required env vars:
 *   TIKTOK_ACCESS_TOKEN  — App access token from TikTok For Business developer portal
 *   TIKTOK_APP_ID        — Your TikTok App ID (optional, for logging)
 *
 * Rate limits:
 *   ~1,000 req/day on the Creative Center API sandbox tier.
 *   We spread calls across industry IDs to avoid hitting per-resource limits.
 */

import { withRetry, processAdBatch } from "./normalizer";
import type { RawAdData, IngestionResult, IngesterOptions } from "./types";

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_URL = "https://business-api.tiktok.com/open_api/v1.3/creative/intelligence/top_ads/get/";

/**
 * TikTok industry ID → our niche slug mapping.
 * IDs sourced from: https://business-api.tiktok.com/portal/docs?id=1740489236862977
 */
const TIKTOK_INDUSTRIES: Array<{ id: number; niche: string }> = [
  { id: 1,  niche: "beauty" },
  { id: 6,  niche: "health" },
  { id: 12, niche: "fitness" },
  { id: 4,  niche: "kitchen" },   // Food & Beverage (closest to kitchen)
  { id: 7,  niche: "home_decor" },
  { id: 11, niche: "pets" },
  { id: 15, niche: "tech" },
  { id: 5,  niche: "gaming" },
  { id: 14, niche: "education" },
  { id: 3,  niche: "finance" },
];

// ─── TikTok API response types ────────────────────────────────────────────────

interface TikTokVideoInfo {
  vid?: string;
  cover?: string;
  video_url?: string;
  duration?: number;       // seconds
  width?: number;
  height?: number;
}

interface TikTokTopAd {
  video_info?: TikTokVideoInfo;
  ad_title?: string;
  brand_name?: string;
  like_count?: number;
  comment_count?: number;
  share_count?: number;
  play_count?: number;
  first_shown_date?: string;  // "2024-01-15"
  last_shown_date?: string;
  country_code?: string;
  industry_key?: string;
  landing_page_url?: string;
}

interface TikTokResponse {
  code: number;
  message?: string;
  data?: {
    list?: TikTokTopAd[];
    pagination?: {
      total_count: number;
      page: number;
      page_size: number;
    };
  };
}

// ─── Normalization ────────────────────────────────────────────────────────────

function parseTikTokDate(dateStr?: string): Date {
  if (!dateStr) return new Date();
  // TikTok may return "20240115" or "2024-01-15"
  const normalized = dateStr.length === 8
    ? `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`
    : dateStr;
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? new Date() : d;
}

function normalizeTikTokAd(
  raw: TikTokTopAd,
  nicheHint: string
): RawAdData | null {
  const vid = raw.video_info?.vid;
  if (!vid || !raw.brand_name) return null;

  const firstSeenAt = parseTikTokDate(raw.first_shown_date);
  const lastSeenAt  = parseTikTokDate(raw.last_shown_date);
  const isActive    = !raw.last_shown_date ||
    (Date.now() - lastSeenAt.getTime()) < 3 * 24 * 60 * 60 * 1000;

  return {
    externalId:    `tiktok_${vid}`,
    platform:      "TIKTOK",
    brandName:     raw.brand_name.trim(),
    adType:        "VIDEO",
    duration:      raw.video_info?.duration,
    country:       raw.country_code ?? "US",
    language:      "en",
    hookText:      raw.ad_title?.trim(),
    thumbnailUrl:  raw.video_info?.cover,
    videoUrl:      raw.video_info?.video_url,
    landingPageUrl: raw.landing_page_url,
    firstSeenAt,
    lastSeenAt,
    isActive,
    rawMetrics: {
      likes:    raw.like_count    ?? 0,
      comments: raw.comment_count ?? 0,
      shares:   raw.share_count   ?? 0,
      views:    raw.play_count    ?? 0,
    },
    rawNicheHint:  raw.industry_key ?? nicheHint,
  };
}

// ─── API fetcher ──────────────────────────────────────────────────────────────

interface FetchPageResult {
  ads: RawAdData[];
  hasMore: boolean;
}

async function fetchTopAds(
  token: string,
  industryId: number,
  nicheHint: string,
  country: string,
  page: number,
  pageSize: number
): Promise<FetchPageResult> {
  const params = new URLSearchParams({
    industry_id:  String(industryId),
    country_code: country,
    period:       "7",          // last 7 days
    order_by:     "like_count",
    page:         String(page),
    page_size:    String(pageSize),
  });

  const url = `${BASE_URL}?${params.toString()}`;

  const res = await fetch(url, {
    headers: {
      "Access-Token": token,
      "Content-Type": "application/json",
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`TikTok API HTTP ${res.status}: ${await res.text()}`);
  }

  const body = (await res.json()) as TikTokResponse;

  // TikTok returns errors in the JSON body
  if (body.code !== 0) {
    // 40100 = auth error, 40200 = rate limit
    if (body.code === 40200) throw new Error(`429: TikTok rate limit exceeded`);
    if (body.code === 40100 || body.code === 40101)
      throw new Error(`401: TikTok auth error — ${body.message}`);
    throw new Error(`TikTok API error ${body.code}: ${body.message}`);
  }

  const list = body.data?.list ?? [];
  const pagination = body.data?.pagination;

  const ads = list
    .map((raw) => normalizeTikTokAd(raw, nicheHint))
    .filter((a): a is RawAdData => a !== null);

  const totalFetched = (pagination?.page ?? 1) * (pagination?.page_size ?? pageSize);
  const hasMore = totalFetched < (pagination?.total_count ?? 0);

  return { ads, hasMore };
}

// ─── Public runner ────────────────────────────────────────────────────────────

export async function runTiktokIngestion(
  opts: IngesterOptions = {}
): Promise<IngestionResult> {
  const start = Date.now();
  const token = process.env.TIKTOK_ACCESS_TOKEN;

  if (!token) {
    return {
      source: "tiktok",
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      duration_ms: Date.now() - start,
      messages: ["TIKTOK_ACCESS_TOKEN not set — skipping TikTok ingestion"],
    };
  }

  const country  = opts.country ?? "US";
  const limit    = opts.limit   ?? 500;
  const dryRun   = opts.dryRun  ?? false;
  const pageSize = 20; // TikTok Creative Center max per page

  const allAds: RawAdData[] = [];

  for (const { id: industryId, niche } of TIKTOK_INDUSTRIES) {
    if (allAds.length >= limit) break;

    let page = 1;
    const maxPages = Math.ceil(Math.min(limit / TIKTOK_INDUSTRIES.length, 60) / pageSize);

    while (page <= maxPages && allAds.length < limit) {
      try {
        const { ads, hasMore } = await withRetry(
          () => fetchTopAds(token, industryId, niche, country, page, pageSize),
          3,
          2000
        );

        allAds.push(...ads);
        page++;

        if (!hasMore) break;

        // Polite delay between pages
        await new Promise((r) => setTimeout(r, 400));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[tiktok] Failed industry=${industryId} page=${page}: ${msg}`);
        break;
      }
    }

    // Delay between industries
    await new Promise((r) => setTimeout(r, 600));
  }

  console.log(`[tiktok] Fetched ${allAds.length} ads — processing...`);

  const batch = await processAdBatch(allAds.slice(0, limit), dryRun);

  return {
    source:      "tiktok",
    created:     batch.created,
    updated:     batch.updated,
    skipped:     batch.skipped,
    errors:      batch.errors,
    duration_ms: Date.now() - start,
    messages:    batch.messages,
  };
}

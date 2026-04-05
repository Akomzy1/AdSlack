/**
 * metaIngester.ts
 *
 * Fetches active ecommerce ads from the Meta Ad Library API and normalizes
 * them to RawAdData for the Adsentify pipeline.
 *
 * Docs: https://developers.facebook.com/docs/graph-api/reference/ads_archive/
 *
 * Required env vars:
 *   META_ACCESS_TOKEN   — User or app access token with `ads_read` permission
 *   META_API_VERSION    — Optional, default "v19.0"
 *
 * Rate limits:
 *   The Graph API returns X-App-Usage / X-Ad-Account-Usage headers.
 *   We back off automatically when usage > 80%.
 */

import { withRetry } from "./normalizer";
import { processAdBatch } from "./normalizer";
import type { RawAdData, IngestionResult, IngesterOptions } from "./types";

// ─── Constants ────────────────────────────────────────────────────────────────

const API_VERSION = process.env.META_API_VERSION ?? "v19.0";
const BASE_URL    = `https://graph.facebook.com/${API_VERSION}/ads_archive`;

/** Ecommerce-adjacent search terms — one fetch per term, results are merged. */
const SEARCH_TERMS = [
  "skincare",
  "supplement",
  "fitness",
  "home decor",
  "pet",
  "gadget",
  "fashion",
  "course",
  "trading",
  "gaming",
  "kitchen",
  "beauty",
];

const FIELDS = [
  "id",
  "page_name",
  "ad_creative_bodies",
  "ad_creative_link_titles",
  "ad_creative_link_captions",
  "ad_delivery_start_time",
  "ad_delivery_stop_time",
  "publisher_platforms",
  "spend",
  "impressions",
  "estimated_audience_size",
].join(",");

// ─── Meta API response types ──────────────────────────────────────────────────

interface MetaSpendRange {
  lower_bound?: string;
  upper_bound?: string;
}

interface MetaAd {
  id: string;
  page_name?: string;
  ad_creative_bodies?: string[];
  ad_creative_link_titles?: string[];
  ad_creative_link_captions?: string[];
  ad_delivery_start_time?: string;   // "2024-01-15"
  ad_delivery_stop_time?: string | null;
  publisher_platforms?: string[];    // ["facebook", "instagram"]
  spend?: MetaSpendRange;
  impressions?: MetaSpendRange;
}

interface MetaPageResponse {
  data: MetaAd[];
  paging?: {
    cursors?: { after?: string };
    next?: string;
  };
  error?: { message: string; code: number };
}

// ─── Normalization ────────────────────────────────────────────────────────────

/** Map Meta platform string array → our Platform enum value (pick primary). */
function mapPlatform(platforms?: string[]): RawAdData["platform"] {
  if (!platforms || platforms.length === 0) return "FACEBOOK";
  if (platforms.includes("instagram") && !platforms.includes("facebook"))
    return "INSTAGRAM";
  return "FACEBOOK";
}

/** Parse Meta's date strings ("2024-01-15") into Date objects. */
function parseMetaDate(dateStr?: string | null): Date {
  if (!dateStr) return new Date();
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date() : d;
}

/** Parse a Meta spend/impressions range object into a number. */
function parseBound(val?: string): number | undefined {
  if (!val) return undefined;
  const n = parseInt(val, 10);
  return isNaN(n) ? undefined : n;
}

function normalizeMetaAd(raw: MetaAd, searchTerm: string): RawAdData | null {
  if (!raw.id || !raw.page_name) return null;

  const hookText = raw.ad_creative_bodies?.[0]?.trim() ?? undefined;
  const productName = raw.ad_creative_link_titles?.[0]?.trim() ?? undefined;
  const ctaText = raw.ad_creative_link_captions?.[0]?.trim() ?? undefined;

  const firstSeenAt = parseMetaDate(raw.ad_delivery_start_time);
  const stopTime    = raw.ad_delivery_stop_time;
  const lastSeenAt  = stopTime ? parseMetaDate(stopTime) : new Date();
  const isActive    = !stopTime;

  // Derive impressions as a proxy for views (Meta doesn't give exact view counts)
  const viewsLower  = parseBound(raw.impressions?.lower_bound) ?? 0;
  const viewsUpper  = parseBound(raw.impressions?.upper_bound) ?? viewsLower;
  const viewsEst    = Math.round((viewsLower + viewsUpper) / 2);

  return {
    externalId:        `meta_${raw.id}`,
    platform:          mapPlatform(raw.publisher_platforms),
    brandName:         raw.page_name,
    productName,
    adType:            "IMAGE",        // Ad Library doesn't expose type reliably
    country:           "US",
    language:          "en",
    hookText,
    ctaText,
    estimatedSpendMin: parseBound(raw.spend?.lower_bound),
    estimatedSpendMax: parseBound(raw.spend?.upper_bound),
    firstSeenAt,
    lastSeenAt,
    isActive,
    rawMetrics: {
      likes:    0,           // Meta Ad Library doesn't expose engagement
      comments: 0,
      shares:   0,
      views:    viewsEst,
    },
    rawNicheHint: searchTerm,
  };
}

// ─── Pagination fetcher ───────────────────────────────────────────────────────

interface FetchPageResult {
  ads: RawAdData[];
  nextCursor: string | null;
}

async function fetchPage(
  token: string,
  searchTerm: string,
  country: string,
  after?: string
): Promise<FetchPageResult> {
  const params = new URLSearchParams({
    access_token:        token,
    fields:              FIELDS,
    search_terms:        searchTerm,
    ad_active_status:    "ACTIVE",
    ad_reached_countries: JSON.stringify([country]),
    ad_type:             "ALL",
    limit:               "100",
    ...(after ? { after } : {}),
  });

  const url = `${BASE_URL}?${params.toString()}`;

  const res = await fetch(url, { next: { revalidate: 0 } });

  // Check app-usage rate limit header
  const usage = res.headers.get("x-app-usage");
  if (usage) {
    const parsed = JSON.parse(usage) as { call_count?: number; total_time?: number };
    const pct    = Math.max(parsed.call_count ?? 0, parsed.total_time ?? 0);
    if (pct > 80) {
      console.warn(`[meta] Rate limit at ${pct}% — sleeping 60s`);
      await new Promise((r) => setTimeout(r, 60_000));
    }
  }

  if (!res.ok) {
    throw new Error(`Meta API ${res.status}: ${await res.text()}`);
  }

  const body = (await res.json()) as MetaPageResponse;

  if (body.error) {
    throw new Error(`Meta API error ${body.error.code}: ${body.error.message}`);
  }

  const ads = (body.data ?? [])
    .map((raw) => normalizeMetaAd(raw, searchTerm))
    .filter((a): a is RawAdData => a !== null);

  const nextCursor = body.paging?.cursors?.after ?? null;
  const hasMore    = Boolean(body.paging?.next);

  return { ads, nextCursor: hasMore ? nextCursor : null };
}

// ─── Public runner ────────────────────────────────────────────────────────────

export async function runMetaIngestion(
  opts: IngesterOptions = {}
): Promise<IngestionResult> {
  const start = Date.now();
  const token = process.env.META_ACCESS_TOKEN;

  if (!token) {
    return {
      source: "meta",
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      duration_ms: Date.now() - start,
      messages: ["META_ACCESS_TOKEN not set — skipping Meta ingestion"],
    };
  }

  const country = opts.country ?? "US";
  const limit   = opts.limit   ?? 500;
  const dryRun  = opts.dryRun  ?? false;

  const allAds: RawAdData[] = [];

  for (const term of SEARCH_TERMS) {
    if (allAds.length >= limit) break;

    let cursor: string | undefined;
    let pagesFetched = 0;
    const maxPages = Math.ceil(limit / 100);

    while (pagesFetched < maxPages && allAds.length < limit) {
      try {
        const { ads, nextCursor } = await withRetry(
          () => fetchPage(token, term, country, cursor),
          3,
          2000
        );
        allAds.push(...ads);
        cursor = nextCursor ?? undefined;
        pagesFetched++;

        if (!nextCursor) break;

        // Polite delay between pages
        await new Promise((r) => setTimeout(r, 500));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[meta] Failed fetching term="${term}" page=${pagesFetched}: ${msg}`);
        break;
      }
    }

    // Polite delay between search terms
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`[meta] Fetched ${allAds.length} ads — processing...`);

  const batch = await processAdBatch(allAds.slice(0, limit), dryRun);

  return {
    source:      "meta",
    created:     batch.created,
    updated:     batch.updated,
    skipped:     batch.skipped,
    errors:      batch.errors,
    duration_ms: Date.now() - start,
    messages:    batch.messages,
  };
}

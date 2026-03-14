/**
 * Saturation Engine
 *
 * Detects duplicate/similar ads and computes a per-ad saturation score (0–100).
 * Runs as a cron every 12 hours.
 *
 * Duplication signals (any match records an AdDuplicate row):
 *   1. Hook text — Jaccard similarity of word tokens > 0.6
 *   2. Script structure — same hook→body→cta template (from AdAnatomy)
 *   3. Product match — same normalised product + same niche (Levenshtein ≥ 0.72)
 *   4. Landing page domain — identical registrable domain
 *
 * Saturation score formula:
 *   min(100, (duplicateAdvertiserCount * 2) + (duplicateCount * 0.5)
 *           + (duplicationGrowthRate * 10) + max(0, marketAge - 30))
 *
 * Saturation levels:
 *   0–20    Fresh
 *   21–45   Growing
 *   46–70   Crowded
 *   71–90   Saturated
 *   91–100  Oversaturated
 */

import { SimilarityType } from "@prisma/client";
import { db } from "@/lib/db";

// ── Types ────────────────────────────────────────────────────────────────────

export interface SaturationLevel {
  label: "Fresh" | "Growing" | "Crowded" | "Saturated" | "Oversaturated";
  color: string;  // Tailwind colour class
  range: [number, number];
}

export interface SaturationResult {
  processed:  number;
  duplicates: number;
  errors:     number;
  durationMs: number;
}

export interface AdSaturationDetail {
  adId:                   string;
  saturationScore:        number;
  level:                  SaturationLevel;
  duplicateCount:         number;
  duplicateAdvertiserCount: number;
  similarAds: Array<{
    id:             string;
    brandName:      string;
    similarityScore: number;
    similarityType:  SimilarityType;
    hookText:       string | null;
    thumbnailUrl:   string | null;
    niche:          string;
  }>;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Tokenise a string into a Set of lowercase word tokens. */
function tokenise(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2),
  );
}

/** Jaccard similarity: |A ∩ B| / |A ∪ B| */
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;

  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** Levenshtein-based similarity (0–1). */
function stringSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const na = a.toLowerCase().trim();
  const nb = b.toLowerCase().trim();
  if (na === nb) return 1;

  const m = na.length;
  const n = nb.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i]![j] =
        na[i - 1] === nb[j - 1]
          ? dp[i - 1]![j - 1]!
          : 1 + Math.min(dp[i - 1]![j]!, dp[i]![j - 1]!, dp[i - 1]![j - 1]!);
    }
  }
  const dist = dp[m]![n]!;
  return 1 - dist / Math.max(m, n);
}

/** Extract registrable domain (e.g., "brand.com") from a URL. */
function extractDomain(url: string | null | undefined): string {
  if (!url) return "";
  try {
    const { hostname } = new URL(
      url.startsWith("http") ? url : `https://${url}`,
    );
    const parts = hostname.replace(/^www\./, "").split(".");
    return parts.slice(-2).join(".");
  } catch {
    return "";
  }
}

/** Normalise a product name for fuzzy matching. */
function normaliseProduct(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(the|a|an|for|with|and|or|by|in|of|to)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Compute a pre-sorted token hash for an ad's hook text (for fast lookup). */
export function computeHookTextHash(hookText: string | null | undefined): string | null {
  if (!hookText) return null;
  const tokens = Array.from(tokenise(hookText)).sort();
  return tokens.join("|");
}

/** Derive saturation score from duplicate signals. */
function computeSaturationScore(
  duplicateCount:          number,
  duplicateAdvertiserCount: number,
  duplicationGrowthRate:   number,  // new duplicates detected this run vs. previous
  marketAgedays:           number,
): number {
  const score =
    duplicateAdvertiserCount * 2 +
    duplicateCount * 0.5 +
    duplicationGrowthRate * 10 +
    Math.max(0, marketAgedays - 30);
  return Math.min(100, Math.round(score * 10) / 10);
}

/** Map a 0–100 score to a human-readable saturation level. */
export function getSaturationLevel(score: number): SaturationLevel {
  if (score <= 20) return { label: "Fresh",        color: "text-emerald-400", range: [0, 20]   };
  if (score <= 45) return { label: "Growing",      color: "text-blue-400",    range: [21, 45]  };
  if (score <= 70) return { label: "Crowded",      color: "text-amber-400",   range: [46, 70]  };
  if (score <= 90) return { label: "Saturated",    color: "text-orange-400",  range: [71, 90]  };
  return              { label: "Oversaturated", color: "text-red-500",     range: [91, 100] };
}

// ── Duplicate detection ───────────────────────────────────────────────────────

type AdForSaturation = {
  id:               string;
  brandName:        string;
  productName:      string | null;
  niche:            string;
  hookText:         string | null;
  hookTextHash:     string | null;
  landingPageUrl:   string | null;
  firstSeenAt:      Date;
  duplicateCount:   number;
  duplicateAdvertiserCount: number;
  anatomy: {
    scriptStructure: unknown;
  } | null;
};

interface DuplicateHit {
  targetId:        string;
  brandName:       string;
  score:           number;
  type:            SimilarityType;
}

const JACCARD_THRESHOLD   = 0.6;
const LEVENSHTEIN_THRESHOLD = 0.72;

function detectDuplicates(
  source: AdForSaturation,
  candidates: AdForSaturation[],
): DuplicateHit[] {
  const hits: DuplicateHit[] = [];
  const seenIds = new Set<string>();

  const sourceDomain  = extractDomain(source.landingPageUrl);
  const sourceTokens  = source.hookText ? tokenise(source.hookText) : null;
  const sourceProduct = normaliseProduct(source.productName ?? source.brandName);
  const sourceScript  = source.anatomy?.scriptStructure
    ? JSON.stringify(source.anatomy.scriptStructure)
    : null;

  for (const cand of candidates) {
    if (cand.id === source.id) continue;
    if (seenIds.has(cand.id)) continue;

    // 1. Landing page domain match (strongest signal)
    const candDomain = extractDomain(cand.landingPageUrl);
    if (sourceDomain && candDomain && sourceDomain === candDomain) {
      hits.push({ targetId: cand.id, brandName: cand.brandName, score: 1.0, type: "LANDING_PAGE" });
      seenIds.add(cand.id);
      continue;
    }

    // 2. Hook text Jaccard similarity
    if (sourceTokens && sourceTokens.size > 0 && cand.hookText) {
      const candTokens = tokenise(cand.hookText);
      const jaccard    = jaccardSimilarity(sourceTokens, candTokens);
      if (jaccard >= JACCARD_THRESHOLD) {
        hits.push({ targetId: cand.id, brandName: cand.brandName, score: jaccard, type: "HOOK_TEXT" });
        seenIds.add(cand.id);
        continue;
      }
    }

    // 3. Script structure match (from AdAnatomy)
    if (sourceScript && cand.anatomy?.scriptStructure) {
      const candScript = JSON.stringify(cand.anatomy.scriptStructure);
      if (candScript === sourceScript) {
        hits.push({ targetId: cand.id, brandName: cand.brandName, score: 1.0, type: "SCRIPT_STRUCTURE" });
        seenIds.add(cand.id);
        continue;
      }
    }

    // 4. Product name fuzzy match within same niche
    if (source.niche === cand.niche) {
      const candProduct = normaliseProduct(cand.productName ?? cand.brandName);
      const sim = stringSimilarity(sourceProduct, candProduct);
      if (sim >= LEVENSHTEIN_THRESHOLD) {
        hits.push({ targetId: cand.id, brandName: cand.brandName, score: sim, type: "PRODUCT_MATCH" });
        seenIds.add(cand.id);
      }
    }
  }

  return hits;
}

// ── Batch runner ─────────────────────────────────────────────────────────────

const BATCH_SIZE = 200;

export async function runSaturationAnalysis(options: {
  niche?:    string;
  dryRun?:   boolean;
  batchSize?: number;
} = {}): Promise<SaturationResult> {
  const t0 = Date.now();
  const { niche, dryRun = false, batchSize = BATCH_SIZE } = options;

  let processed = 0;
  let duplicateRows = 0;
  let errors = 0;

  // Fetch ads for analysis
  const ads = await db.ad.findMany({
    where: {
      ...(niche ? { niche } : {}),
      OR: [
        { isActive: true },
        { lastSeenAt: { gte: new Date(Date.now() - 30 * 86_400_000) } },
      ],
    },
    select: {
      id:               true,
      brandName:        true,
      productName:      true,
      niche:            true,
      hookText:         true,
      hookTextHash:     true,
      landingPageUrl:   true,
      firstSeenAt:      true,
      duplicateCount:   true,
      duplicateAdvertiserCount: true,
      anatomy: {
        select: { scriptStructure: true },
      },
    },
    orderBy: { firstSeenAt: "asc" },
  }) as AdForSaturation[];

  // Process in batches
  for (let start = 0; start < ads.length; start += batchSize) {
    const batch = ads.slice(start, start + batchSize);

    for (const ad of batch) {
      try {
        // For performance, only compare against ads in same niche
        const nichePool = ads.filter((a) => a.niche === ad.niche);
        const hits = detectDuplicates(ad, nichePool);

        // Compute market age in days
        const marketAgeDays = Math.round(
          (Date.now() - ad.firstSeenAt.getTime()) / 86_400_000,
        );

        // Dedupe advertiser brands
        const uniqueBrands = new Set(hits.map((h) => h.brandName));
        const duplicateAdvertiserCount = uniqueBrands.size;
        const duplicateCount = hits.length;

        // Growth rate: new hits vs previously stored count
        const prevCount = ad.duplicateCount ?? 0;
        const growthRate = Math.max(0, duplicateCount - prevCount);

        const saturationScore = computeSaturationScore(
          duplicateCount,
          duplicateAdvertiserCount,
          growthRate,
          marketAgeDays,
        );

        // Update hookTextHash if missing
        const hookTextHash =
          ad.hookTextHash ?? computeHookTextHash(ad.hookText);

        if (!dryRun) {
          // Upsert AdDuplicate rows
          for (const hit of hits) {
            await db.adDuplicate.upsert({
              where: {
                sourceAdId_duplicateAdId_similarityType: {
                  sourceAdId:    ad.id,
                  duplicateAdId: hit.targetId,
                  similarityType: hit.type,
                },
              },
              update: { similarityScore: hit.score, detectedAt: new Date() },
              create: {
                sourceAdId:     ad.id,
                duplicateAdId:  hit.targetId,
                similarityScore: hit.score,
                similarityType:  hit.type,
              },
            });
            duplicateRows++;
          }

          // Update ad with saturation metrics
          await db.ad.update({
            where: { id: ad.id },
            data: {
              saturationScore,
              duplicateCount,
              duplicateAdvertiserCount,
              hookTextHash,
              saturationUpdatedAt: new Date(),
            },
          });
        }

        processed++;
      } catch (err) {
        errors++;
        console.error(`[saturation] Error processing ad ${ad.id}:`, err);
      }
    }
  }

  return { processed, duplicates: duplicateRows, errors, durationMs: Date.now() - t0 };
}

// ── Public: fetch saturation detail for a single ad ──────────────────────────

export async function getAdSaturationDetail(adId: string): Promise<AdSaturationDetail | null> {
  const ad = await db.ad.findUnique({
    where: { id: adId },
    select: {
      id:                       true,
      saturationScore:          true,
      duplicateCount:           true,
      duplicateAdvertiserCount: true,
      duplicatesAsSource: {
        take: 20,
        orderBy: { similarityScore: "desc" },
        select: {
          similarityScore: true,
          similarityType:  true,
          duplicateAd: {
            select: {
              id:          true,
              brandName:   true,
              hookText:    true,
              thumbnailUrl: true,
              niche:       true,
            },
          },
        },
      },
    },
  });

  if (!ad) return null;

  const score = ad.saturationScore ?? 0;
  return {
    adId:                   ad.id,
    saturationScore:        score,
    level:                  getSaturationLevel(score),
    duplicateCount:         ad.duplicateCount,
    duplicateAdvertiserCount: ad.duplicateAdvertiserCount,
    similarAds: ad.duplicatesAsSource.map((dup) => ({
      id:              dup.duplicateAd.id,
      brandName:       dup.duplicateAd.brandName,
      similarityScore: dup.similarityScore,
      similarityType:  dup.similarityType,
      hookText:        dup.duplicateAd.hookText,
      thumbnailUrl:    dup.duplicateAd.thumbnailUrl,
      niche:           dup.duplicateAd.niche,
    })),
  };
}

// ── Overview: market-wide saturation by niche ────────────────────────────────

export async function getSaturationOverview() {
  const niches = await db.ad.groupBy({
    by: ["niche"],
    where: {
      saturationScore: { not: null },
      isActive: true,
    },
    _avg: { saturationScore: true },
    _count: { id: true },
    _max: { saturationScore: true },
    orderBy: { _avg: { saturationScore: "desc" } },
    take: 20,
  });

  return niches.map((n) => ({
    niche:              n.niche,
    adCount:            n._count.id,
    avgSaturation:      Math.round((n._avg.saturationScore ?? 0) * 10) / 10,
    peakSaturation:     Math.round((n._max.saturationScore ?? 0) * 10) / 10,
    level:              getSaturationLevel(n._avg.saturationScore ?? 0),
  }));
}

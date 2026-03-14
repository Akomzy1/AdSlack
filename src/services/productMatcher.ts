/**
 * Product Matcher
 *
 * Groups ads into product clusters, then computes lifecycle data for each cluster.
 * Matching signals (priority order):
 *   1. Landing page domain — strongest signal (same store = same product line)
 *   2. Normalised product name — fuzzy Levenshtein match within a niche
 *   3. Niche + price range — secondary confirmation
 */

import { db } from "@/lib/db";
import {
  computeLifecycle,
  deriveTrendDirection,
  type LifecycleInput,
} from "./lifecycleEngine";

// ── Levenshtein Distance (no external dep) ─────────────────────────────────────

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i]![j] = dp[i - 1]![j - 1]!;
      } else {
        dp[i]![j] =
          1 + Math.min(dp[i - 1]![j]!, dp[i]![j - 1]!, dp[i - 1]![j - 1]!);
      }
    }
  }
  return dp[m]![n]!;
}

/** Normalise a product name for matching: lowercase, strip punctuation & filler words. */
function normalise(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(the|a|an|for|with|and|or|by|in|of|to)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Similarity ratio 0–1 (1 = identical). */
function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

/** Extract registrable domain from a URL string. Returns "" on failure. */
function extractDomain(url: string | null): string {
  if (!url) return "";
  try {
    const { hostname } = new URL(url.startsWith("http") ? url : `https://${url}`);
    // Strip www. prefix and take last two segments (registrable domain)
    const parts = hostname.replace(/^www\./, "").split(".");
    return parts.slice(-2).join(".");
  } catch {
    return "";
  }
}

/** Rough price midpoint from "estimatedSpendMin / Max" or null. */
function priceMidpoint(min: number | null, max: number | null): number | null {
  if (min == null && max == null) return null;
  if (min != null && max != null) return (min + max) / 2;
  return min ?? max;
}

// ── Cluster ───────────────────────────────────────────────────────────────────

interface AdRow {
  id: string;
  brandName: string;
  productName: string | null;
  niche: string;
  platform: string;
  landingPageUrl: string | null;
  estimatedSpendMin: number | null;
  estimatedSpendMax: number | null;
  velocityScore: number;
  daysRunning: number;
  isActive: boolean;
  firstSeenAt: Date;
  lastSeenAt: Date;
}

interface Cluster {
  key: string;              // canonical product name (normalised)
  productName: string;      // display name (most common raw name)
  niche: string;
  adIds: string[];
  brandNames: Set<string>;
  platforms: Map<string, number>;  // platform → ad count
  velocities: number[];
  daysRunningValues: number[];
  pricePoints: number[];
  firstDetectedAt: Date;
  lastSeenAt: Date;
}

/** SIMILARITY_THRESHOLD: 0.72 means names must be at least 72% similar to merge. */
const SIMILARITY_THRESHOLD = 0.72;

function buildClusters(ads: AdRow[]): Map<string, Cluster> {
  const clusters = new Map<string, Cluster>();

  // Keyed by domain (strong signal) and by niche+normalisedName (fuzzy)
  const domainIndex = new Map<string, string>();    // domain → clusterKey
  const nameIndex   = new Map<string, string[]>();  // niche → [clusterKeys]

  function createCluster(key: string, ad: AdRow, domain: string): Cluster {
    const c: Cluster = {
      key,
      productName: ad.productName ?? ad.brandName,
      niche: ad.niche,
      adIds: [ad.id],
      brandNames: new Set([ad.brandName]),
      platforms: new Map([[ad.platform, 1]]),
      velocities: [ad.velocityScore],
      daysRunningValues: [ad.daysRunning],
      pricePoints: [],
      firstDetectedAt: ad.firstSeenAt,
      lastSeenAt: ad.lastSeenAt,
    };
    const mid = priceMidpoint(ad.estimatedSpendMin, ad.estimatedSpendMax);
    if (mid != null) c.pricePoints.push(mid);

    if (domain) domainIndex.set(domain, key);

    const niched = nameIndex.get(ad.niche) ?? [];
    niched.push(key);
    nameIndex.set(ad.niche, niched);

    clusters.set(key, c);
    return c;
  }

  function mergeInto(c: Cluster, ad: AdRow): void {
    c.adIds.push(ad.id);
    c.brandNames.add(ad.brandName);
    c.platforms.set(ad.platform, (c.platforms.get(ad.platform) ?? 0) + 1);
    c.velocities.push(ad.velocityScore);
    c.daysRunningValues.push(ad.daysRunning);
    const mid = priceMidpoint(ad.estimatedSpendMin, ad.estimatedSpendMax);
    if (mid != null) c.pricePoints.push(mid);
    if (ad.firstSeenAt < c.firstDetectedAt) c.firstDetectedAt = ad.firstSeenAt;
    if (ad.lastSeenAt > c.lastSeenAt) c.lastSeenAt = ad.lastSeenAt;
  }

  for (const ad of ads) {
    const domain = extractDomain(ad.landingPageUrl);
    const normName = normalise(ad.productName ?? ad.brandName);

    // 1. Domain match — strongest signal
    if (domain && domainIndex.has(domain)) {
      const existingKey = domainIndex.get(domain)!;
      mergeInto(clusters.get(existingKey)!, ad);
      continue;
    }

    // 2. Fuzzy product name match within same niche
    const nicheKeys = nameIndex.get(ad.niche) ?? [];
    let matched = false;
    for (const cKey of nicheKeys) {
      const c = clusters.get(cKey)!;
      if (similarity(normName, c.key) >= SIMILARITY_THRESHOLD) {
        mergeInto(c, ad);
        if (domain) domainIndex.set(domain, cKey);
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // 3. New cluster
    const clusterKey = normName || ad.brandName.toLowerCase();
    createCluster(clusterKey, ad, domain);
  }

  return clusters;
}

// ── Lifecycle Input Builder ────────────────────────────────────────────────────

function clusterToLifecycleInput(
  cluster: Cluster,
  prevWeekAdvertiserCount: number,
  prevWeekAdCount: number,
): LifecycleInput {
  const now = Date.now();
  const daysInMarket = Math.round(
    (now - cluster.firstDetectedAt.getTime()) / 86_400_000
  );

  const avgVelocity =
    cluster.velocities.length > 0
      ? cluster.velocities.reduce((a, b) => a + b, 0) / cluster.velocities.length
      : 0;

  const adGrowthRate = cluster.adIds.length - prevWeekAdCount;
  const weekOverWeekAdvertiserChange = cluster.brandNames.size - prevWeekAdvertiserCount;

  const trendDirection = deriveTrendDirection(
    weekOverWeekAdvertiserChange,
    adGrowthRate,
  );

  return {
    uniqueAdvertiserCount: cluster.brandNames.size,
    totalAdCount: cluster.adIds.length,
    avgVelocity,
    daysInMarket,
    adGrowthRate,
    weekOverWeekAdvertiserChange,
    trendDirection,
  };
}

function topPlatform(platforms: Map<string, number>): string | null {
  let best: string | null = null;
  let bestCount = 0;
  for (const [p, n] of platforms) {
    if (n > bestCount) { bestCount = n; best = p; }
  }
  return best;
}

function formatPriceRange(points: number[]): string | null {
  if (points.length === 0) return null;
  const sorted = [...points].sort((a, b) => a - b);
  const lo = sorted[0]!;
  const hi = sorted[sorted.length - 1]!;
  if (Math.abs(hi - lo) < 5) return `$${Math.round(lo)}`;
  return `$${Math.round(lo)}–$${Math.round(hi)}`;
}

// ── Public: runProductMatching ─────────────────────────────────────────────────

export interface MatchingResult {
  upserted: number;
  linked: number;
  clusters: number;
  durationMs: number;
}

export async function runProductMatching(): Promise<MatchingResult> {
  const t0 = Date.now();

  // Fetch all ads (active + recently inactive)
  const ads = await db.ad.findMany({
    where: {
      OR: [
        { isActive: true },
        { lastSeenAt: { gte: new Date(Date.now() - 30 * 86_400_000) } },
      ],
    },
    select: {
      id: true,
      brandName: true,
      productName: true,
      niche: true,
      platform: true,
      landingPageUrl: true,
      estimatedSpendMin: true,
      estimatedSpendMax: true,
      velocityScore: true,
      daysRunning: true,
      isActive: true,
      firstSeenAt: true,
      lastSeenAt: true,
    },
  });

  const clusters = buildClusters(ads as AdRow[]);

  // Fetch previous week's snapshot from existing ProductInsight records
  const existingInsights = await db.productInsight.findMany({
    select: {
      id: true,
      productName: true,
      productCategory: true,
      uniqueAdvertiserCount: true,
      totalAdCount: true,
    },
  });

  const prevMap = new Map(
    existingInsights.map((p) => [
      normalise(p.productName),
      { advertisers: p.uniqueAdvertiserCount, ads: p.totalAdCount, id: p.id },
    ])
  );

  let upserted = 0;
  let linked = 0;
  const productInsightUpdates: Array<{ clusterKey: string; insightId: string }> = [];

  for (const [, cluster] of clusters) {
    const prev = prevMap.get(cluster.key) ?? { advertisers: cluster.brandNames.size, ads: cluster.adIds.length };

    const input = clusterToLifecycleInput(
      cluster,
      prev.advertisers,
      prev.ads,
    );

    const { stage, saturationScore, trendDirection } = computeLifecycle(input);

    const avgDaysRunning =
      cluster.daysRunningValues.length > 0
        ? cluster.daysRunningValues.reduce((a, b) => a + b, 0) / cluster.daysRunningValues.length
        : 0;

    const insight = await db.productInsight.upsert({
      where: {
        // We don't have a unique constraint on productName alone, so use findFirst + update pattern
        id: prevMap.get(cluster.key)?.id ?? "nonexistent",
      },
      update: {
        lifecycleStage: stage,
        saturationScore,
        totalAdCount:          cluster.adIds.length,
        uniqueAdvertiserCount: cluster.brandNames.size,
        avgDaysRunning:        Math.round(avgDaysRunning * 10) / 10,
        trendDirection,
        priceRange:   formatPriceRange(cluster.pricePoints),
        topPlatform:  topPlatform(cluster.platforms),
      },
      create: {
        productName:          cluster.productName,
        productCategory:      cluster.niche,
        lifecycleStage:       stage,
        saturationScore,
        firstDetectedAt:      cluster.firstDetectedAt,
        totalAdCount:          cluster.adIds.length,
        uniqueAdvertiserCount: cluster.brandNames.size,
        avgDaysRunning:        Math.round(avgDaysRunning * 10) / 10,
        trendDirection,
        priceRange:   formatPriceRange(cluster.pricePoints),
        topPlatform:  topPlatform(cluster.platforms),
      },
    });

    upserted++;
    productInsightUpdates.push({ clusterKey: cluster.key, insightId: insight.id });

    // Link ads to their ProductInsight in batches of 100
    const BATCH = 100;
    for (let i = 0; i < cluster.adIds.length; i += BATCH) {
      const batch = cluster.adIds.slice(i, i + BATCH);
      await db.ad.updateMany({
        where: { id: { in: batch } },
        data:  { productInsightId: insight.id },
      });
      linked += batch.length;
    }
  }

  return {
    upserted,
    linked,
    clusters: clusters.size,
    durationMs: Date.now() - t0,
  };
}

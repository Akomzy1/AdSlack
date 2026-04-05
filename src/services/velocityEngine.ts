/**
 * velocityEngine.ts
 *
 * Early Velocity Scoring Algorithm for Adsentify.
 *
 * Measures how fast an ad gains traction relative to its age and niche baseline,
 * predicting viral potential *before* it peaks.
 *
 * Design principles:
 *  - All core functions are pure (no I/O) → easy to unit test and reason about
 *  - The batch runner (recalculateAllVelocityScores) is the only Prisma-aware function
 *  - Scores are cached on the Ad row and refreshed every 6h by a cron job
 *  - The algorithm is designed to handle millions of ads efficiently via batch processing
 */

import type { VelocityResult, VelocityTier } from "@/types/ads";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MetricsPoint {
  likes: number;      // use Number(BigInt) before passing in
  comments: number;
  shares: number;
  views: number;
  recordedAt: Date;
}

export interface AdVelocityInput {
  adId: string;
  firstSeenAt: Date;
  niche: string;
  /** Ordered newest-first. Must have at least 1 record to produce a score. */
  metrics: MetricsPoint[];
}

export interface NicheBaseline {
  niche: string;
  mean: number;
  std: number;
  sampleSize: number;
}

// ─── Tier thresholds ──────────────────────────────────────────────────────────

export const TIER_THRESHOLDS = {
  EXPLOSIVE: 95,  // 🔥 growing 5x+ faster than niche average
  HIGH: 85,       // ⚡ growing 2–5x faster
  RISING: 70,     // 📈 above-average growth
  // < 70 → STEADY ➡️
} as const;

// ─── Pure math helpers ────────────────────────────────────────────────────────

/**
 * Map any real number to (0, 1) using the logistic function.
 * Values far from 0 saturate at 0 or 1.
 */
export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/**
 * Natural log of (n + 1). Prevents log(0) and dampens huge outliers.
 */
export function logp1(n: number): number {
  return Math.log(Math.max(0, n) + 1);
}

/** Total engagement (interactions) from a metrics snapshot. */
export function calcEngagement(m: MetricsPoint): number {
  return m.likes + m.shares + m.comments;
}

/**
 * Population standard deviation of a numeric array.
 * Returns 1 when there are fewer than 2 samples (prevents division by zero).
 */
export function stdDev(values: number[]): number {
  if (values.length < 2) return 1;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance) || 1; // guard against all-identical values
}

/**
 * Find the MetricsPoint whose recordedAt is closest to targetTime.
 * Used to look up "what was engagement N hours ago".
 */
export function findClosestMetrics(
  metrics: MetricsPoint[],
  targetTime: number
): MetricsPoint | null {
  if (metrics.length === 0) return null;

  let best: MetricsPoint | null = null;
  let bestDelta = Infinity;

  for (const m of metrics) {
    const delta = Math.abs(m.recordedAt.getTime() - targetTime);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = m;
    }
  }

  return best;
}

// ─── Core scoring functions ───────────────────────────────────────────────────

/**
 * Calculate raw (un-normalised) velocity for a single ad.
 *
 * Formula:
 *   velocity_raw = (Δengagement_24h / max(age_hours, 1)) * log(total_engagement + 1)
 *
 * Intuition:
 *  - Δengagement_24h / age_hours  → rate of acceleration per hour
 *  - × log(total_engagement + 1)  → weight by absolute audience reached
 *    (an ad with 1M engagements growing 10% is more significant than one with 10 growing 10%)
 */
export function calcVelocityRaw(
  deltaEngagement24h: number,
  adAgeHours: number,
  totalEngagement: number
): number {
  const safeAge = Math.max(adAgeHours, 1);
  const safeDelta = Math.max(deltaEngagement24h, 0);
  return (safeDelta / safeAge) * logp1(totalEngagement);
}

/**
 * Normalise a raw velocity score against the niche baseline.
 *
 * Formula:  (raw - niche_mean) / niche_std
 *
 * When std is 0 (single-ad niche), returns 0 (neutral).
 * When raw equals the mean, returns 0.
 * Positive values = above average; negative = below.
 */
export function normalizeVelocity(
  raw: number,
  baseline: NicheBaseline
): number {
  if (baseline.std <= 0) return 0;
  return (raw - baseline.mean) / baseline.std;
}

/**
 * Convert a normalised velocity value to a 0–100 score via sigmoid.
 *
 * sigmoid(0)  → 50  (exactly average)
 * sigmoid(2)  → ~88 (2 std deviations above average → HIGH tier)
 * sigmoid(-2) → ~12 (2 std deviations below → very STEADY)
 */
export function toVelocityScore(normalized: number): number {
  return Math.round(sigmoid(normalized) * 100);
}

/** Classify a 0–100 score into a VelocityTier. */
export function classifyTier(score: number): VelocityTier {
  if (score >= TIER_THRESHOLDS.EXPLOSIVE) return "EXPLOSIVE";
  if (score >= TIER_THRESHOLDS.HIGH) return "HIGH";
  if (score >= TIER_THRESHOLDS.RISING) return "RISING";
  return "STEADY";
}

// ─── Per-ad scorer ────────────────────────────────────────────────────────────

/**
 * Score a single ad given its metrics time-series and pre-computed niche baseline.
 *
 * @param input   - Ad data + metrics (newest-first)
 * @param baseline - Pre-computed niche mean/std (pass a neutral baseline for isolated scoring)
 */
export function scoreAd(
  input: AdVelocityInput,
  baseline: NicheBaseline
): VelocityResult {
  const now = Date.now();
  const latest = input.metrics[0];

  // An ad with no metrics stays at 0
  if (!latest) {
    return {
      score: 0,
      tier: "STEADY",
      velocityRaw: 0,
      velocityNormalized: 0,
      deltaEngagement24h: 0,
      deltaEngagement72h: 0,
      adAgeHours: 0,
      totalEngagement: 0,
    };
  }

  const adAgeHours = Math.max(
    1,
    (now - input.firstSeenAt.getTime()) / (1000 * 60 * 60)
  );

  const totalEngagement = calcEngagement(latest);

  // Δ engagement vs 24h ago
  const target24h = now - 24 * 60 * 60 * 1000;
  const point24h = findClosestMetrics(input.metrics, target24h);
  const engagement24hAgo = point24h ? calcEngagement(point24h) : 0;
  const deltaEngagement24h = Math.max(0, totalEngagement - engagement24hAgo);

  // Δ engagement vs 72h ago (informational, not used in score but exposed for UI)
  const target72h = now - 72 * 60 * 60 * 1000;
  const point72h = findClosestMetrics(input.metrics, target72h);
  const engagement72hAgo = point72h ? calcEngagement(point72h) : 0;
  const deltaEngagement72h = Math.max(0, totalEngagement - engagement72hAgo);

  const velocityRaw = calcVelocityRaw(deltaEngagement24h, adAgeHours, totalEngagement);
  const velocityNormalized = normalizeVelocity(velocityRaw, baseline);
  const score = toVelocityScore(velocityNormalized);
  const tier = classifyTier(score);

  return {
    score,
    tier,
    velocityRaw,
    velocityNormalized,
    deltaEngagement24h,
    deltaEngagement72h,
    adAgeHours,
    totalEngagement,
  };
}

// ─── Niche baseline calculator ────────────────────────────────────────────────

/**
 * Compute the mean and standard deviation of raw velocity scores for a niche.
 * Call this once per niche before scoring individual ads.
 *
 * @param rawScores - Array of raw velocity values for all ads in this niche
 */
export function calcNicheBaseline(
  niche: string,
  rawScores: number[]
): NicheBaseline {
  if (rawScores.length === 0) {
    return { niche, mean: 0, std: 1, sampleSize: 0 };
  }

  const mean = rawScores.reduce((a, b) => a + b, 0) / rawScores.length;
  const std = stdDev(rawScores);

  return { niche, mean, std, sampleSize: rawScores.length };
}

// ─── Batch runner (Prisma-aware) ──────────────────────────────────────────────

export interface BatchResult {
  updated: number;
  skipped: number;
  errors: number;
  duration_ms: number;
  nicheBaselines: Record<string, NicheBaseline>;
}

/**
 * Recalculate velocity scores for all active ads.
 *
 * Strategy (optimised for large datasets):
 *  1. Fetch all active ads with their last 72h of metrics (single query)
 *  2. Compute raw velocity for every ad
 *  3. Group by niche → compute baseline per niche
 *  4. Normalise + sigmoid → final score
 *  5. Batch-update the DB in chunks of 100 (avoids transaction timeouts)
 *
 * For millions of ads this function should be sharded by niche or paginated —
 * add a `niche?: string` parameter to scope the cron to one niche at a time.
 */
export async function recalculateAllVelocityScores(opts?: {
  niche?: string;
  batchSize?: number;
  dryRun?: boolean;
}): Promise<BatchResult> {
  // Lazy-import Prisma so pure functions remain testable without DB
  const { db } = await import("@/lib/db");

  const start = Date.now();
  const batchSize = opts?.batchSize ?? 100;
  const dryRun = opts?.dryRun ?? false;

  const cutoff72h = new Date(Date.now() - 72 * 60 * 60 * 1000);

  // ── 1. Fetch ads with recent metrics ──────────────────────────────────────
  const ads = await db.ad.findMany({
    where: {
      isActive: true,
      ...(opts?.niche ? { niche: opts.niche } : {}),
    },
    select: {
      id: true,
      niche: true,
      firstSeenAt: true,
      metrics: {
        where: { recordedAt: { gte: cutoff72h } },
        orderBy: { recordedAt: "desc" },
        select: {
          likes: true,
          comments: true,
          shares: true,
          views: true,
          recordedAt: true,
        },
      },
    },
  });

  if (ads.length === 0) {
    return { updated: 0, skipped: 0, errors: 0, duration_ms: Date.now() - start, nicheBaselines: {} };
  }

  // ── 2. Compute raw velocity per ad ────────────────────────────────────────
  const adInputs: AdVelocityInput[] = ads.map((ad) => ({
    adId: ad.id,
    firstSeenAt: ad.firstSeenAt,
    niche: ad.niche,
    metrics: ad.metrics.map((m) => ({
      likes: Number(m.likes),
      comments: Number(m.comments),
      shares: Number(m.shares),
      views: Number(m.views),
      recordedAt: m.recordedAt,
    })),
  }));

  // Raw velocity keyed by adId (needed for baseline calculation)
  const rawByAdId = new Map<string, number>();
  for (const input of adInputs) {
    const latest = input.metrics[0];
    if (!latest) continue;
    const age = Math.max(1, (Date.now() - input.firstSeenAt.getTime()) / (1000 * 60 * 60));
    const total = calcEngagement(latest);
    const target24h = Date.now() - 24 * 60 * 60 * 1000;
    const past = findClosestMetrics(input.metrics, target24h);
    const delta = Math.max(0, total - (past ? calcEngagement(past) : 0));
    rawByAdId.set(input.adId, calcVelocityRaw(delta, age, total));
  }

  // ── 3. Compute per-niche baselines ────────────────────────────────────────
  const nicheRaws = new Map<string, number[]>();
  for (const input of adInputs) {
    const raw = rawByAdId.get(input.adId) ?? 0;
    const list = nicheRaws.get(input.niche) ?? [];
    list.push(raw);
    nicheRaws.set(input.niche, list);
  }

  const baselines: Record<string, NicheBaseline> = {};
  for (const [niche, raws] of nicheRaws) {
    baselines[niche] = calcNicheBaseline(niche, raws);
  }

  // ── 4. Score every ad ─────────────────────────────────────────────────────
  const updates: { id: string; velocityScore: number; velocityTier: string }[] = [];

  for (const input of adInputs) {
    const baseline = baselines[input.niche] ?? calcNicheBaseline(input.niche, []);
    const result = scoreAd(input, baseline);
    updates.push({
      id: input.adId,
      velocityScore: result.score,
      velocityTier: result.tier,
    });
  }

  // ── 5. Batch-update the DB ────────────────────────────────────────────────
  let updated = 0;
  let errors = 0;
  const velocityUpdatedAt = new Date();

  if (!dryRun) {
    for (let i = 0; i < updates.length; i += batchSize) {
      const chunk = updates.slice(i, i + batchSize);
      try {
        await db.$transaction(
          chunk.map((u) =>
            db.ad.update({
              where: { id: u.id },
              data: {
                velocityScore: u.velocityScore,
                velocityTier: u.velocityTier,
                velocityUpdatedAt,
              },
            })
          )
        );
        updated += chunk.length;
      } catch (err) {
        console.error(`Velocity batch update failed for chunk at index ${i}:`, err);
        errors += chunk.length;
      }
    }
  } else {
    updated = updates.length;
  }

  return {
    updated,
    skipped: ads.length - updated - errors,
    errors,
    duration_ms: Date.now() - start,
    nicheBaselines: baselines,
  };
}

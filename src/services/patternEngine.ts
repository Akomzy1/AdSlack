/**
 * Pattern Engine
 *
 * Analyses AdAnatomy records to detect recurring creative structural patterns
 * across ads. Groups ads by a "fingerprint" (hookType + scriptFormula + adType),
 * scores virality, determines lifecycle status, and auto-generates human-readable
 * pattern names.
 *
 * Virality formula:
 *   avgVelocity * ln(nicheSpread + 1) * ln(growthRate + 1) / ln(patternAgeDays + 2)
 *
 * Called by POST /api/admin/recalculate-patterns (cron: every 6 hours)
 */

import { PatternStatus } from "@prisma/client";
import { db } from "@/lib/db";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PatternResult {
  detected: number;   // total patterns found
  upserted: number;   // created or updated in DB
  durationMs: number;
}

interface ScriptStructureJson {
  formula?: string;
  stages?: unknown[];
}

interface AdAnatomyRow {
  adId: string;
  hookType: string | null;
  emotionalTriggers: unknown;
  scriptStructure: unknown;
  ad: {
    adType: string;
    niche: string;
    velocityScore: number;
    firstSeenAt: Date;
    hookType: string | null;
  };
  latestMetrics: {
    likes: bigint;
    comments: bigint;
    shares: bigint;
  } | null;
}

interface PatternCluster {
  fingerprint: string;     // hookType|formula|adType
  hookType: string;
  formula: string;
  adType: string;
  adIds: string[];
  niches: Set<string>;
  velocities: number[];
  engagements: number[];
  allTriggers: string[];
  firstSeenAt: Date;
}

// ── Hook-type label map ───────────────────────────────────────────────────────

const HOOK_LABELS: Record<string, string> = {
  CURIOSITY_GAP:     "Curiosity Gap",
  PAIN_POINT:        "Pain Point",
  SOCIAL_PROOF:      "Social Proof",
  PATTERN_INTERRUPT: "Pattern Interrupt",
  BOLD_CLAIM:        "Bold Claim",
  QUESTION:          "Question Hook",
  STORY:             "Story",
  TUTORIAL:          "Tutorial",
  OFFER:             "Offer Lead",
  FEAR:              "Fear Trigger",
};

// Formula segment → readable label
const FORMULA_SEGMENT_LABELS: Record<string, string> = {
  hook:      "Hook",
  problem:   "Problem",
  demo:      "Demo",
  solution:  "Solution",
  proof:     "Social Proof",
  cta:       "CTA",
  story:     "Story Arc",
  reveal:    "Unexpected Reveal",
  offer:     "Offer",
  urgency:   "Urgency",
  tutorial:  "Tutorial",
  result:    "Results",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function normaliseFormula(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\s*→\s*/g, "→")
    .replace(/\s*->\s*/g, "→")
    .replace(/\s*>\s*/g, "→")
    .replace(/[^a-z→_]/g, "")
    .split("→")
    .filter(Boolean)
    .join("→");
}

function extractEmotionalTriggers(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return (raw as unknown[]).filter((t): t is string => typeof t === "string");
}

function computeEngagement(row: AdAnatomyRow): number {
  const m = row.latestMetrics;
  if (!m) return 0;
  return Number(m.likes + m.comments * 2n + m.shares * 3n);
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? (sorted[mid] ?? 0)
    : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}

function topN<T>(arr: T[], n: number): T[] {
  return arr.slice(0, n);
}

function mostCommon(arr: string[]): string[] {
  const freq = new Map<string, number>();
  for (const item of arr) freq.set(item, (freq.get(item) ?? 0) + 1);
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k);
}

/**
 * Auto-generate a descriptive pattern name from its components.
 * e.g. "Pain Point + Problem → Demo → Unexpected Reveal"
 */
function generatePatternName(hookType: string, formula: string): string {
  const hookLabel = HOOK_LABELS[hookType] ?? hookType.replace(/_/g, " ");
  const segments = formula.split("→").map(
    (s) => FORMULA_SEGMENT_LABELS[s] ?? s.charAt(0).toUpperCase() + s.slice(1)
  );

  // Deduplicate consecutive same segments
  const uniqueSegs = segments.filter((s, i) => i === 0 || s !== segments[i - 1]);

  if (uniqueSegs.length <= 1) return hookLabel;
  // Drop the first segment if it maps to the hookType to avoid repetition
  const restSegs = uniqueSegs[0]?.toLowerCase() === hookLabel.toLowerCase()
    ? uniqueSegs.slice(1)
    : uniqueSegs;

  if (restSegs.length === 0) return hookLabel;
  return `${hookLabel} + ${restSegs.join(" → ")}`;
}

/**
 * Virality score:
 *   avgVelocity * ln(nicheSpread + 1) * ln(|growthRate| + 1) / ln(ageDays + 2)
 * Capped at 100.
 */
function computeViralityScore(
  avgVelocity: number,
  nicheSpread: number,
  growthRate: number,
  firstSeenAt: Date,
): number {
  const ageDays = Math.max(
    1,
    (Date.now() - firstSeenAt.getTime()) / 86_400_000
  );
  const raw =
    (avgVelocity * Math.log(nicheSpread + 1) * Math.log(Math.abs(growthRate) + 1)) /
    Math.log(ageDays + 2);
  return Math.min(100, Math.max(0, raw));
}

/**
 * Determine PatternStatus from metrics.
 * EMERGING  → young (< 7d) or < 10 ads
 * TRENDING  → growing fast (growthRate > 20%) or high virality (> 60)
 * PEAKED    → stable and old (≥ 14d, growthRate ≤ 5%, virality ≥ 40)
 * FADING    → declining (growthRate < -10%) or very old with low virality
 */
function determineStatus(
  growthRate: number,
  viralityScore: number,
  totalAds: number,
  firstSeenAt: Date,
): PatternStatus {
  const ageDays = (Date.now() - firstSeenAt.getTime()) / 86_400_000;

  if (ageDays < 7 || totalAds < 10) return PatternStatus.EMERGING;
  if (growthRate < -10 || (ageDays > 30 && viralityScore < 20)) return PatternStatus.FADING;
  if (growthRate > 20 || viralityScore > 60) return PatternStatus.TRENDING;
  if (ageDays >= 14 && growthRate <= 5 && viralityScore >= 40) return PatternStatus.PEAKED;
  return PatternStatus.TRENDING;
}

// ── Main ──────────────────────────────────────────────────────────────────────

export async function runPatternDetection(): Promise<PatternResult> {
  const start = Date.now();

  // Load all anatomy records for active, enriched ads
  const rows = await db.adAnatomy.findMany({
    where: {
      ad: { isActive: true, status: "CLASSIFIED" },
      scriptStructure: { not: null },
    },
    select: {
      adId: true,
      hookType: true,
      emotionalTriggers: true,
      scriptStructure: true,
      ad: {
        select: {
          adType: true,
          niche: true,
          velocityScore: true,
          firstSeenAt: true,
          hookType: true,
        },
      },
    },
    take: 10_000, // safety cap
  });

  // Augment with latest metrics for engagement calculation
  const adIds = rows.map((r) => r.adId);
  const latestMetricsRows = await db.adMetrics.findMany({
    where: { adId: { in: adIds } },
    orderBy: { recordedAt: "desc" },
    distinct: ["adId"],
    select: { adId: true, likes: true, comments: true, shares: true },
  });
  const metricsMap = new Map(latestMetricsRows.map((m) => [m.adId, m]));

  const enriched: AdAnatomyRow[] = rows.map((r) => ({
    ...r,
    ad: {
      ...r.ad,
      adType: r.ad.adType as string,
    },
    latestMetrics: metricsMap.get(r.adId) ?? null,
  }));

  // ── Build clusters by fingerprint ─────────────────────────────────────────
  const clusters = new Map<string, PatternCluster>();

  for (const row of enriched) {
    const ss = row.scriptStructure as ScriptStructureJson | null;
    const rawFormula = ss?.formula ?? "";
    if (!rawFormula) continue;

    const hookType = (row.hookType ?? row.ad.hookType ?? "UNKNOWN").toUpperCase();
    const formula = normaliseFormula(rawFormula);
    if (!formula || formula.split("→").length < 2) continue;

    const adType = row.ad.adType;
    const fingerprint = `${hookType}|${formula}|${adType}`;

    let cluster = clusters.get(fingerprint);
    if (!cluster) {
      cluster = {
        fingerprint,
        hookType,
        formula,
        adType,
        adIds: [],
        niches: new Set(),
        velocities: [],
        engagements: [],
        allTriggers: [],
        firstSeenAt: row.ad.firstSeenAt,
      };
      clusters.set(fingerprint, cluster);
    }

    cluster.adIds.push(row.adId);
    cluster.niches.add(row.ad.niche);
    cluster.velocities.push(row.ad.velocityScore);
    cluster.engagements.push(computeEngagement(row));
    cluster.allTriggers.push(...extractEmotionalTriggers(row.emotionalTriggers));

    if (row.ad.firstSeenAt < cluster.firstSeenAt) {
      cluster.firstSeenAt = row.ad.firstSeenAt;
    }
  }

  // Only persist patterns with at least 5 ads
  const significant = [...clusters.values()].filter((c) => c.adIds.length >= 5);

  // ── Load prior pattern records for growth rate calculation ────────────────
  const existingPatterns = await db.creativePattern.findMany({
    select: { id: true, hookType: true, scriptStructure: true, adType: true, totalAdsUsing: true },
  });
  const existingMap = new Map(
    existingPatterns.map((p) => [`${p.hookType}|${p.scriptStructure}|${p.adType}`, p])
  );

  let upserted = 0;

  for (const cluster of significant) {
    const avgVelocity =
      cluster.velocities.reduce((s, v) => s + v, 0) / cluster.velocities.length;
    const medEng = median(cluster.engagements);
    const nicheSpread = cluster.niches.size;
    const topTriggers = topN(mostCommon(cluster.allTriggers), 5);
    const exampleAdIds = topN(
      cluster.adIds
        .map((id, i) => ({ id, v: cluster.velocities[i] ?? 0 }))
        .sort((a, b) => b.v - a.v)
        .map((x) => x.id),
      5
    );

    const prior = existingMap.get(cluster.fingerprint);
    const priorCount = prior?.totalAdsUsing ?? cluster.adIds.length;
    const growthRate =
      priorCount > 0
        ? ((cluster.adIds.length - priorCount) / priorCount) * 100
        : 100;

    const viralityScore = computeViralityScore(
      avgVelocity,
      nicheSpread,
      growthRate,
      cluster.firstSeenAt,
    );

    const status = determineStatus(
      growthRate,
      viralityScore,
      cluster.adIds.length,
      cluster.firstSeenAt,
    );

    const patternName = generatePatternName(cluster.hookType, cluster.formula);

    await db.creativePattern.upsert({
      where: {
        id: prior?.id ?? "nonexistent",
      },
      create: {
        patternName,
        hookType: cluster.hookType,
        scriptStructure: cluster.formula,
        adType: cluster.adType,
        emotionalTriggers: topTriggers,
        avgVelocity,
        medianEngagement: medEng,
        nicheSpread: [...cluster.niches],
        totalAdsUsing: cluster.adIds.length,
        growthRate,
        viralityScore,
        exampleAdIds,
        status,
        firstDetectedAt: cluster.firstSeenAt,
      },
      update: {
        patternName,
        avgVelocity,
        medianEngagement: medEng,
        nicheSpread: [...cluster.niches],
        totalAdsUsing: cluster.adIds.length,
        growthRate,
        viralityScore,
        exampleAdIds,
        status,
        emotionalTriggers: topTriggers,
      },
    });

    upserted++;
  }

  return {
    detected: clusters.size,
    upserted,
    durationMs: Date.now() - start,
  };
}

// ── Metadata exported for UI ──────────────────────────────────────────────────

export const PATTERN_STATUS_META: Record<
  PatternStatus,
  { label: string; color: string; bg: string; border: string; emoji: string }
> = {
  EMERGING: {
    label: "Emerging",
    emoji: "🌱",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/30",
  },
  TRENDING: {
    label: "Trending",
    emoji: "🔥",
    color: "text-orange-400",
    bg: "bg-orange-400/10",
    border: "border-orange-400/30",
  },
  PEAKED: {
    label: "Peaked",
    emoji: "📈",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/30",
  },
  FADING: {
    label: "Fading",
    emoji: "📉",
    color: "text-slate-400",
    bg: "bg-slate-400/10",
    border: "border-slate-400/30",
  },
};

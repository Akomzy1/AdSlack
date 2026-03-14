/**
 * Product Lifecycle Engine
 *
 * Determines where a product sits in its market lifecycle based on
 * advertiser density, ad volume, velocity signals, and trend direction.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type LifecycleStage =
  | "HIDDEN_GEM"
  | "EARLY_SCALING"
  | "GROWTH"
  | "SATURATED"
  | "DYING";

export type TrendDirection = "RISING" | "STABLE" | "DECLINING";

export interface LifecycleInput {
  uniqueAdvertiserCount: number;
  totalAdCount: number;
  avgVelocity: number;             // 0–100 average velocity of ads in cluster
  daysInMarket: number;            // days since first ad was detected
  adGrowthRate: number;            // new ads added in the last 7 days
  weekOverWeekAdvertiserChange: number; // positive = growing, negative = shrinking
  trendDirection: TrendDirection;
}

export interface LifecycleResult {
  stage: LifecycleStage;
  saturationScore: number;         // 0–100
  trendDirection: TrendDirection;
  confidence: number;              // 0–1 how strongly signals align
  signals: Record<string, number>; // debug breakdown of scores per signal
}

// ── Stage Scoring ─────────────────────────────────────────────────────────────

/**
 * Each stage is scored 0–1 based on how well the input signals match.
 * The stage with the highest score wins; ties prefer the earlier stage.
 */
function scoreHiddenGem(i: LifecycleInput): number {
  let score = 0;
  // Strict advertiser cap
  if (i.uniqueAdvertiserCount < 5)   score += 0.35;
  else if (i.uniqueAdvertiserCount < 10) score += 0.10;
  // Low total volume
  if (i.totalAdCount < 20)           score += 0.25;
  else if (i.totalAdCount < 40)      score += 0.08;
  // Early signal: high velocity
  if (i.avgVelocity > 80)            score += 0.25;
  else if (i.avgVelocity > 65)       score += 0.10;
  // Very new
  if (i.daysInMarket < 14)           score += 0.15;
  else if (i.daysInMarket < 21)      score += 0.05;
  return Math.min(score, 1);
}

function scoreEarlyScaling(i: LifecycleInput): number {
  let score = 0;
  if (i.uniqueAdvertiserCount >= 5 && i.uniqueAdvertiserCount <= 25)  score += 0.30;
  else if (i.uniqueAdvertiserCount < 5 || i.uniqueAdvertiserCount <= 35) score += 0.10;
  if (i.totalAdCount >= 20 && i.totalAdCount <= 120)                  score += 0.25;
  else if (i.totalAdCount < 20 || i.totalAdCount <= 160)              score += 0.08;
  if (i.avgVelocity > 70)                                             score += 0.25;
  else if (i.avgVelocity > 55)                                        score += 0.10;
  if (i.daysInMarket >= 14 && i.daysInMarket <= 50)                   score += 0.20;
  else if (i.daysInMarket < 14 || i.daysInMarket <= 65)               score += 0.07;
  if (i.trendDirection === "RISING")                                  score += 0.00; // expected, no bonus
  return Math.min(score, 1);
}

function scoreGrowth(i: LifecycleInput): number {
  let score = 0;
  if (i.uniqueAdvertiserCount >= 20 && i.uniqueAdvertiserCount <= 90)  score += 0.30;
  else if (i.uniqueAdvertiserCount >= 10 && i.uniqueAdvertiserCount <= 120) score += 0.12;
  if (i.totalAdCount >= 100 && i.totalAdCount <= 550)                  score += 0.25;
  else if (i.totalAdCount >= 50 && i.totalAdCount <= 700)              score += 0.10;
  if (i.avgVelocity > 50)                                              score += 0.20;
  else if (i.avgVelocity > 35)                                         score += 0.08;
  if (i.daysInMarket >= 30 && i.daysInMarket <= 100)                   score += 0.15;
  else if (i.daysInMarket >= 20 && i.daysInMarket <= 130)              score += 0.05;
  if (i.trendDirection === "RISING" || i.trendDirection === "STABLE")  score += 0.10;
  return Math.min(score, 1);
}

function scoreSaturated(i: LifecycleInput): number {
  let score = 0;
  if (i.uniqueAdvertiserCount >= 80)       score += 0.30;
  else if (i.uniqueAdvertiserCount >= 50)  score += 0.15;
  if (i.totalAdCount >= 500)               score += 0.25;
  else if (i.totalAdCount >= 300)          score += 0.12;
  if (i.trendDirection === "DECLINING" || i.trendDirection === "STABLE") score += 0.20;
  if (i.daysInMarket >= 60)                score += 0.15;
  else if (i.daysInMarket >= 40)           score += 0.07;
  if (i.avgVelocity < 60)                  score += 0.10;
  return Math.min(score, 1);
}

function scoreDying(i: LifecycleInput): number {
  let score = 0;
  // Primary signal: advertiser count actively declining
  if (i.weekOverWeekAdvertiserChange < -3)       score += 0.35;
  else if (i.weekOverWeekAdvertiserChange < -1)  score += 0.20;
  else if (i.weekOverWeekAdvertiserChange < 0)   score += 0.08;
  // Low velocity
  if (i.avgVelocity < 30)        score += 0.30;
  else if (i.avgVelocity < 45)   score += 0.12;
  // Declining trend
  if (i.trendDirection === "DECLINING") score += 0.25;
  else if (i.trendDirection === "STABLE") score += 0.05;
  // Ad count declining (approximated by negative growth rate)
  if (i.adGrowthRate < 0)        score += 0.10;
  return Math.min(score, 1);
}

// ── Saturation Score (0–100) ──────────────────────────────────────────────────

/**
 * Weighted formula:
 *   40% advertiser density  (how many stores compete on this product)
 *   30% ad duplication      (how many ads exist — more = more saturated)
 *   30% trend penalty       (DECLINING=30, STABLE=15, RISING=0)
 */
function computeSaturationScore(i: LifecycleInput): number {
  // Normalise advertiser density (80+ = fully saturated)
  const advertiserDensity = Math.min(i.uniqueAdvertiserCount / 80, 1) * 40;

  // Normalise ad volume (500+ = fully saturated)
  const adDuplication = Math.min(i.totalAdCount / 500, 1) * 30;

  // Trend component
  const trendPenalty =
    i.trendDirection === "DECLINING" ? 30 :
    i.trendDirection === "STABLE"    ? 15 : 0;

  const raw = advertiserDensity + adDuplication + trendPenalty;
  return Math.round(Math.min(raw, 100) * 10) / 10; // 1 decimal place
}

// ── Trend Direction ────────────────────────────────────────────────────────────

export function deriveTrendDirection(
  weekOverWeekAdvertiserChange: number,
  adGrowthRate: number,
): TrendDirection {
  const combined = weekOverWeekAdvertiserChange * 0.6 + adGrowthRate * 0.4;
  if (combined > 1)   return "RISING";
  if (combined < -1)  return "DECLINING";
  return "STABLE";
}

// ── Public API ─────────────────────────────────────────────────────────────────

export function computeLifecycle(input: LifecycleInput): LifecycleResult {
  const scores = {
    DYING:         scoreDying(input),
    SATURATED:     scoreSaturated(input),
    HIDDEN_GEM:    scoreHiddenGem(input),
    EARLY_SCALING: scoreEarlyScaling(input),
    GROWTH:        scoreGrowth(input),
  };

  // Pick highest score; in a tie we pick in priority order:
  // DYING > SATURATED > GROWTH > EARLY_SCALING > HIDDEN_GEM
  const PRIORITY: LifecycleStage[] = [
    "DYING", "SATURATED", "GROWTH", "EARLY_SCALING", "HIDDEN_GEM",
  ];

  let bestStage: LifecycleStage = "GROWTH";
  let bestScore = -1;

  for (const stage of PRIORITY) {
    const s = scores[stage] ?? 0;
    if (s > bestScore) {
      bestScore = s;
      bestStage = stage;
    }
  }

  const saturationScore = computeSaturationScore(input);

  return {
    stage: bestStage,
    saturationScore,
    trendDirection: input.trendDirection,
    confidence: Math.round(bestScore * 100) / 100,
    signals: {
      hidden_gem:    Math.round(scores.HIDDEN_GEM    * 100),
      early_scaling: Math.round(scores.EARLY_SCALING * 100),
      growth:        Math.round(scores.GROWTH        * 100),
      saturated:     Math.round(scores.SATURATED     * 100),
      dying:         Math.round(scores.DYING         * 100),
    },
  };
}

// ── Human-readable labels ─────────────────────────────────────────────────────

export const STAGE_META: Record<LifecycleStage, {
  label: string;
  color: string;        // Tailwind text color
  bg: string;           // Tailwind bg color
  border: string;       // Tailwind border color
  emoji: string;
  warningThreshold?: boolean; // true = show warning on ad detail
}> = {
  HIDDEN_GEM: {
    label:   "Hidden Gem",
    color:   "text-emerald-400",
    bg:      "bg-emerald-400/10",
    border:  "border-emerald-400/30",
    emoji:   "💎",
  },
  EARLY_SCALING: {
    label:   "Early Scaling",
    color:   "text-sky-400",
    bg:      "bg-sky-400/10",
    border:  "border-sky-400/30",
    emoji:   "🚀",
  },
  GROWTH: {
    label:   "Growth",
    color:   "text-yellow-400",
    bg:      "bg-yellow-400/10",
    border:  "border-yellow-400/30",
    emoji:   "📈",
  },
  SATURATED: {
    label:   "Saturated",
    color:   "text-orange-400",
    bg:      "bg-orange-400/10",
    border:  "border-orange-400/30",
    emoji:   "⚠️",
    warningThreshold: true,
  },
  DYING: {
    label:   "Dying",
    color:   "text-red-400",
    bg:      "bg-red-400/10",
    border:  "border-red-400/30",
    emoji:   "📉",
    warningThreshold: true,
  },
};

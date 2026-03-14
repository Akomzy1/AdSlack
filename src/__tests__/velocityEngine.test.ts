/**
 * Unit tests for the Early Velocity Scoring Algorithm.
 *
 * All functions under test are pure — no Prisma, no network.
 * The batch runner (recalculateAllVelocityScores) is integration-tested separately.
 */

import {
  calcEngagement,
  calcNicheBaseline,
  calcVelocityRaw,
  classifyTier,
  findClosestMetrics,
  logp1,
  normalizeVelocity,
  scoreAd,
  sigmoid,
  stdDev,
  TIER_THRESHOLDS,
  toVelocityScore,
} from "@/services/velocityEngine";
import type { AdVelocityInput, MetricsPoint } from "@/services/velocityEngine";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeMetrics(
  overrides: Partial<MetricsPoint> & { minsAgo?: number } = {}
): MetricsPoint {
  const { minsAgo = 0, ...rest } = overrides;
  return {
    likes: 1000,
    comments: 100,
    shares: 200,
    views: 50000,
    recordedAt: new Date(Date.now() - minsAgo * 60 * 1000),
    ...rest,
  };
}

function makeInput(overrides: Partial<AdVelocityInput> = {}): AdVelocityInput {
  return {
    adId: "ad_test",
    firstSeenAt: new Date(Date.now() - 48 * 60 * 60 * 1000), // 2 days old
    niche: "skincare",
    metrics: [makeMetrics()],
    ...overrides,
  };
}

// ─── sigmoid ─────────────────────────────────────────────────────────────────

describe("sigmoid", () => {
  it("maps 0 to exactly 0.5", () => {
    expect(sigmoid(0)).toBeCloseTo(0.5, 10);
  });

  it("approaches 1 for very large positive input", () => {
    expect(sigmoid(100)).toBeCloseTo(1, 5);
  });

  it("approaches 0 for very large negative input", () => {
    expect(sigmoid(-100)).toBeCloseTo(0, 5);
  });

  it("is symmetric: sigmoid(x) + sigmoid(-x) === 1", () => {
    [-3, -1, 0, 1, 3, 10].forEach((x) => {
      expect(sigmoid(x) + sigmoid(-x)).toBeCloseTo(1, 10);
    });
  });

  it("is monotonically increasing", () => {
    const values = [-5, -2, -1, 0, 1, 2, 5];
    for (let i = 1; i < values.length; i++) {
      expect(sigmoid(values[i]!)).toBeGreaterThan(sigmoid(values[i - 1]!));
    }
  });
});

// ─── logp1 ───────────────────────────────────────────────────────────────────

describe("logp1", () => {
  it("returns 0 for input 0", () => {
    expect(logp1(0)).toBe(0);
  });

  it("handles negative input gracefully (clamps to 0)", () => {
    expect(logp1(-100)).toBe(0);
  });

  it("returns log(2) ≈ 0.693 for input 1", () => {
    expect(logp1(1)).toBeCloseTo(Math.log(2), 10);
  });

  it("grows sub-linearly (dampens outliers)", () => {
    expect(logp1(1_000_000)).toBeLessThan(20);
  });
});

// ─── stdDev ──────────────────────────────────────────────────────────────────

describe("stdDev", () => {
  it("returns 1 for single-element arrays (zero-division guard)", () => {
    expect(stdDev([42])).toBe(1);
  });

  it("returns 1 for empty array", () => {
    expect(stdDev([])).toBe(1);
  });

  it("returns 0→1 fallback for identical values", () => {
    expect(stdDev([5, 5, 5, 5])).toBe(1);
  });

  it("computes population std correctly", () => {
    // [2, 4, 4, 4, 5, 5, 7, 9] → mean=5, variance=4, std=2
    expect(stdDev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2, 5);
  });

  it("is always positive", () => {
    const result = stdDev([1, 2, 3, 100, -50]);
    expect(result).toBeGreaterThan(0);
  });
});

// ─── calcEngagement ──────────────────────────────────────────────────────────

describe("calcEngagement", () => {
  it("sums likes + shares + comments (excludes views)", () => {
    const m = makeMetrics({ likes: 500, shares: 200, comments: 50, views: 999999 });
    expect(calcEngagement(m)).toBe(750);
  });

  it("returns 0 for a zero-engagement snapshot", () => {
    const m = makeMetrics({ likes: 0, shares: 0, comments: 0, views: 0 });
    expect(calcEngagement(m)).toBe(0);
  });
});

// ─── findClosestMetrics ───────────────────────────────────────────────────────

describe("findClosestMetrics", () => {
  it("returns null for empty array", () => {
    expect(findClosestMetrics([], Date.now())).toBeNull();
  });

  it("returns the single element for a 1-item array", () => {
    const m = makeMetrics({ minsAgo: 30 });
    expect(findClosestMetrics([m], Date.now())).toBe(m);
  });

  it("returns the closest metric by time", () => {
    const m10 = makeMetrics({ minsAgo: 10, likes: 10 });
    const m60 = makeMetrics({ minsAgo: 60, likes: 60 });
    const m1440 = makeMetrics({ minsAgo: 1440, likes: 1440 }); // 24h ago

    const target = Date.now() - 55 * 60 * 1000; // 55 minutes ago
    const result = findClosestMetrics([m10, m60, m1440], target);
    expect(result).toBe(m60); // 60 min is closest to 55 min
  });

  it("handles future-dated metrics gracefully", () => {
    const future = makeMetrics({ minsAgo: -120 }); // 2h in the future
    const past = makeMetrics({ minsAgo: 30 });
    // Looking for "now" — past (30 min ago) is closer than 2h in the future
    const target = Date.now();
    const result = findClosestMetrics([future, past], target);
    expect(result).toBe(past);
  });
});

// ─── calcVelocityRaw ─────────────────────────────────────────────────────────

describe("calcVelocityRaw", () => {
  it("returns 0 when delta engagement is 0", () => {
    expect(calcVelocityRaw(0, 48, 10000)).toBe(0);
  });

  it("returns 0 when total engagement is 0", () => {
    // log(0 + 1) = 0, so result is 0
    expect(calcVelocityRaw(1000, 48, 0)).toBe(0);
  });

  it("uses adAgeHours=1 minimum (prevents division by zero)", () => {
    const r1 = calcVelocityRaw(1000, 0, 10000);
    const r2 = calcVelocityRaw(1000, 1, 10000);
    expect(r1).toBe(r2);
  });

  it("higher delta → higher raw score", () => {
    const low = calcVelocityRaw(100, 48, 5000);
    const high = calcVelocityRaw(10000, 48, 5000);
    expect(high).toBeGreaterThan(low);
  });

  it("older ads have lower raw score than newer ads with same delta", () => {
    const young = calcVelocityRaw(1000, 6, 5000);
    const old = calcVelocityRaw(1000, 200, 5000);
    expect(young).toBeGreaterThan(old);
  });

  it("clamps negative delta to 0 (declining ads don't go negative)", () => {
    expect(calcVelocityRaw(-500, 48, 5000)).toBe(0);
  });
});

// ─── normalizeVelocity ────────────────────────────────────────────────────────

describe("normalizeVelocity", () => {
  const baseline = { niche: "skincare", mean: 50, std: 10, sampleSize: 20 };

  it("returns 0 when raw equals the mean", () => {
    expect(normalizeVelocity(50, baseline)).toBe(0);
  });

  it("returns positive value when raw is above mean", () => {
    expect(normalizeVelocity(70, baseline)).toBeCloseTo(2, 5);
  });

  it("returns negative value when raw is below mean", () => {
    expect(normalizeVelocity(30, baseline)).toBeCloseTo(-2, 5);
  });

  it("returns 0 when std is 0 (single ad niche)", () => {
    const zeroStd = { niche: "niche", mean: 50, std: 0, sampleSize: 1 };
    expect(normalizeVelocity(99, zeroStd)).toBe(0);
  });
});

// ─── toVelocityScore ─────────────────────────────────────────────────────────

describe("toVelocityScore", () => {
  it("returns 50 for normalized=0 (exactly average)", () => {
    expect(toVelocityScore(0)).toBe(50);
  });

  it("returns a value in [0, 100]", () => {
    [-10, -3, -1, 0, 1, 3, 10].forEach((n) => {
      const s = toVelocityScore(n);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    });
  });

  it("is monotonically increasing", () => {
    const inputs = [-5, -2, -1, 0, 1, 2, 5];
    for (let i = 1; i < inputs.length; i++) {
      expect(toVelocityScore(inputs[i]!)).toBeGreaterThanOrEqual(
        toVelocityScore(inputs[i - 1]!)
      );
    }
  });

  it("returns an integer", () => {
    expect(Number.isInteger(toVelocityScore(1.5))).toBe(true);
  });
});

// ─── classifyTier ────────────────────────────────────────────────────────────

describe("classifyTier", () => {
  it("classifies EXPLOSIVE at or above threshold", () => {
    expect(classifyTier(TIER_THRESHOLDS.EXPLOSIVE)).toBe("EXPLOSIVE");
    expect(classifyTier(100)).toBe("EXPLOSIVE");
  });

  it("classifies HIGH between HIGH and EXPLOSIVE thresholds", () => {
    expect(classifyTier(TIER_THRESHOLDS.HIGH)).toBe("HIGH");
    expect(classifyTier(TIER_THRESHOLDS.EXPLOSIVE - 1)).toBe("HIGH");
  });

  it("classifies RISING between RISING and HIGH thresholds", () => {
    expect(classifyTier(TIER_THRESHOLDS.RISING)).toBe("RISING");
    expect(classifyTier(TIER_THRESHOLDS.HIGH - 1)).toBe("RISING");
  });

  it("classifies STEADY below RISING threshold", () => {
    expect(classifyTier(TIER_THRESHOLDS.RISING - 1)).toBe("STEADY");
    expect(classifyTier(0)).toBe("STEADY");
    expect(classifyTier(1)).toBe("STEADY");
  });
});

// ─── calcNicheBaseline ───────────────────────────────────────────────────────

describe("calcNicheBaseline", () => {
  it("returns a neutral baseline for empty input", () => {
    const b = calcNicheBaseline("skincare", []);
    expect(b.mean).toBe(0);
    expect(b.std).toBe(1);
    expect(b.sampleSize).toBe(0);
  });

  it("computes correct mean and std for known values", () => {
    // Scores: [10, 20, 30] → mean=20, std≈8.165
    const b = calcNicheBaseline("skincare", [10, 20, 30]);
    expect(b.mean).toBeCloseTo(20, 5);
    expect(b.std).toBeCloseTo(8.165, 2);
    expect(b.sampleSize).toBe(3);
  });

  it("preserves niche name", () => {
    const b = calcNicheBaseline("fitness", [1, 2, 3]);
    expect(b.niche).toBe("fitness");
  });
});

// ─── scoreAd ─────────────────────────────────────────────────────────────────

describe("scoreAd", () => {
  const neutralBaseline = { niche: "skincare", mean: 0, std: 1, sampleSize: 1 };

  it("returns score=50 and STEADY for a completely average ad (normalized=0)", () => {
    // With neutral baseline (mean=0, std=1), raw=0 → normalized=0 → score=50
    const input = makeInput({
      metrics: [makeMetrics({ likes: 0, shares: 0, comments: 0, views: 0 })],
    });
    const r = scoreAd(input, neutralBaseline);
    expect(r.score).toBe(50);
  });

  it("returns score=0 and STEADY when there are no metrics", () => {
    const input = makeInput({ metrics: [] });
    const r = scoreAd(input, neutralBaseline);
    expect(r.score).toBe(0);
    expect(r.tier).toBe("STEADY");
    expect(r.deltaEngagement24h).toBe(0);
  });

  it("assigns higher score to a rapidly growing ad vs. a flat one", () => {
    // Growing ad: big jump in 24h
    const growing = makeInput({
      metrics: [
        makeMetrics({ likes: 100000, comments: 10000, shares: 20000, minsAgo: 0 }),
        makeMetrics({ likes: 1000, comments: 100, shares: 200, minsAgo: 25 * 60 }), // 25h ago
      ],
    });

    // Flat ad: no growth
    const flat = makeInput({
      metrics: [
        makeMetrics({ likes: 1000, comments: 100, shares: 200, minsAgo: 0 }),
        makeMetrics({ likes: 1000, comments: 100, shares: 200, minsAgo: 25 * 60 }),
      ],
    });

    const rGrowing = scoreAd(growing, neutralBaseline);
    const rFlat = scoreAd(flat, neutralBaseline);
    expect(rGrowing.score).toBeGreaterThan(rFlat.score);
  });

  it("score is always between 0 and 100 (inclusive)", () => {
    const extremeCases: AdVelocityInput[] = [
      // Viral: massive engagement spike
      makeInput({
        metrics: [
          makeMetrics({ likes: 10_000_000, comments: 1_000_000, shares: 5_000_000, minsAgo: 0 }),
          makeMetrics({ likes: 0, comments: 0, shares: 0, minsAgo: 25 * 60 }),
        ],
      }),
      // Dead: zero engagement
      makeInput({
        metrics: [makeMetrics({ likes: 0, shares: 0, comments: 0, views: 0 })],
      }),
      // Very young ad
      makeInput({
        firstSeenAt: new Date(Date.now() - 5 * 60 * 1000), // 5 min old
        metrics: [makeMetrics()],
      }),
      // Very old ad (6 months)
      makeInput({
        firstSeenAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
        metrics: [makeMetrics()],
      }),
    ];

    extremeCases.forEach((input) => {
      const r = scoreAd(input, neutralBaseline);
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
    });
  });

  it("exposes deltaEngagement24h and deltaEngagement72h", () => {
    const now = Date.now();
    const input = makeInput({
      metrics: [
        makeMetrics({ likes: 10000, comments: 500, shares: 2000, minsAgo: 0 }),
        makeMetrics({ likes: 5000, comments: 300, shares: 1000, minsAgo: 25 * 60 }), // ~24h ago
        makeMetrics({ likes: 500, comments: 30, shares: 100, minsAgo: 74 * 60 }),   // ~72h ago
      ],
    });
    const r = scoreAd(input, neutralBaseline);
    // Current total: 12500, 24h ago: 6300 → delta ≈ 6200
    expect(r.deltaEngagement24h).toBeGreaterThan(0);
    expect(r.deltaEngagement72h).toBeGreaterThan(r.deltaEngagement24h);
  });

  it("classifies as EXPLOSIVE when score crosses threshold", () => {
    // Force a high normalized score by using a very low baseline
    const lowBaseline = { niche: "skincare", mean: 0, std: 0.0001, sampleSize: 100 };
    const viral = makeInput({
      metrics: [
        makeMetrics({ likes: 1_000_000, comments: 100_000, shares: 500_000, minsAgo: 0 }),
        makeMetrics({ likes: 0, comments: 0, shares: 0, minsAgo: 25 * 60 }),
      ],
    });
    const r = scoreAd(viral, lowBaseline);
    expect(r.tier).toBe("EXPLOSIVE");
    expect(r.score).toBeGreaterThanOrEqual(TIER_THRESHOLDS.EXPLOSIVE);
  });

  it("tier matches score band for every threshold boundary", () => {
    // Test that tier and score are always consistent
    const cases = [
      { score: 0, expected: "STEADY" },
      { score: 69, expected: "STEADY" },
      { score: 70, expected: "RISING" },
      { score: 84, expected: "RISING" },
      { score: 85, expected: "HIGH" },
      { score: 94, expected: "HIGH" },
      { score: 95, expected: "EXPLOSIVE" },
      { score: 100, expected: "EXPLOSIVE" },
    ] as const;

    cases.forEach(({ score, expected }) => {
      expect(classifyTier(score)).toBe(expected);
    });
  });
});

// ─── Integration: full pipeline ───────────────────────────────────────────────

describe("full scoring pipeline", () => {
  it("gives a brand-new viral ad a higher score than an old dormant one in the same niche", () => {
    const now = Date.now();

    const viralNew: AdVelocityInput = {
      adId: "viral",
      firstSeenAt: new Date(now - 6 * 60 * 60 * 1000), // 6h old
      niche: "skincare",
      metrics: [
        {
          likes: 500_000,
          comments: 50_000,
          shares: 100_000,
          views: 10_000_000,
          recordedAt: new Date(now),
        },
        {
          likes: 1_000,
          comments: 100,
          shares: 200,
          views: 20_000,
          recordedAt: new Date(now - 25 * 60 * 60 * 1000),
        },
      ],
    };

    const dormantOld: AdVelocityInput = {
      adId: "dormant",
      firstSeenAt: new Date(now - 90 * 24 * 60 * 60 * 1000), // 90 days old
      niche: "skincare",
      metrics: [
        {
          likes: 5_000,
          comments: 200,
          shares: 300,
          views: 100_000,
          recordedAt: new Date(now),
        },
        {
          likes: 4_800,
          comments: 195,
          shares: 295,
          views: 98_000,
          recordedAt: new Date(now - 25 * 60 * 60 * 1000),
        },
      ],
    };

    // Compute raw scores to build a real niche baseline
    const niches = [viralNew, dormantOld];
    const rawScores = niches.map((ad) => {
      const latest = ad.metrics[0]!;
      const age = Math.max(1, (now - ad.firstSeenAt.getTime()) / (1000 * 60 * 60));
      const total = calcEngagement(latest);
      const past = findClosestMetrics(ad.metrics, now - 24 * 60 * 60 * 1000);
      const delta = Math.max(0, total - (past ? calcEngagement(past) : 0));
      return calcVelocityRaw(delta, age, total);
    });

    const baseline = calcNicheBaseline("skincare", rawScores);
    const rViral = scoreAd(viralNew, baseline);
    const rDormant = scoreAd(dormantOld, baseline);

    expect(rViral.score).toBeGreaterThan(rDormant.score);
    expect(rViral.tier).not.toBe("STEADY");
  });

  it("produces consistent results for identical inputs", () => {
    const baseline = { niche: "skincare", mean: 100, std: 50, sampleSize: 50 };
    const input = makeInput({
      metrics: [
        makeMetrics({ likes: 50000, comments: 5000, shares: 10000, minsAgo: 0 }),
        makeMetrics({ likes: 10000, comments: 1000, shares: 2000, minsAgo: 25 * 60 }),
      ],
    });

    const r1 = scoreAd(input, baseline);
    const r2 = scoreAd(input, baseline);
    expect(r1.score).toBe(r2.score);
    expect(r1.tier).toBe(r2.tier);
  });
});

/**
 * _lib.ts — Shared utilities for all /api/ads/[id]/remix/* routes.
 *
 * Provides:
 *   - fetchRemixContext()  — load ad + anatomy from DB, normalise to engine input types
 *   - isRateLimited()      — sliding-window rate limit check via UsageLog
 */

import { db } from "@/lib/db";
import type { RemixAdInput, RemixAnatomyInput } from "@/services/remixEngine";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RemixContext {
  ad:      RemixAdInput;
  anatomy: RemixAnatomyInput | null;
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

/**
 * Load an ad and its anatomy from the database and normalise both into
 * the engine's input types. Returns null if the ad doesn't exist.
 */
export async function fetchRemixContext(adId: string): Promise<RemixContext | null> {
  const ad = await db.ad.findUnique({
    where: { id: adId },
    include: {
      anatomy: true,
      metrics: {
        orderBy: { recordedAt: "desc" },
        take: 1,
        select: { views: true, likes: true, comments: true, shares: true },
      },
    },
  });

  if (!ad) return null;

  const remixAd: RemixAdInput = {
    id:                ad.id,
    platform:          ad.platform,
    brandName:         ad.brandName,
    productName:       ad.productName,
    niche:             ad.niche,
    adType:            ad.adType,
    duration:          ad.duration,
    hookText:          ad.hookText,
    hookType:          ad.hookType ?? null,
    ctaText:           ad.ctaText,
    daysRunning:       ad.daysRunning,
    velocityScore:     ad.velocityScore,
    velocityTier:      ad.velocityTier,
    estimatedSpendMin: ad.estimatedSpendMin,
    estimatedSpendMax: ad.estimatedSpendMax,
  };

  let anatomy: RemixAnatomyInput | null = null;

  if (ad.anatomy) {
    const a = ad.anatomy;

    const triggers = Array.isArray(a.emotionalTriggers)
      ? (a.emotionalTriggers as string[])
      : [];

    const scriptStructure = a.scriptStructure
      ? (a.scriptStructure as RemixAnatomyInput["scriptStructure"])
      : null;

    const fullScriptBreakdown = a.fullScript
      ? (() => {
          try {
            return JSON.parse(a.fullScript) as RemixAnatomyInput["fullScriptBreakdown"];
          } catch {
            return null;
          }
        })()
      : null;

    anatomy = {
      hookScore:           a.hookScore ?? null,
      emotionalTriggers:   triggers,
      scriptStructure,
      targetPsychology:    a.targetPsychology ?? null,
      audioMood:           a.audioMood ?? null,
      pacingNotes:         a.pacingNotes ?? null,
      funnelType:          a.funnelType ?? null,
      fullScriptBreakdown,
    };
  }

  return { ad: remixAd, anatomy };
}

// ─── Rate limiting ────────────────────────────────────────────────────────────

/**
 * Sliding-window rate limit check.
 * Counts how many times the user has triggered `action` in the past `windowMs`.
 * Returns true if they've hit or exceeded `limit` — caller should return 429.
 *
 * Uses the UsageLog table so it's consistent across serverless instances.
 */
export async function isRateLimited(
  userId:    string,
  action:    string,
  limit:     number = 5,
  windowMs:  number = 60_000,
): Promise<boolean> {
  const since = new Date(Date.now() - windowMs);

  const count = await db.usageLog.count({
    where: {
      userId,
      action,
      createdAt: { gte: since },
    },
  });

  return count >= limit;
}

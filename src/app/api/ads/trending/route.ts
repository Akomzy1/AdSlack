/**
 * GET /api/ads/trending
 *
 * Returns the top 20 active ads ordered by cached velocityScore DESC.
 * Optionally scoped by niche or platform.
 *
 * Uses the pre-computed velocityScore column (indexed) — O(log n) regardless of dataset size.
 * Scores are refreshed every 6h by the /api/cron/velocity job.
 *
 * Query params:
 *   niche     - filter by niche slug (optional)
 *   platform  - TIKTOK | FACEBOOK | INSTAGRAM | YOUTUBE (optional)
 *   tier      - EXPLOSIVE | HIGH | RISING | STEADY (optional, multi: "EXPLOSIVE,HIGH")
 *   limit     - max results (default 20, max 50)
 */

import type { Platform } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import type { AdWithMetrics } from "@/types/ads";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const niche = searchParams.get("niche") ?? undefined;
  const platform = (searchParams.get("platform") ?? undefined) as Platform | undefined;
  const tiers = (searchParams.get("tier") ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20", 10));

  const ads = await db.ad.findMany({
    where: {
      isActive: true,
      ...(niche ? { niche } : {}),
      ...(platform ? { platform } : {}),
      ...(tiers.length > 0 ? { velocityTier: { in: tiers } } : {}),
    },
    orderBy: { velocityScore: "desc" },
    take: limit,
    include: {
      metrics: {
        orderBy: { recordedAt: "desc" },
        take: 1,
        select: {
          likes: true,
          comments: true,
          shares: true,
          views: true,
          earlyVelocityScore: true,
        },
      },
    },
  });

  const shaped: AdWithMetrics[] = ads.map((ad) => {
    const m = ad.metrics[0];
    return {
      id: ad.id,
      platform: ad.platform,
      externalId: ad.externalId,
      brandName: ad.brandName,
      productName: ad.productName,
      niche: ad.niche,
      adType: ad.adType,
      duration: ad.duration,
      country: ad.country,
      language: ad.language,
      hookText: ad.hookText,
      hookType: ad.hookType,
      ctaText: ad.ctaText,
      ctaType: ad.ctaType,
      thumbnailUrl: ad.thumbnailUrl,
      landingPageUrl: ad.landingPageUrl,
      estimatedSpendMin: ad.estimatedSpendMin,
      estimatedSpendMax: ad.estimatedSpendMax,
      firstSeenAt: ad.firstSeenAt.toISOString(),
      lastSeenAt: ad.lastSeenAt.toISOString(),
      daysRunning: ad.daysRunning,
      isActive: ad.isActive,
      status: ad.status,
      velocityScore: ad.velocityScore,
      velocityTier: ad.velocityTier as AdWithMetrics["velocityTier"],
      latestMetrics: m
        ? {
            likes: Number(m.likes),
            comments: Number(m.comments),
            shares: Number(m.shares),
            views: Number(m.views),
            earlyVelocityScore: m.earlyVelocityScore,
          }
        : null,
    };
  });

  // Group by tier for convenient consumption by the UI
  const byTier = {
    EXPLOSIVE: shaped.filter((a) => a.velocityTier === "EXPLOSIVE"),
    HIGH: shaped.filter((a) => a.velocityTier === "HIGH"),
    RISING: shaped.filter((a) => a.velocityTier === "RISING"),
    STEADY: shaped.filter((a) => a.velocityTier === "STEADY"),
  };

  return NextResponse.json({
    ads: shaped,
    byTier,
    total: shaped.length,
    scopes: { niche, platform, tiers },
    meta: {
      note: "Scores updated every 6h by the velocity cron job",
      endpoint: "/api/cron/velocity",
    },
  });
}

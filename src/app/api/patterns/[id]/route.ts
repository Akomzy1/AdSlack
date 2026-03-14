/**
 * GET /api/patterns/[id]
 *
 * Returns full detail for a single CreativePattern including
 * example ad thumbnails/hooks for the expander section.
 * Requires at least PRO.
 */

import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { withSubscription } from "@/lib/withSubscription";
import { db } from "@/lib/db";

export const GET = withSubscription(
  async (_req, { params }) => {
    const { id } = params as { id: string };

    const pattern = await db.creativePattern.findUnique({
      where: { id },
    });

    if (!pattern) {
      return NextResponse.json({ error: "Pattern not found" }, { status: 404 });
    }

    const exampleAdIds = pattern.exampleAdIds as string[];

    // Fetch example ad details
    const exampleAds = await db.ad.findMany({
      where: { id: { in: exampleAdIds } },
      select: {
        id: true,
        brandName: true,
        niche: true,
        hookText: true,
        thumbnailUrl: true,
        velocityScore: true,
        adType: true,
        daysRunning: true,
      },
    });

    // Subscription stats: how many users have a pattern alert for this
    const subscriberCount = await db.alertRule.count({
      where: { patternId: id, isActive: true },
    });

    return NextResponse.json({
      pattern: {
        id: pattern.id,
        patternName: pattern.patternName,
        hookType: pattern.hookType,
        scriptStructure: pattern.scriptStructure,
        adType: pattern.adType,
        emotionalTriggers: pattern.emotionalTriggers as string[],
        avgVelocity: Math.round(pattern.avgVelocity * 10) / 10,
        medianEngagement: Math.round(pattern.medianEngagement),
        nicheSpread: pattern.nicheSpread as string[],
        totalAdsUsing: pattern.totalAdsUsing,
        growthRate: Math.round(pattern.growthRate * 10) / 10,
        viralityScore: Math.round(pattern.viralityScore * 10) / 10,
        status: pattern.status,
        firstDetectedAt: pattern.firstDetectedAt.toISOString(),
        lastUpdatedAt: pattern.lastUpdatedAt.toISOString(),
        subscriberCount,
        exampleAds: exampleAds.map((ad) => ({
          id: ad.id,
          brandName: ad.brandName,
          niche: ad.niche,
          hookText: ad.hookText,
          thumbnailUrl: ad.thumbnailUrl,
          velocityScore: Math.round(ad.velocityScore * 10) / 10,
          adType: ad.adType,
          daysRunning: ad.daysRunning,
        })),
      },
    });
  },
  UserRole.PRO
);

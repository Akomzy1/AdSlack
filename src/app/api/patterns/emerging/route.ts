/**
 * GET /api/patterns/emerging
 *
 * Returns EMERGING patterns sorted by virality score, limited to 10.
 * Used for the "What's Rising Now" hero section.
 * Requires at least PRO.
 */

import { NextResponse } from "next/server";
import { PatternStatus, UserRole } from "@prisma/client";
import { withSubscription } from "@/lib/withSubscription";
import { db } from "@/lib/db";

export const GET = withSubscription(async () => {
  const patterns = await db.creativePattern.findMany({
    where: { status: PatternStatus.EMERGING },
    orderBy: { viralityScore: "desc" },
    take: 10,
  });

  return NextResponse.json({
    patterns: patterns.map((p) => ({
      id: p.id,
      patternName: p.patternName,
      hookType: p.hookType,
      scriptStructure: p.scriptStructure,
      adType: p.adType,
      emotionalTriggers: p.emotionalTriggers as string[],
      avgVelocity: Math.round(p.avgVelocity * 10) / 10,
      medianEngagement: Math.round(p.medianEngagement),
      nicheSpread: p.nicheSpread as string[],
      totalAdsUsing: p.totalAdsUsing,
      growthRate: Math.round(p.growthRate * 10) / 10,
      viralityScore: Math.round(p.viralityScore * 10) / 10,
      exampleAdIds: p.exampleAdIds as string[],
      status: p.status,
      firstDetectedAt: p.firstDetectedAt.toISOString(),
      lastUpdatedAt: p.lastUpdatedAt.toISOString(),
    })),
  });
}, UserRole.PRO);

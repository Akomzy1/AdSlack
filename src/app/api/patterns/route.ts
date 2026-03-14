/**
 * GET /api/patterns
 *
 * Returns creative patterns, filterable and sortable.
 * Requires at least PRO.
 *
 * Query params:
 *   status   EMERGING | TRENDING | PEAKED | FADING
 *   hookType string
 *   niche    string
 *   sort     virality (default) | growth | adCount | newest
 *   page     number (default 1)
 *   limit    number (default 20, max 50)
 */

import { NextResponse } from "next/server";
import { PatternStatus, UserRole } from "@prisma/client";
import { withSubscription } from "@/lib/withSubscription";
import { db } from "@/lib/db";

export const GET = withSubscription(async (req) => {
  const { searchParams } = new URL(req.url);

  const status    = searchParams.get("status") as PatternStatus | null;
  const hookType  = searchParams.get("hookType");
  const niche     = searchParams.get("niche");
  const sort      = searchParams.get("sort") ?? "virality";
  const page      = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit     = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const skip      = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (status && Object.values(PatternStatus).includes(status)) {
    where.status = status;
  }
  if (hookType) {
    where.hookType = hookType.toUpperCase();
  }

  const orderBy =
    sort === "growth"  ? { growthRate:     "desc" as const } :
    sort === "adCount" ? { totalAdsUsing:  "desc" as const } :
    sort === "newest"  ? { firstDetectedAt:"desc" as const } :
                         { viralityScore:  "desc" as const };

  let patterns = await db.creativePattern.findMany({
    where,
    orderBy,
    skip,
    take: limit + 1, // fetch one extra to detect hasMore
  });

  // Client-side niche filter (nicheSpread is a JSON array)
  if (niche) {
    patterns = patterns.filter((p) => {
      const niches = p.nicheSpread as string[];
      return niches.some((n) => n.toLowerCase().includes(niche.toLowerCase()));
    });
  }

  const hasMore = patterns.length > limit;
  const results = patterns.slice(0, limit);

  const total = await db.creativePattern.count({ where });

  return NextResponse.json({
    patterns: results.map(formatPattern),
    total,
    page,
    hasMore,
  });
}, UserRole.PRO);

function formatPattern(p: {
  id: string;
  patternName: string;
  hookType: string;
  scriptStructure: string;
  adType: string;
  emotionalTriggers: unknown;
  avgVelocity: number;
  medianEngagement: number;
  nicheSpread: unknown;
  totalAdsUsing: number;
  growthRate: number;
  viralityScore: number;
  exampleAdIds: unknown;
  status: PatternStatus;
  firstDetectedAt: Date;
  lastUpdatedAt: Date;
}) {
  return {
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
  };
}

import type { AdStatus, AdType, Prisma, Platform } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import type { AdsResponse, AdWithMetrics, SortOption } from "@/types/ads";
import { ADS_PER_PAGE } from "@/types/ads";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);

  // ── Parse query params ────────────────────────────────────────────────────
  const q = searchParams.get("q")?.trim() ?? "";
  const platforms = (searchParams.get("platforms") ?? "")
    .split(",")
    .filter(Boolean) as Platform[];
  const niches = (searchParams.get("niches") ?? "").split(",").filter(Boolean);
  const country = searchParams.get("country") ?? "";
  const adTypes = (searchParams.get("adTypes") ?? "")
    .split(",")
    .filter(Boolean) as AdType[];
  const dateRange = searchParams.get("dateRange") ?? "30d";
  const velocityMin = parseFloat(searchParams.get("velocityMin") ?? "0");
  const velocityMax = parseFloat(searchParams.get("velocityMax") ?? "100");
  const spendMin = parseFloat(searchParams.get("spendMin") ?? "0") || null;
  const spendMax = parseFloat(searchParams.get("spendMax") ?? "0") || null;
  const sort = (searchParams.get("sort") ?? "velocity") as SortOption;
  const page = parseInt(searchParams.get("page") ?? "0", 10);
  const limit = ADS_PER_PAGE;

  // ── Date range filter ─────────────────────────────────────────────────────
  let dateFilter: Date | null = null;
  if (dateRange !== "all") {
    const days = { "7d": 7, "14d": 14, "30d": 30, "90d": 90 }[dateRange] ?? 30;
    dateFilter = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  }

  // ── Build Prisma WHERE clause ─────────────────────────────────────────────
  const where: Prisma.AdWhereInput = {
    ...(platforms.length > 0 && { platform: { in: platforms } }),
    ...(niches.length > 0 && { niche: { in: niches } }),
    ...(country && { country }),
    ...(adTypes.length > 0 && { adType: { in: adTypes } }),
    ...(dateFilter && { firstSeenAt: { gte: dateFilter } }),
    ...(spendMin && { estimatedSpendMin: { gte: spendMin } }),
    ...(spendMax && { estimatedSpendMax: { lte: spendMax } }),
    ...(q && {
      OR: [
        { hookText: { contains: q, mode: "insensitive" } },
        { brandName: { contains: q, mode: "insensitive" } },
        { productName: { contains: q, mode: "insensitive" } },
        { niche: { contains: q, mode: "insensitive" } },
      ],
    }),
  };

  // ── Determine sort order ──────────────────────────────────────────────────
  const prismaOrderBy: Prisma.AdOrderByWithRelationInput[] = (() => {
    switch (sort) {
      case "newest":
        return [{ firstSeenAt: "desc" }];
      case "longest":
        return [{ daysRunning: "desc" }];
      case "spend":
        return [{ estimatedSpendMax: { sort: "desc", nulls: "last" } }];
      // velocity + engagement: fetch all, sort in JS after metrics are loaded
      default:
        return [{ firstSeenAt: "desc" }];
    }
  })();

  // ── Fetch ads + latest metrics ────────────────────────────────────────────
  const isMetricSort = sort === "velocity" || sort === "engagement";

  // For metric-based sorts: fetch all matching (up to 500) then sort in JS
  const fetchLimit = isMetricSort ? 500 : limit;
  const fetchSkip = isMetricSort ? 0 : page * limit;

  const [rawAds, total] = await Promise.all([
    db.ad.findMany({
      where,
      orderBy: prismaOrderBy,
      take: fetchLimit,
      skip: fetchSkip,
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
    }),
    db.ad.count({ where }),
  ]);

  // ── Sort by metrics if needed ─────────────────────────────────────────────
  let sortedAds = rawAds;

  if (sort === "velocity") {
    sortedAds = [...rawAds].sort((a, b) => {
      const va = a.metrics[0]?.earlyVelocityScore ?? 0;
      const vb = b.metrics[0]?.earlyVelocityScore ?? 0;
      return vb - va;
    });
  } else if (sort === "engagement") {
    sortedAds = [...rawAds].sort((a, b) => {
      const ea =
        Number(a.metrics[0]?.likes ?? 0) +
        Number(a.metrics[0]?.shares ?? 0) +
        Number(a.metrics[0]?.comments ?? 0);
      const eb =
        Number(b.metrics[0]?.likes ?? 0) +
        Number(b.metrics[0]?.shares ?? 0) +
        Number(b.metrics[0]?.comments ?? 0);
      return eb - ea;
    });
  }

  // Apply pagination after sort (for metric sorts only)
  const paginatedAds = isMetricSort
    ? sortedAds.slice(page * limit, (page + 1) * limit)
    : sortedAds;

  // ── Velocity filter: filter out ads below threshold (based on latest score) ─
  const velocityFiltered =
    velocityMin > 0 || velocityMax < 100
      ? paginatedAds.filter((ad) => {
          const score = ad.metrics[0]?.earlyVelocityScore ?? 0;
          // Normalise 0–5 velocity to 0–100 for the slider
          const normalized = Math.min(100, (score / 5) * 100);
          return normalized >= velocityMin && normalized <= velocityMax;
        })
      : paginatedAds;

  // ── Shape response ────────────────────────────────────────────────────────
  const ads: AdWithMetrics[] = velocityFiltered.map((ad) => {
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

  const response: AdsResponse = {
    ads,
    total,
    hasMore: (page + 1) * limit < total,
    page,
  };

  return NextResponse.json(response);
}

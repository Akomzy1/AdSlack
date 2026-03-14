import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { withSubscription } from "@/lib/withSubscription";
import { withErrorHandling, apiError } from "@/lib/errors";
import { db } from "@/lib/db";

interface Params { id: string }

export const GET = withSubscription<Params>(
  withErrorHandling(async (_req, { params }) => {
    const product = await db.productInsight.findUnique({
      where: { id: params.id },
      include: {
        ads: {
          where:   { isActive: true },
          orderBy: { velocityScore: "desc" },
          take:    10,
          select: {
            id:           true,
            brandName:    true,
            productName:  true,
            platform:     true,
            thumbnailUrl: true,
            velocityScore: true,
            velocityTier:  true,
            daysRunning:   true,
            hookText:      true,
          },
        },
      },
    });

    if (!product) return apiError("NOT_FOUND", "Product insight not found");

    // Top platforms breakdown
    const platformCounts = await db.ad.groupBy({
      by: ["platform"],
      where: { productInsightId: params.id },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });

    // Weekly advertiser trend (compare last 7d vs prior 7d)
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 86_400_000);

    const [recentBrands, priorBrands] = await Promise.all([
      db.ad.findMany({
        where: {
          productInsightId: params.id,
          firstSeenAt: { gte: sevenDaysAgo },
        },
        distinct: ["brandName"],
        select: { brandName: true },
      }),
      db.ad.findMany({
        where: {
          productInsightId: params.id,
          firstSeenAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
        },
        distinct: ["brandName"],
        select: { brandName: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        product,
        breakdown: {
          platformCounts: platformCounts.map((p) => ({
            platform: p.platform,
            count:    p._count.id,
          })),
          weeklyTrend: {
            recentAdvertisers: recentBrands.length,
            priorAdvertisers:  priorBrands.length,
            change:            recentBrands.length - priorBrands.length,
          },
        },
      },
    });
  }),
  UserRole.PRO,
);

import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { withSubscription } from "@/lib/withSubscription";
import { withErrorHandling } from "@/lib/errors";
import { db } from "@/lib/db";
import type { LifecycleStage, TrendDirection } from "@prisma/client";

const PRODUCTS_PER_PAGE = 20;

export const GET = withSubscription(
  withErrorHandling(async (req) => {
    const { searchParams } = new URL(req.url);

    const stage     = searchParams.get("stage")     as LifecycleStage | null;
    const niche     = searchParams.get("niche");
    const platform  = searchParams.get("platform");
    const trend     = searchParams.get("trend")     as TrendDirection | null;
    const sort      = searchParams.get("sort") ?? "saturation";
    const page      = Math.max(0, parseInt(searchParams.get("page") ?? "0", 10));

    type OrderBy = Parameters<typeof db.productInsight.findMany>[0]["orderBy"];

    const orderBy: OrderBy =
      sort === "adCount"  ? { totalAdCount: "desc" }  :
      sort === "newest"   ? { firstDetectedAt: "desc" } :
      sort === "opps"     ? { saturationScore: "asc" } :  // lowest saturation = biggest opp
      /* default */         { saturationScore: "desc" };

    const where = {
      ...(stage    ? { lifecycleStage: stage }    : {}),
      ...(niche    ? { productCategory: niche }   : {}),
      ...(platform ? { topPlatform: platform }    : {}),
      ...(trend    ? { trendDirection: trend }    : {}),
    };

    const [products, total] = await Promise.all([
      db.productInsight.findMany({
        where,
        orderBy,
        skip:  page * PRODUCTS_PER_PAGE,
        take:  PRODUCTS_PER_PAGE,
        include: {
          ads: {
            where:   { isActive: true },
            orderBy: { velocityScore: "desc" },
            take:    1,
            select:  { id: true, thumbnailUrl: true, brandName: true },
          },
        },
      }),
      db.productInsight.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        products,
        pagination: {
          page,
          total,
          pages: Math.ceil(total / PRODUCTS_PER_PAGE),
          perPage: PRODUCTS_PER_PAGE,
        },
      },
    });
  }),
  UserRole.PRO,
);

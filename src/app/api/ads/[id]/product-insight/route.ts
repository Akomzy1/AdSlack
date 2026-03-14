import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { withSubscription } from "@/lib/withSubscription";
import { withErrorHandling, apiError } from "@/lib/errors";
import { db } from "@/lib/db";

interface Params { id: string }

export const GET = withSubscription<Params>(
  withErrorHandling(async (_req, { params }) => {
    // Fetch the ad with its linked ProductInsight
    const ad = await db.ad.findUnique({
      where:  { id: params.id },
      select: {
        id:              true,
        productInsight: {
          include: {
            ads: {
              where:   { isActive: true },
              orderBy: { velocityScore: "desc" },
              take:    3,
              select:  { id: true, brandName: true, thumbnailUrl: true, velocityScore: true },
            },
          },
        },
      },
    });

    if (!ad) return apiError("NOT_FOUND", "Ad not found");

    if (!ad.productInsight) {
      return NextResponse.json({
        success: true,
        data: null,  // product not yet matched — frontend shows "no data yet"
      });
    }

    return NextResponse.json({
      success: true,
      data: ad.productInsight,
    });
  }),
  UserRole.FREE,  // visible to all signed-in users on ad detail
);

/**
 * GET /api/ads/[id]/duplicates
 *
 * Returns a paginated list of ads detected as similar/duplicate to the given ad.
 * Query params: limit (default 20), offset (default 0), type (SimilarityType filter)
 */

import { NextResponse } from "next/server";
import { withSubscription } from "@/lib/withSubscription";
import { db } from "@/lib/db";
import type { SimilarityType } from "@prisma/client";

export const GET = withSubscription(
  async (req, { params }) => {
    const { id }     = params as { id: string };
    const { searchParams } = new URL(req.url);

    const limit  = Math.min(parseInt(searchParams.get("limit")  ?? "20", 10), 50);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);
    const type   = searchParams.get("type") as SimilarityType | null;

    const where = {
      sourceAdId: id,
      ...(type ? { similarityType: type } : {}),
    };

    const [total, duplicates] = await Promise.all([
      db.adDuplicate.count({ where }),
      db.adDuplicate.findMany({
        where,
        take:    limit,
        skip:    offset,
        orderBy: { similarityScore: "desc" },
        select: {
          id:             true,
          similarityScore: true,
          similarityType:  true,
          detectedAt:     true,
          duplicateAd: {
            select: {
              id:           true,
              brandName:    true,
              productName:  true,
              niche:        true,
              hookText:     true,
              thumbnailUrl: true,
              platform:     true,
              firstSeenAt:  true,
              daysRunning:  true,
              velocityScore: true,
              saturationScore: true,
              isActive:     true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      total,
      limit,
      offset,
      items: duplicates.map((d) => ({
        duplicateId:     d.id,
        similarityScore: d.similarityScore,
        similarityType:  d.similarityType,
        detectedAt:      d.detectedAt,
        ad:              d.duplicateAd,
      })),
    });
  },
);

/**
 * GET /api/creators/[id]
 *
 * Returns full creator profile with reviews.
 * Accessible by all authenticated users.
 */

import { NextResponse } from "next/server";
import { withSubscription } from "@/lib/withSubscription";
import { db } from "@/lib/db";

export const GET = withSubscription<{ id: string }>(async (_req, { params }) => {
  const creator = await db.creator.findUnique({
    where: { id: params.id },
    select: {
      id:              true,
      name:            true,
      profileImageUrl: true,
      bio:             true,
      platforms:       true,
      niches:          true,
      contentStyles:   true,
      priceRange:      true,
      turnaroundDays:  true,
      portfolioUrls:   true,
      rating:          true,
      reviewCount:     true,
      completedBriefs: true,
      country:         true,
      language:        true,
      isVerified:      true,
      isAvailable:     true,
      createdAt:       true,
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id:        true,
          rating:    true,
          comment:   true,
          createdAt: true,
          user: {
            select: { id: true, name: true, image: true },
          },
        },
      },
    },
  });

  if (!creator) {
    return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  }

  return NextResponse.json({ creator });
});

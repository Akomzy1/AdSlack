/**
 * POST /api/creators/[id]/review
 *
 * Leave a review for a creator.
 * Requires at least one COMPLETED brief with this creator.
 * One review per creator per user.
 *
 * Body:
 * {
 *   rating:   number  — 1–5
 *   comment?: string
 * }
 */

import { NextResponse }    from "next/server";
import { withSubscription } from "@/lib/withSubscription";
import { db }              from "@/lib/db";

export const POST = withSubscription<{ id: string }>(
  async (req, { user, params }) => {
    const creatorId = params.id;

    const body = await req.json() as { rating?: number; comment?: string };
    const { rating, comment } = body;

    if (!rating || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return NextResponse.json(
        { error: "rating must be an integer between 1 and 5" },
        { status: 400 }
      );
    }

    const creator = await db.creator.findUnique({
      where: { id: creatorId },
      select: { id: true },
    });

    if (!creator) {
      return NextResponse.json({ error: "Creator not found" }, { status: 404 });
    }

    // Verify the user has a completed brief with this creator
    const completedBrief = await db.sentBrief.findFirst({
      where: { userId: user.id, creatorId, status: "COMPLETED" },
      select: { id: true },
    });

    if (!completedBrief) {
      return NextResponse.json(
        { error: "You can only review creators after a completed brief" },
        { status: 403 }
      );
    }

    // Upsert — allow editing existing review
    const review = await db.creatorReview.upsert({
      where:  { creatorId_userId: { creatorId, userId: user.id } },
      create: { creatorId, userId: user.id, rating, comment: comment ?? null },
      update: { rating, comment: comment ?? null },
      select: { id: true, rating: true, comment: true, createdAt: true },
    });

    // Recalculate creator rating
    const stats = await db.creatorReview.aggregate({
      where:   { creatorId },
      _avg:    { rating: true },
      _count:  { id: true },
    });

    await db.creator.update({
      where: { id: creatorId },
      data: {
        rating:      stats._avg.rating ?? 0,
        reviewCount: stats._count.id,
      },
    });

    return NextResponse.json({ review });
  }
);

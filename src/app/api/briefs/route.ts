/**
 * GET /api/briefs
 *
 * Returns the authenticated user's sent briefs with creator info and status.
 *
 * Query params:
 *   status  string  — SENT | VIEWED | ACCEPTED | DECLINED | COMPLETED
 *   page    number  — default 1
 *   limit   number  — default 20, max 50
 */

import { NextResponse }    from "next/server";
import { withSubscription } from "@/lib/withSubscription";
import { db }              from "@/lib/db";

export const GET = withSubscription(async (req, { user }) => {
  const { searchParams } = new URL(req.url);

  const status = searchParams.get("status");
  const page   = Math.max(1, parseInt(searchParams.get("page")  ?? "1",  10));
  const limit  = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const skip   = (page - 1) * limit;

  const where: Record<string, unknown> = { userId: user.id };
  if (status) where.status = status;

  const [briefs, total] = await Promise.all([
    db.sentBrief.findMany({
      where,
      orderBy: { sentAt: "desc" },
      skip,
      take: limit,
      select: {
        id:            true,
        briefType:     true,
        customMessage: true,
        status:        true,
        sentAt:        true,
        respondedAt:   true,
        adId:          true,
        creator: {
          select: {
            id:              true,
            name:            true,
            profileImageUrl: true,
            platforms:       true,
            niches:          true,
          },
        },
      },
    }),
    db.sentBrief.count({ where }),
  ]);

  return NextResponse.json({ briefs, total, page, hasMore: skip + briefs.length < total });
});

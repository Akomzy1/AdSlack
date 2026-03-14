/**
 * GET /api/notifications
 *
 * Returns paginated notifications for the current user.
 * Query params:
 *   - limit  (default 20, max 50)
 *   - cursor (createdAt ISO string for cursor-based pagination)
 *   - unreadOnly (boolean)
 */

import { NextResponse } from "next/server";
import { withSubscription } from "@/lib/withSubscription";
import { db } from "@/lib/db";

export const GET = withSubscription(async (req, { user }) => {
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "20"), 50);
  const cursor = url.searchParams.get("cursor");
  const unreadOnly = url.searchParams.get("unreadOnly") === "true";

  const where = {
    userId: user.id,
    ...(unreadOnly && { isRead: false }),
    ...(cursor && { createdAt: { lt: new Date(cursor) } }),
  };

  const [notifications, unreadCount] = await Promise.all([
    db.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      include: {
        ad: {
          select: {
            id: true,
            brandName: true,
            productName: true,
            thumbnailUrl: true,
            velocityScore: true,
            velocityTier: true,
            platform: true,
          },
        },
        alertRule: { select: { name: true } },
      },
    }),
    db.notification.count({ where: { userId: user.id, isRead: false } }),
  ]);

  const hasMore = notifications.length > limit;
  const items = notifications.slice(0, limit);
  const nextCursor = hasMore ? items[items.length - 1]?.createdAt.toISOString() : null;

  return NextResponse.json({
    notifications: items.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
      ruleName: n.alertRule?.name ?? null,
      ad: {
        id: n.ad.id,
        brandName: n.ad.brandName,
        productName: n.ad.productName,
        thumbnailUrl: n.ad.thumbnailUrl,
        velocityScore: n.ad.velocityScore,
        velocityTier: n.ad.velocityTier,
        platform: n.ad.platform,
      },
    })),
    unreadCount,
    nextCursor,
    hasMore,
  });
});

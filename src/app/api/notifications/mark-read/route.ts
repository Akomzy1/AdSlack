/**
 * PATCH /api/notifications/mark-read
 *
 * Mark notifications as read.
 * Body: { ids?: string[] }  — omit or empty to mark ALL unread as read
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { withSubscription } from "@/lib/withSubscription";
import { db } from "@/lib/db";

const BodySchema = z.object({
  ids: z.array(z.string()).optional(),
});

export const PATCH = withSubscription(async (req, { user }) => {
  const body = await req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const where = parsed.data.ids?.length
    ? { userId: user.id, id: { in: parsed.data.ids } }
    : { userId: user.id, isRead: false };

  const { count } = await db.notification.updateMany({
    where,
    data: { isRead: true },
  });

  return NextResponse.json({ ok: true, count });
});

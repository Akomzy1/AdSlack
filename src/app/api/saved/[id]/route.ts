/**
 * DELETE /api/saved/[id] — remove a saved ad by its SavedAd.id
 */

import { NextResponse } from "next/server";
import { withSubscription } from "@/lib/withSubscription";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export const DELETE = withSubscription<{ id: string }>(
  async (_req, { user, params }) => {
    const savedId = params.id;

    const existing = await db.savedAd.findFirst({
      where: { id: savedId, userId: user.id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Saved ad not found" }, { status: 404 });
    }

    await db.savedAd.delete({ where: { id: savedId } });

    return NextResponse.json({ ok: true });
  }
);

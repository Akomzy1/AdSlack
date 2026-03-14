/**
 * GET  /api/saved  — list all saved ads for the current user (IDs only, for bookmark state)
 * POST /api/saved  — save an ad to an optional folder
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { withSubscription } from "@/lib/withSubscription";
import { db } from "@/lib/db";

export const runtime = "nodejs";

// ── GET ── list saved entries (lightweight — ids + folderId only) ─────────────

export const GET = withSubscription(async (_req, { user }) => {
  const saved = await db.savedAd.findMany({
    where: { userId: user.id },
    select: { id: true, adId: true, folderId: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ saved });
});

// ── POST ── save an ad ────────────────────────────────────────────────────────

const SaveBody = z.object({
  adId:     z.string().min(1),
  folderId: z.string().nullable().optional(),
});

export const POST = withSubscription(async (req, { user }) => {
  let body: z.infer<typeof SaveBody>;
  try {
    body = SaveBody.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { adId, folderId } = body;

  // Verify the ad exists
  const ad = await db.ad.findUnique({ where: { id: adId }, select: { id: true } });
  if (!ad) return NextResponse.json({ error: "Ad not found" }, { status: 404 });

  // Verify the folder belongs to the user (if provided)
  if (folderId) {
    const folder = await db.folder.findFirst({ where: { id: folderId, userId: user.id } });
    if (!folder) return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  // Upsert — idempotent: saving the same ad twice just updates the folder
  const existing = await db.savedAd.findUnique({ where: { userId_adId: { userId: user.id, adId } } });

  if (existing) {
    const updated = await db.savedAd.update({
      where: { id: existing.id },
      data:  { folderId: folderId ?? null },
      select: { id: true, adId: true, folderId: true },
    });
    return NextResponse.json({ saved: updated });
  }

  const saved = await db.savedAd.create({
    data:   { userId: user.id, adId, folderId: folderId ?? null },
    select: { id: true, adId: true, folderId: true },
  });

  return NextResponse.json({ saved }, { status: 201 });
});

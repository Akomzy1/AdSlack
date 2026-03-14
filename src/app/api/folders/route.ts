/**
 * GET  /api/folders — list the current user's folders with counts + preview thumbnails
 * POST /api/folders — create a new folder
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { withSubscription } from "@/lib/withSubscription";
import { db } from "@/lib/db";

export const runtime = "nodejs";

// ── GET ── ─────────────────────────────────────────────────────────────────────

export const GET = withSubscription(async (_req, { user }) => {
  const folders = await db.folder.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    include: {
      savedAds: {
        orderBy: { createdAt: "desc" },
        take: 4,
        include: {
          ad: { select: { thumbnailUrl: true, niche: true } },
        },
      },
      _count: { select: { savedAds: true } },
    },
  });

  const result = folders.map((f) => ({
    id:        f.id,
    name:      f.name,
    adCount:   f._count.savedAds,
    updatedAt: f.savedAds[0]?.createdAt?.toISOString() ?? f.createdAt.toISOString(),
    thumbnails: f.savedAds.map((s) => s.ad.thumbnailUrl).filter(Boolean) as string[],
    niches:     [...new Set(f.savedAds.map((s) => s.ad.niche))].slice(0, 3),
  }));

  return NextResponse.json({ folders: result });
});

// ── POST ── ────────────────────────────────────────────────────────────────────

const CreateFolderBody = z.object({
  name: z.string().min(1).max(80).trim(),
});

export const POST = withSubscription(async (req, { user }) => {
  let body: z.infer<typeof CreateFolderBody>;
  try {
    body = CreateFolderBody.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid folder name" }, { status: 400 });
  }

  // Enforce unique name per user
  const exists = await db.folder.findUnique({
    where: { userId_name: { userId: user.id, name: body.name } },
    select: { id: true },
  });
  if (exists) {
    return NextResponse.json({ error: "A folder with that name already exists" }, { status: 409 });
  }

  const folder = await db.folder.create({
    data:   { userId: user.id, name: body.name },
    select: { id: true, name: true },
  });

  return NextResponse.json({
    folder: { id: folder.id, name: folder.name, adCount: 0, thumbnails: [], updatedAt: new Date().toISOString() },
  }, { status: 201 });
});

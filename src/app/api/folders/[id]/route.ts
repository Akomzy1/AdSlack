/**
 * PATCH  /api/folders/[id] — rename folder
 * DELETE /api/folders/[id] — delete folder (and all its saved ad associations)
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { withSubscription } from "@/lib/withSubscription";
import { db } from "@/lib/db";

export const runtime = "nodejs";

async function assertOwnership(userId: string, folderId: string) {
  const folder = await db.folder.findFirst({ where: { id: folderId, userId } });
  return folder;
}

// ── PATCH ── rename ────────────────────────────────────────────────────────────

const RenameBody = z.object({ name: z.string().min(1).max(80).trim() });

export const PATCH = withSubscription<{ id: string }>(async (req, { user, params }) => {
  const folder = await assertOwnership(user.id, params.id);
  if (!folder) return NextResponse.json({ error: "Folder not found" }, { status: 404 });

  let body: z.infer<typeof RenameBody>;
  try {
    body = RenameBody.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid folder name" }, { status: 400 });
  }

  // Check name uniqueness
  const conflict = await db.folder.findFirst({
    where: { userId: user.id, name: body.name, NOT: { id: params.id } },
  });
  if (conflict) {
    return NextResponse.json({ error: "A folder with that name already exists" }, { status: 409 });
  }

  const updated = await db.folder.update({
    where: { id: params.id },
    data:  { name: body.name },
    select: { id: true, name: true },
  });

  return NextResponse.json({ folder: updated });
});

// ── DELETE ── ──────────────────────────────────────────────────────────────────

export const DELETE = withSubscription<{ id: string }>(async (_req, { user, params }) => {
  const folder = await assertOwnership(user.id, params.id);
  if (!folder) return NextResponse.json({ error: "Folder not found" }, { status: 404 });

  // SavedAd rows with this folderId get folderId set to null (Prisma SetNull)
  // then delete the folder
  await db.$transaction([
    db.savedAd.updateMany({
      where: { userId: user.id, folderId: params.id },
      data:  { folderId: null },
    }),
    db.folder.delete({ where: { id: params.id } }),
  ]);

  return NextResponse.json({ ok: true });
});

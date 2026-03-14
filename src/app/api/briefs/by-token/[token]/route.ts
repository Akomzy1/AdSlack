/**
 * GET /api/briefs/by-token/[token]
 *
 * Public endpoint — look up a brief by its response token.
 * Used by the creator response page.
 */

import { NextResponse } from "next/server";
import { db }           from "@/lib/db";

export const GET = async (
  _req: Request,
  { params }: { params: { token: string } }
) => {
  const brief = await db.sentBrief.findUnique({
    where: { responseToken: params.token },
    select: {
      id:            true,
      responseToken: true,
      briefType:     true,
      briefContent:  true,
      customMessage: true,
      status:        true,
      sentAt:        true,
      respondedAt:   true,
      creator: {
        select: { id: true, name: true, profileImageUrl: true },
      },
      user: {
        select: { name: true },
      },
    },
  });

  if (!brief) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Mark as VIEWED if still SENT
  if (brief.status === "SENT") {
    await db.sentBrief.update({
      where: { id: brief.id },
      data:  { status: "VIEWED" },
    });
  }

  return NextResponse.json({
    id:            brief.id,
    briefType:     brief.briefType,
    briefContent:  brief.briefContent,
    customMessage: brief.customMessage,
    status:        brief.status === "SENT" ? "VIEWED" : brief.status,
    sentAt:        brief.sentAt.toISOString(),
    respondedAt:   brief.respondedAt?.toISOString() ?? null,
    creator:       brief.creator,
    senderName:    brief.user.name,
  });
};

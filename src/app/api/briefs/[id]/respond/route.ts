/**
 * PATCH /api/briefs/[id]/respond
 *
 * Creator response endpoint — public, token-authenticated (no login required).
 * Creator visits a link like /creators/respond/[token] which calls this endpoint.
 *
 * Body:
 * {
 *   token:    string  — responseToken from SentBrief
 *   status:   "ACCEPTED" | "DECLINED"
 *   message?: string
 * }
 */

import { NextResponse } from "next/server";
import { db }           from "@/lib/db";

export const PATCH = async (
  req: Request,
  { params }: { params: { id: string } }
) => {
  const briefId = params.id;

  let body: { token?: string; status?: string; message?: string };
  try {
    body = await req.json() as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { token, status, message } = body;

  if (!token || !status) {
    return NextResponse.json(
      { error: "token and status are required" },
      { status: 400 }
    );
  }

  if (!["ACCEPTED", "DECLINED"].includes(status)) {
    return NextResponse.json(
      { error: "status must be ACCEPTED or DECLINED" },
      { status: 400 }
    );
  }

  const brief = await db.sentBrief.findUnique({
    where: { id: briefId },
    select: { id: true, responseToken: true, status: true },
  });

  if (!brief) {
    return NextResponse.json({ error: "Brief not found" }, { status: 404 });
  }

  if (brief.responseToken !== token) {
    return NextResponse.json({ error: "Invalid token" }, { status: 403 });
  }

  if (brief.status !== "SENT" && brief.status !== "VIEWED") {
    return NextResponse.json(
      { error: "Brief has already been responded to" },
      { status: 409 }
    );
  }

  const updated = await db.sentBrief.update({
    where: { id: briefId },
    data: {
      status:      status as "ACCEPTED" | "DECLINED",
      respondedAt: new Date(),
    },
    select: { id: true, status: true, respondedAt: true },
  });

  // Log the response message if provided (stored as usage log or just console)
  if (message) {
    console.log(`[briefs/respond] Brief ${briefId} ${status} — message: ${message}`);
  }

  return NextResponse.json({
    id:          updated.id,
    status:      updated.status,
    respondedAt: updated.respondedAt?.toISOString(),
  });
};

/**
 * GET /api/briefs/[id]/respond?token=[token]
 *
 * Returns brief details for the creator response page (no auth required).
 */
export const GET = async (
  req: Request,
  { params }: { params: { id: string } }
) => {
  const token = new URL(req.url).searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }

  const brief = await db.sentBrief.findUnique({
    where: { id: params.id },
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

  if (!brief || brief.responseToken !== token) {
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

/**
 * POST /api/creators/[id]/send-brief
 *
 * Sends a brief to a creator via email.
 * Requires PRO plan or higher.
 *
 * Body:
 * {
 *   briefType:     "CREATIVE_BRIEF" | "UGC_SCRIPT" | "STORYBOARD" | "CUSTOM"
 *   briefContent:  object  — the generated remix content
 *   adId?:         string
 *   customMessage?: string
 * }
 */

import { NextResponse }    from "next/server";
import { UserRole }        from "@prisma/client";
import { withSubscription } from "@/lib/withSubscription";
import { db }              from "@/lib/db";
import { sendBriefEmail }  from "@/lib/email";

export const POST = withSubscription<{ id: string }>(
  async (req, { user, params }) => {
    const creatorId = params.id;

    const body = await req.json() as {
      briefType:     string;
      briefContent:  unknown;
      adId?:         string;
      customMessage?: string;
    };

    const { briefType, briefContent, adId, customMessage } = body;

    if (!briefType || !briefContent) {
      return NextResponse.json(
        { error: "briefType and briefContent are required" },
        { status: 400 }
      );
    }

    const validTypes = ["CREATIVE_BRIEF", "UGC_SCRIPT", "STORYBOARD", "CUSTOM"];
    if (!validTypes.includes(briefType)) {
      return NextResponse.json(
        { error: "Invalid briefType", validTypes },
        { status: 400 }
      );
    }

    const creator = await db.creator.findUnique({
      where: { id: creatorId },
      select: { id: true, name: true, email: true, isAvailable: true },
    });

    if (!creator) {
      return NextResponse.json({ error: "Creator not found" }, { status: 404 });
    }

    if (!creator.isAvailable) {
      return NextResponse.json(
        { error: "Creator is not currently available" },
        { status: 409 }
      );
    }

    // Create the SentBrief record
    const sentBrief = await db.sentBrief.create({
      data: {
        userId:        user.id,
        creatorId,
        adId:          adId ?? null,
        briefType:     briefType as Parameters<typeof db.sentBrief.create>[0]["data"]["briefType"],
        briefContent:  briefContent as Parameters<typeof db.sentBrief.create>[0]["data"]["briefContent"],
        customMessage: customMessage ?? null,
      },
    });

    // Send email to creator
    try {
      await sendBriefEmail({
        to:            creator.email,
        creatorName:   creator.name,
        senderName:    user.name ?? "A brand",
        briefType,
        customMessage: customMessage ?? null,
        responseToken: sentBrief.responseToken,
      });
    } catch (err) {
      console.error("[send-brief] Email failed:", err);
      // Don't fail the request — brief is saved, email will be retried or ignored
    }

    return NextResponse.json({
      briefId:  sentBrief.id,
      status:   sentBrief.status,
      sentAt:   sentBrief.sentAt.toISOString(),
    });
  },
  UserRole.PRO
);

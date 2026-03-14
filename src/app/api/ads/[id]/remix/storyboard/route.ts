/**
 * POST /api/ads/[id]/remix/storyboard
 *
 * Generates a frame-by-frame visual storyboard a video editor or UGC creator
 * can follow directly to produce a new high-converting ad.
 *
 * Access:
 *   - Requires SCALE plan or higher (premium feature)
 *   - Costs 2 remix.storyboard credits per call
 *   - Rate-limited to 5 requests per minute per user
 *
 * Body (optional):
 *   { brief?: object }   — previously generated CreativeBrief for extra context
 *
 * Response shape:
 * {
 *   adId:      string,
 *   remixId:   string,
 *   storyboard: { title, totalDuration, aspectRatio, frames[], productionNotes },
 *   meta:      { model, tokensUsed, generatedAt }
 * }
 */

import { NextResponse } from "next/server";
import { UserRole }     from "@prisma/client";
import { withSubscription }          from "@/lib/withSubscription";
import { checkCredit, deductCredit } from "@/lib/credits";
import { db }                        from "@/lib/db";
import { generateStoryboard }        from "@/services/storyboardEngine";
import { fetchRemixContext, isRateLimited } from "../_lib";

export const runtime     = "nodejs";
export const maxDuration = 120; // storyboards use opus + 8k tokens

export const POST = withSubscription<{ id: string }>(
  async (req, { user, params }) => {
    const adId = params.id;

    // ── 1. Rate limit ──────────────────────────────────────────────────────
    if (await isRateLimited(user.id, "remix.storyboard")) {
      return NextResponse.json(
        { error: "Too many requests", retryAfterSeconds: 60 },
        { status: 429 }
      );
    }

    // ── 2. Load ad + anatomy ───────────────────────────────────────────────
    const ctx = await fetchRemixContext(adId);
    if (!ctx) {
      return NextResponse.json({ error: "Ad not found" }, { status: 404 });
    }

    // ── 3. Parse optional brief from body ─────────────────────────────────
    let brief: Record<string, unknown> | undefined;
    try {
      const body = await req.json() as { brief?: Record<string, unknown> };
      if (body.brief && typeof body.brief === "object") {
        brief = body.brief;
      }
    } catch {
      // body is optional — ignore parse errors
    }

    // ── 4. Credit check ────────────────────────────────────────────────────
    const creditCheck = await checkCredit(user.id, "remix.storyboard");
    if (!creditCheck.allowed) {
      return NextResponse.json(
        {
          error:            "Insufficient credits",
          reason:           creditCheck.reason,
          creditsRemaining: creditCheck.creditsRemaining,
          creditsLimit:     creditCheck.creditsLimit,
        },
        { status: 402 }
      );
    }

    // ── 5. Generate ────────────────────────────────────────────────────────
    let result;
    try {
      result = await generateStoryboard(ctx.ad, ctx.anatomy, brief);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[remix/storyboard] Generation failed for ad=${adId}:`, message);
      return NextResponse.json(
        { error: "Storyboard generation failed", details: message },
        { status: 502 }
      );
    }

    const { output: storyboard, tokensInput, tokensOutput, model } = result;
    const tokensUsed = tokensInput + tokensOutput;

    // ── 6. Persist remix ───────────────────────────────────────────────────
    const remix = await db.remix.create({
      data: {
        userId:    user.id,
        adId,
        remixType: "STORYBOARD",
        output:    storyboard as unknown as Parameters<typeof db.remix.create>[0]["data"]["output"],
        model,
        tokensUsed,
      },
    });

    // ── 7. Deduct credits ──────────────────────────────────────────────────
    await deductCredit(user.id, "remix.storyboard", {
      adId,
      remixId: remix.id,
      model,
      tokensInput,
      tokensOutput,
    }).catch((err) => {
      console.error("[remix/storyboard] Credit deduction failed:", err);
    });

    // ── 8. Respond ─────────────────────────────────────────────────────────
    return NextResponse.json({
      adId,
      remixId:    remix.id,
      storyboard,
      meta: {
        model,
        tokensUsed,
        generatedAt: remix.createdAt.toISOString(),
      },
    });
  },
  UserRole.SCALE
);

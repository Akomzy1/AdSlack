/**
 * POST /api/ads/[id]/remix/ugc
 *
 * Generates 3 UGC script variations with different creator personas and angles.
 *
 * Access:
 *   - Requires authentication (NextAuth session)
 *   - Requires PRO plan or higher
 *   - Costs 1 remix.ugc credit per call
 *   - Rate-limited to 5 requests per minute per user
 *
 * Response shape:
 * {
 *   adId:    string,
 *   remixId: string,
 *   scripts: UGCOutput,
 *   meta:    { model, tokensUsed, generatedAt }
 * }
 */

import { NextResponse } from "next/server";
import { UserRole }     from "@prisma/client";
import { withSubscription }          from "@/lib/withSubscription";
import { checkCredit, deductCredit } from "@/lib/credits";
import { db }                        from "@/lib/db";
import { generateUGCScripts }        from "@/services/remixEngine";
import { fetchRemixContext, isRateLimited } from "../_lib";

export const runtime     = "nodejs";
export const maxDuration = 90;

export const POST = withSubscription<{ id: string }>(
  async (_req, { user, params }) => {
    const adId = params.id;

    // ── 1. Rate limit ──────────────────────────────────────────────────────
    if (await isRateLimited(user.id, "remix.ugc")) {
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

    // ── 3. Credit check ────────────────────────────────────────────────────
    const creditCheck = await checkCredit(user.id, "remix.ugc");
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

    // ── 4. Generate ────────────────────────────────────────────────────────
    let result;
    try {
      result = await generateUGCScripts(ctx.ad, ctx.anatomy);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[remix/ugc] Generation failed for ad=${adId}:`, message);
      return NextResponse.json(
        { error: "UGC script generation failed", details: message },
        { status: 502 }
      );
    }

    const { output: scripts, tokensInput, tokensOutput, model } = result;
    const tokensUsed = tokensInput + tokensOutput;

    // ── 5. Persist remix ───────────────────────────────────────────────────
    const remix = await db.remix.create({
      data: {
        userId:    user.id,
        adId,
        remixType: "UGC",
        output:    scripts as unknown as Parameters<typeof db.remix.create>[0]["data"]["output"],
        model,
        tokensUsed,
      },
    });

    // ── 6. Deduct credit ───────────────────────────────────────────────────
    await deductCredit(user.id, "remix.ugc", {
      adId,
      remixId: remix.id,
      model,
      tokensInput,
      tokensOutput,
    }).catch((err) => {
      console.error("[remix/ugc] Credit deduction failed:", err);
    });

    // ── 7. Respond ─────────────────────────────────────────────────────────
    return NextResponse.json({
      adId,
      remixId: remix.id,
      scripts,
      meta: {
        model,
        tokensUsed,
        generatedAt: remix.createdAt.toISOString(),
      },
    });
  },
  UserRole.PRO
);

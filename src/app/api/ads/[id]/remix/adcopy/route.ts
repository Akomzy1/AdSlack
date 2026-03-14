/**
 * POST /api/ads/[id]/remix/adcopy
 *
 * Generates 4 platform-optimised ad copy sets with different persuasion angles.
 *
 * Access:
 *   - Requires authentication (NextAuth session)
 *   - Requires PRO plan or higher
 *   - Costs 1 remix.copy credit per call
 *   - Rate-limited to 5 requests per minute per user
 *
 * Response shape:
 * {
 *   adId:    string,
 *   copies:  Array<{ angle, headline, primaryText, description, ctaButton }>,
 *   meta:    { model, tokensUsed, generatedAt }
 * }
 */

import { NextResponse } from "next/server";
import { UserRole }     from "@prisma/client";
import { withSubscription }          from "@/lib/withSubscription";
import { checkCredit, deductCredit } from "@/lib/credits";
import { db }                        from "@/lib/db";
import { generateAdCopy }            from "@/services/remixEngine";
import { fetchRemixContext, isRateLimited } from "../_lib";

export const runtime     = "nodejs";
export const maxDuration = 60;

export const POST = withSubscription<{ id: string }>(
  async (_req, { user, params }) => {
    const adId = params.id;

    // ── 1. Rate limit ──────────────────────────────────────────────────────
    if (await isRateLimited(user.id, "remix.copy")) {
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
    const creditCheck = await checkCredit(user.id, "remix.copy");
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
      result = await generateAdCopy(ctx.ad, ctx.anatomy);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[remix/adcopy] Generation failed for ad=${adId}:`, message);
      return NextResponse.json(
        { error: "Ad copy generation failed", details: message },
        { status: 502 }
      );
    }

    const { output: copies, tokensInput, tokensOutput, model } = result;
    const tokensUsed = tokensInput + tokensOutput;

    // ── 5. Persist remix ───────────────────────────────────────────────────
    const remix = await db.remix.create({
      data: {
        userId:    user.id,
        adId,
        remixType: "ADCOPY",
        output:    copies,
        model,
        tokensUsed,
      },
    });

    // ── 6. Deduct credit ───────────────────────────────────────────────────
    await deductCredit(user.id, "remix.copy", {
      adId,
      remixId: remix.id,
      model,
      tokensInput,
      tokensOutput,
    }).catch((err) => {
      console.error("[remix/adcopy] Credit deduction failed:", err);
    });

    // ── 7. Respond ─────────────────────────────────────────────────────────
    return NextResponse.json({
      adId,
      remixId: remix.id,
      copies,
      meta: {
        model,
        tokensUsed,
        generatedAt: remix.createdAt.toISOString(),
      },
    });
  },
  UserRole.PRO
);

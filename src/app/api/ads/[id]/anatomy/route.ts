/**
 * GET /api/ads/[id]/anatomy
 *
 * Returns the AI-generated anatomy breakdown for a specific ad.
 *
 * Access:
 *   - Requires authentication (NextAuth session)
 *   - Requires PRO plan or higher
 *   - Costs 1 anatomy credit (deducted only on fresh generation, not cache hits)
 *
 * Caching:
 *   - Results are persisted in AdAnatomy table
 *   - Subsequent requests return the cached analysis instantly (no API call)
 *   - Cache is permanent (anatomy of a given ad doesn't change)
 *
 * Response shape:
 * {
 *   cached:  boolean,
 *   adId:    string,
 *   anatomy: {
 *     hookScore, hookType, emotionalTriggers, scriptStructure,
 *     targetPsychology, colorPalette, audioMood, pacingNotes,
 *     funnelType, fullScriptBreakdown
 *   },
 *   meta: { model, generatedAt, tokensUsed? }
 * }
 */

import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { withSubscription } from "@/lib/withSubscription";
import { checkCredit, deductCredit } from "@/lib/credits";
import { db } from "@/lib/db";
import { generateAnatomy } from "@/services/anatomyEngine";
import type { AdAnatomyInput } from "@/services/anatomyEngine";

export const runtime     = "nodejs";
export const maxDuration = 120; // 2 minutes for cold anatomy generation

// ─── Route handler (wrapped with auth + role check) ──────────────────────────

export const GET = withSubscription<{ id: string }>(
  async (req, { user, params }) => {
    const adId = params.id;

    // ── 1. Fetch the ad ───────────────────────────────────────────────────
    const ad = await db.ad.findUnique({
      where: { id: adId },
      include: {
        metrics: {
          orderBy: { recordedAt: "desc" },
          take: 1,
          select: {
            views:    true,
            likes:    true,
            comments: true,
            shares:   true,
          },
        },
      },
    });

    if (!ad) {
      return NextResponse.json({ error: "Ad not found" }, { status: 404 });
    }

    // ── 2. Return cached anatomy if available ─────────────────────────────
    const existingAnatomy = await db.adAnatomy.findUnique({
      where: { adId },
    });

    if (existingAnatomy) {
      return NextResponse.json({
        cached: true,
        adId,
        anatomy: {
          hookScore:          existingAnatomy.hookScore,
          emotionalTriggers:  existingAnatomy.emotionalTriggers,
          scriptStructure:    existingAnatomy.scriptStructure,
          targetPsychology:   existingAnatomy.targetPsychology,
          colorPalette:       existingAnatomy.colorPalette,
          audioMood:          existingAnatomy.audioMood,
          pacingNotes:        existingAnatomy.pacingNotes,
          funnelType:         existingAnatomy.funnelType,
          fullScriptBreakdown: existingAnatomy.fullScript
            ? JSON.parse(existingAnatomy.fullScript)
            : null,
        },
        meta: {
          model:       existingAnatomy.aiModel,
          generatedAt: existingAnatomy.generatedAt.toISOString(),
        },
      });
    }

    // ── 3. Credit check before generating ────────────────────────────────
    const creditCheck = await checkCredit(user.id, "anatomy.generate");
    if (!creditCheck.allowed) {
      return NextResponse.json(
        {
          error: "Insufficient credits",
          reason: creditCheck.reason,
          creditsRemaining: creditCheck.creditsRemaining,
          creditsLimit: creditCheck.creditsLimit,
        },
        { status: 402 }
      );
    }

    // ── 4. Build input object for the engine ──────────────────────────────
    const m = ad.metrics[0];
    const input: AdAnatomyInput = {
      id:                ad.id,
      platform:          ad.platform,
      brandName:         ad.brandName,
      productName:       ad.productName,
      niche:             ad.niche,
      adType:            ad.adType,
      duration:          ad.duration,
      hookText:          ad.hookText,
      ctaText:           ad.ctaText,
      thumbnailUrl:      ad.thumbnailUrl,
      landingPageUrl:    ad.landingPageUrl,
      estimatedSpendMin: ad.estimatedSpendMin,
      estimatedSpendMax: ad.estimatedSpendMax,
      daysRunning:       ad.daysRunning,
      velocityScore:     ad.velocityScore,
      velocityTier:      ad.velocityTier,
      latestMetrics: m
        ? {
            views:    Number(m.views),
            likes:    Number(m.likes),
            comments: Number(m.comments),
            shares:   Number(m.shares),
          }
        : null,
    };

    // ── 5. Generate anatomy via Claude ────────────────────────────────────
    let engineResult;
    try {
      engineResult = await generateAnatomy(input);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[anatomy] Generation failed for ad=${adId}:`, message);
      return NextResponse.json(
        { error: "Anatomy generation failed", details: message },
        { status: 502 }
      );
    }

    const { anatomy, tokensInput, tokensOutput, model } = engineResult;

    // ── 6. Persist to DB ──────────────────────────────────────────────────
    const savedAnatomy = await db.adAnatomy.create({
      data: {
        adId,
        hookScore:        anatomy.hookScore,
        emotionalTriggers: anatomy.emotionalTriggers,
        scriptStructure:  anatomy.scriptStructure,
        colorPalette:     anatomy.colorPalette ?? undefined,
        audioMood:        anatomy.audioMood,
        pacingNotes:      anatomy.pacingNotes,
        targetPsychology: anatomy.targetPsychology,
        fullScript:       anatomy.fullScriptBreakdown
          ? JSON.stringify(anatomy.fullScriptBreakdown)
          : null,
        funnelType: anatomy.funnelType,
        aiModel:    `${model} (in=${tokensInput} out=${tokensOutput})`,
      },
    });

    // Update the Ad's hookType if we now have a better classification
    if (anatomy.hookTypeMapped && !ad.hookType) {
      await db.ad.update({
        where: { id: adId },
        data:  { hookType: anatomy.hookTypeMapped, status: "ENRICHED" },
      }).catch(() => {}); // Non-fatal
    }

    // ── 7. Deduct credit and log usage ────────────────────────────────────
    await deductCredit(user.id, "anatomy.generate", {
      adId,
      model,
      tokensInput,
      tokensOutput,
    }).catch((err) => {
      // Log but don't fail the request — the analysis was already generated
      console.error("[anatomy] Credit deduction failed:", err);
    });

    // ── 8. Return result ──────────────────────────────────────────────────
    return NextResponse.json({
      cached: false,
      adId,
      anatomy: {
        hookScore:           anatomy.hookScore,
        hookType:            anatomy.hookType,
        emotionalTriggers:   anatomy.emotionalTriggers,
        scriptStructure:     anatomy.scriptStructure,
        targetPsychology:    anatomy.targetPsychology,
        colorPalette:        anatomy.colorPalette,
        audioMood:           anatomy.audioMood,
        pacingNotes:         anatomy.pacingNotes,
        funnelType:          anatomy.funnelType,
        fullScriptBreakdown: anatomy.fullScriptBreakdown,
      },
      meta: {
        model,
        generatedAt: savedAnatomy.generatedAt.toISOString(),
        tokensUsed:  tokensInput + tokensOutput,
      },
    });
  },
  UserRole.PRO   // FREE users cannot access anatomy
);

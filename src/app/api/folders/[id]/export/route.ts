/**
 * GET /api/folders/[id]/export?format=csv|brief
 *
 * Exports all ads in a folder as a downloadable file.
 * Requires SCALE plan or higher.
 *
 * format=csv   → CSV table of all ads with metrics
 * format=brief → Combined plain-text creative briefs for each ad with anatomy
 */

import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { withSubscription } from "@/lib/withSubscription";
import { db } from "@/lib/db";

export const runtime     = "nodejs";
export const maxDuration = 30;

// ─── CSV builder ─────────────────────────────────────────────────────────────

function escCsv(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

function buildCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines   = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escCsv(r[h])).join(",")),
  ];
  return lines.join("\r\n");
}

// ─── Brief builder ────────────────────────────────────────────────────────────

function buildOneBrief(ad: {
  brandName: string;
  productName: string | null;
  platform: string;
  adType: string;
  duration: number | null;
  niche: string;
  daysRunning: number;
  velocityScore: number;
  velocityTier: string;
  hookText: string | null;
  ctaText: string | null;
  anatomy: {
    hookScore: number | null;
    emotionalTriggers: unknown;
    scriptStructure: unknown;
    targetPsychology: string | null;
    audioMood: string | null;
    pacingNotes: string | null;
    funnelType: string | null;
    fullScript: string | null;
  } | null;
}): string {
  const title = `${ad.brandName}${ad.productName ? ` · ${ad.productName}` : ""}`;
  const lines: string[] = [
    `AD BRIEF — ${title}`,
    "=".repeat(60),
    `Platform:   ${ad.platform}  |  Type: ${ad.adType}${ad.duration ? ` · ${ad.duration}s` : ""}`,
    `Niche:      ${ad.niche}`,
    `Days Live:  ${ad.daysRunning}  |  Velocity: ${ad.velocityScore}/100 (${ad.velocityTier})`,
    "",
  ];

  if (ad.hookText) {
    lines.push("HOOK", "-".repeat(40), `"${ad.hookText}"`, "");
  }
  if (ad.ctaText) {
    lines.push("CTA", "-".repeat(40), ad.ctaText, "");
  }

  if (ad.anatomy) {
    const a = ad.anatomy;
    if (a.hookScore !== null) lines.push(`Hook Score: ${a.hookScore}/100`, "");

    if (a.targetPsychology) {
      lines.push("TARGET PSYCHOLOGY", "-".repeat(40), a.targetPsychology, "");
    }

    const triggers = Array.isArray(a.emotionalTriggers) ? (a.emotionalTriggers as string[]).join(", ") : "";
    if (triggers) lines.push("EMOTIONAL TRIGGERS", "-".repeat(40), triggers, "");

    const ss = a.scriptStructure as { formula?: string } | null;
    if (ss?.formula) lines.push("SCRIPT FLOW", "-".repeat(40), ss.formula, "");

    if (a.funnelType) lines.push("FUNNEL TYPE", "-".repeat(40), a.funnelType, "");
    if (a.audioMood)  lines.push("AUDIO MOOD", "-".repeat(40), a.audioMood, "");
    if (a.pacingNotes) lines.push("PACING", "-".repeat(40), a.pacingNotes, "");

    if (a.fullScript) {
      try {
        const script = JSON.parse(a.fullScript) as Array<{ timestamp: string; action: string; text: string }>;
        lines.push("FULL SCRIPT", "-".repeat(40));
        script.forEach((s) => {
          lines.push(`${s.timestamp.padEnd(8)} [${s.action}]`);
          lines.push(`         ${s.text}`);
          lines.push("");
        });
      } catch { /* ignore */ }
    }
  }

  lines.push("─".repeat(60), "");
  return lines.join("\n");
}

// ─── Route handler ────────────────────────────────────────────────────────────

export const GET = withSubscription<{ id: string }>(
  async (req, { user, params }) => {
    const format = new URL(req.url).searchParams.get("format") ?? "csv";

    if (format !== "csv" && format !== "brief") {
      return NextResponse.json({ error: "Invalid format — use csv or brief" }, { status: 400 });
    }

    // Verify folder ownership
    const folder = await db.folder.findFirst({
      where: { id: params.id, userId: user.id },
      select: { id: true, name: true },
    });
    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    // Fetch all ads in folder
    const savedAds = await db.savedAd.findMany({
      where: { folderId: params.id, userId: user.id },
      include: {
        ad: {
          include: {
            anatomy: true,
            metrics: {
              orderBy: { recordedAt: "desc" },
              take: 1,
              select: { views: true, likes: true, comments: true, shares: true },
            },
          },
        },
      },
    });

    const slug = folder.name.toLowerCase().replace(/\s+/g, "-");

    // ── CSV export ─────────────────────────────────────────────────────────
    if (format === "csv") {
      const rows = savedAds.map(({ ad }) => {
        const m = ad.metrics[0];
        return {
          brand:          ad.brandName,
          product:        ad.productName ?? "",
          platform:       ad.platform,
          niche:          ad.niche,
          ad_type:        ad.adType,
          hook:           ad.hookText ?? "",
          cta:            ad.ctaText ?? "",
          views:          m ? Number(m.views) : "",
          likes:          m ? Number(m.likes) : "",
          comments:       m ? Number(m.comments) : "",
          shares:         m ? Number(m.shares) : "",
          velocity_score: ad.velocityScore,
          velocity_tier:  ad.velocityTier,
          days_running:   ad.daysRunning,
          spend_min:      ad.estimatedSpendMin ?? "",
          spend_max:      ad.estimatedSpendMax ?? "",
          hook_score:     ad.anatomy?.hookScore ?? "",
          funnel_type:    ad.anatomy?.funnelType ?? "",
          landing_url:    ad.landingPageUrl ?? "",
        };
      });

      const csv = buildCsv(rows);
      return new Response(csv, {
        headers: {
          "Content-Type":        "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${slug}-ads.csv"`,
        },
      });
    }

    // ── Brief pack export ───────────────────────────────────────────────────
    const parts: string[] = [
      `CREATIVE BRIEF PACK — ${folder.name.toUpperCase()}`,
      "=".repeat(60),
      `Exported from Adslack · ${new Date().toLocaleDateString()}`,
      `${savedAds.length} ad${savedAds.length === 1 ? "" : "s"}`,
      "=".repeat(60),
      "",
    ];

    for (const { ad } of savedAds) {
      parts.push(buildOneBrief({
        brandName:    ad.brandName,
        productName:  ad.productName,
        platform:     ad.platform,
        adType:       ad.adType,
        duration:     ad.duration,
        niche:        ad.niche,
        daysRunning:  ad.daysRunning,
        velocityScore: ad.velocityScore,
        velocityTier:  ad.velocityTier,
        hookText:     ad.hookText,
        ctaText:      ad.ctaText,
        anatomy:      ad.anatomy
          ? {
              hookScore:         ad.anatomy.hookScore,
              emotionalTriggers: ad.anatomy.emotionalTriggers,
              scriptStructure:   ad.anatomy.scriptStructure,
              targetPsychology:  ad.anatomy.targetPsychology,
              audioMood:         ad.anatomy.audioMood,
              pacingNotes:       ad.anatomy.pacingNotes,
              funnelType:        ad.anatomy.funnelType,
              fullScript:        ad.anatomy.fullScript,
            }
          : null,
      }));
    }

    const content = parts.join("\n");
    return new Response(content, {
      headers: {
        "Content-Type":        "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${slug}-briefs.txt"`,
      },
    });
  },
  UserRole.SCALE
);

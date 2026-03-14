/**
 * Vercel Cron Job — recalculates Early Velocity scores every 6 hours.
 *
 * Schedule (vercel.json): "0 *\/6 * * *"
 *
 * Authorization: Vercel automatically sends the CRON_SECRET as a Bearer token
 * when invoking cron routes. The check below prevents unauthorized triggering.
 *
 * Manual trigger (local dev):
 *   curl -X POST http://localhost:3000/api/cron/velocity \
 *     -H "Authorization: Bearer $CRON_SECRET"
 */

import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { recalculateAllVelocityScores } from "@/services/velocityEngine";

export const runtime = "nodejs";
export const maxDuration = 300; // 5-minute timeout for large datasets

export async function POST(req: Request) {
  // ── Auth ─────────────────────────────────────────────────────────────────
  const authHeader = headers().get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("CRON_SECRET env var is not set");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Optional niche scoping (for large datasets, run one niche per job) ──
  const { searchParams } = new URL(req.url);
  const niche = searchParams.get("niche") ?? undefined;
  const dryRun = searchParams.get("dryRun") === "1";
  const batchSize = parseInt(searchParams.get("batchSize") ?? "100", 10);

  console.log(`[velocity-cron] Starting${dryRun ? " (dry run)" : ""}${niche ? ` for niche="${niche}"` : " for all niches"}`);

  // ── Run ───────────────────────────────────────────────────────────────────
  try {
    const result = await recalculateAllVelocityScores({ niche, batchSize, dryRun });

    console.log(
      `[velocity-cron] Done — updated=${result.updated} skipped=${result.skipped} errors=${result.errors} duration=${result.duration_ms}ms`
    );

    // Log niche baselines for observability
    const baselinesSummary = Object.entries(result.nicheBaselines).map(
      ([n, b]) => ({ niche: n, mean: b.mean.toFixed(3), std: b.std.toFixed(3), n: b.sampleSize })
    );
    console.log("[velocity-cron] Niche baselines:", JSON.stringify(baselinesSummary));

    return NextResponse.json({
      ok: true,
      dryRun,
      niche: niche ?? "all",
      updated: result.updated,
      skipped: result.skipped,
      errors: result.errors,
      duration_ms: result.duration_ms,
      nicheBaselines: result.nicheBaselines,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[velocity-cron] Fatal error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Allow GET for Vercel health checks
export async function GET() {
  return NextResponse.json({
    route: "velocity-cron",
    schedule: "0 */6 * * *",
    description: "Recalculates Early Velocity scores for all active ads",
  });
}

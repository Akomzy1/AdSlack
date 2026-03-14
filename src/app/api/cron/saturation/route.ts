/**
 * Vercel Cron Job — recalculates saturation scores every 12 hours.
 *
 * Schedule (vercel.json): "0 *\/12 * * *"
 *
 * Authorization: Vercel automatically sends the CRON_SECRET as a Bearer token
 * when invoking cron routes.
 *
 * Manual trigger (local dev):
 *   curl -X POST http://localhost:3000/api/cron/saturation \
 *     -H "Authorization: Bearer $CRON_SECRET"
 */

import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { runSaturationAnalysis } from "@/services/saturationEngine";

export const runtime    = "nodejs";
export const maxDuration = 300; // 5-minute timeout

export async function POST(req: Request) {
  // ── Auth ─────────────────────────────────────────────────────────────────
  const authHeader = headers().get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("[saturation-cron] CRON_SECRET env var is not set");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Options ───────────────────────────────────────────────────────────────
  const { searchParams } = new URL(req.url);
  const niche     = searchParams.get("niche")     ?? undefined;
  const dryRun    = searchParams.get("dryRun")    === "1";
  const batchSize = parseInt(searchParams.get("batchSize") ?? "200", 10);

  console.log(
    `[saturation-cron] Starting${dryRun ? " (dry run)" : ""}${niche ? ` niche="${niche}"` : " all niches"}`,
  );

  // ── Run ───────────────────────────────────────────────────────────────────
  try {
    const result = await runSaturationAnalysis({ niche, dryRun, batchSize });

    console.log(
      `[saturation-cron] Done — processed=${result.processed} duplicates=${result.duplicates} errors=${result.errors} duration=${result.durationMs}ms`,
    );

    return NextResponse.json({
      ok:          true,
      dryRun,
      niche:       niche ?? "all",
      processed:   result.processed,
      duplicates:  result.duplicates,
      errors:      result.errors,
      duration_ms: result.durationMs,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[saturation-cron] Fatal error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Allow GET for Vercel health checks
export async function GET() {
  return NextResponse.json({
    route:       "saturation-cron",
    schedule:    "0 */12 * * *",
    description: "Recalculates duplication signals and saturation scores for all active ads",
  });
}

/**
 * Vercel Cron Job — runs the ad ingestion pipeline every 4 hours.
 *
 * Schedule (vercel.json): "0 *\/4 * * *"
 *
 * Authorization: Vercel sends CRON_SECRET as a Bearer token automatically.
 *
 * Manual trigger:
 *   curl -X POST http://localhost:3000/api/cron/ingest \
 *     -H "Authorization: Bearer $CRON_SECRET"
 *
 * Optional query params:
 *   source   — meta | tiktok | mock | auto (default: auto)
 *   country  — ISO-2 code (default: US)
 *   limit    — max ads per source (default: 500)
 *   dryRun   — 1 to skip DB writes
 */

import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { runIngestion } from "@/services/ingestion/scheduler";
import type { IngestionSource } from "@/services/ingestion/scheduler";

export const runtime    = "nodejs";
export const maxDuration = 300; // 5-minute cap (Vercel Pro max)

export async function POST(req: Request) {
  // ── Auth ─────────────────────────────────────────────────────────────────
  const authHeader = headers().get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("[ingest-cron] CRON_SECRET env var is not set");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Options from query params ─────────────────────────────────────────────
  const { searchParams } = new URL(req.url);
  const source  = (searchParams.get("source")  ?? "auto") as IngestionSource;
  const country = searchParams.get("country")  ?? "US";
  const limit   = parseInt(searchParams.get("limit") ?? "500", 10);
  const dryRun  = searchParams.get("dryRun")  === "1";

  const validSources: IngestionSource[] = ["meta", "tiktok", "mock", "auto"];
  if (!validSources.includes(source)) {
    return NextResponse.json(
      { error: `Invalid source "${source}". Must be one of: ${validSources.join(", ")}` },
      { status: 400 }
    );
  }

  console.log(
    `[ingest-cron] Starting — source=${source} country=${country} limit=${limit}${dryRun ? " (dry run)" : ""}`
  );

  // ── Run ───────────────────────────────────────────────────────────────────
  try {
    const result = await runIngestion({
      sources: source,
      country,
      limit,
      dryRun,
      recalculateVelocity: false, // velocity cron runs independently on its own schedule
    });

    return NextResponse.json({
      ok: true,
      dryRun,
      sources: result.sources.map((s) => ({
        source:   s.source,
        created:  s.created,
        updated:  s.updated,
        skipped:  s.skipped,
        errors:   s.errors,
        duration_ms: s.duration_ms,
        messages: s.messages.slice(0, 10), // cap message array in response
      })),
      total:    result.total,
      duration_ms: result.duration_ms,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[ingest-cron] Fatal error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    route:       "ingest-cron",
    schedule:    "0 */4 * * *",
    description: "Fetches new ads from Meta Ad Library + TikTok Creative Center",
    sources:     ["meta", "tiktok", "mock"],
    configured: {
      meta:   Boolean(process.env.META_ACCESS_TOKEN),
      tiktok: Boolean(process.env.TIKTOK_ACCESS_TOKEN),
      mock:   true,
    },
  });
}

/**
 * POST /api/admin/ingest
 *
 * Manual ingestion trigger for testing and ops use.
 *
 * Authentication (either is sufficient):
 *   1. Valid session with AGENCY role (UI-triggered)
 *   2. x-admin-secret header matching ADMIN_SECRET env var (CLI/script-triggered)
 *
 * Body (JSON, all optional):
 * {
 *   source:              "meta" | "tiktok" | "mock" | "auto"  (default: "auto")
 *   country:             "US"                                  (default: "US")
 *   limit:               500                                   (default: 500)
 *   dryRun:              false                                 (default: false)
 *   recalculateVelocity: true                                  (default: true)
 * }
 *
 * Example (curl):
 *   curl -X POST http://localhost:3000/api/admin/ingest \
 *     -H "Content-Type: application/json" \
 *     -H "x-admin-secret: $ADMIN_SECRET" \
 *     -d '{"source":"mock","dryRun":false,"recalculateVelocity":true}'
 */

import { getServerSession } from "next-auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { runIngestion } from "@/services/ingestion/scheduler";
import type { IngestionSource } from "@/services/ingestion/scheduler";

export const runtime     = "nodejs";
export const maxDuration = 300;

// ─── Request schema ───────────────────────────────────────────────────────────

const IngestBodySchema = z.object({
  source:              z.enum(["meta", "tiktok", "mock", "auto"]).default("auto"),
  country:             z.string().length(2).default("US"),
  limit:               z.number().int().min(1).max(2000).default(500),
  dryRun:              z.boolean().default(false),
  recalculateVelocity: z.boolean().default(true),
});

type IngestBody = z.infer<typeof IngestBodySchema>;

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function isAuthorized(): Promise<boolean> {
  // Path 1: valid session with AGENCY role
  const session = await getServerSession(authOptions);
  if (session?.user?.role === "AGENCY") return true;

  // Path 2: x-admin-secret header
  const adminSecret = process.env.ADMIN_SECRET;
  if (adminSecret) {
    const provided = headers().get("x-admin-secret");
    if (provided === adminSecret) return true;
  }

  return false;
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  if (!(await isAuthorized())) {
    return NextResponse.json(
      { error: "Unauthorized. Requires AGENCY role or x-admin-secret header." },
      { status: 401 }
    );
  }

  // ── Parse body ───────────────────────────────────────────────────────────
  let body: IngestBody;
  try {
    const raw = req.headers.get("content-type")?.includes("application/json")
      ? await req.json()
      : {};
    body = IngestBodySchema.parse(raw);
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid request body", details: String(err) },
      { status: 400 }
    );
  }

  console.log(
    `[admin/ingest] Triggered — source=${body.source} country=${body.country} ` +
    `limit=${body.limit} dryRun=${body.dryRun} recalcVelocity=${body.recalculateVelocity}`
  );

  // ── Run ──────────────────────────────────────────────────────────────────
  try {
    const result = await runIngestion({
      sources:             body.source as IngestionSource,
      country:             body.country,
      limit:               body.limit,
      dryRun:              body.dryRun,
      recalculateVelocity: body.recalculateVelocity,
    });

    return NextResponse.json({
      ok: true,
      dryRun:      body.dryRun,
      sources:     result.sources.map((s) => ({
        source:      s.source,
        created:     s.created,
        updated:     s.updated,
        skipped:     s.skipped,
        errors:      s.errors,
        duration_ms: s.duration_ms,
        messages:    s.messages.slice(0, 20),
      })),
      total:       result.total,
      duration_ms: result.duration_ms,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[admin/ingest] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── Status endpoint ───────────────────────────────────────────────────────────

export async function GET() {
  if (!(await isAuthorized())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    endpoint:    "POST /api/admin/ingest",
    description: "Manual ingestion trigger",
    configured: {
      meta:   Boolean(process.env.META_ACCESS_TOKEN),
      tiktok: Boolean(process.env.TIKTOK_ACCESS_TOKEN),
      mock:   true,
    },
    schema: {
      source:              "meta | tiktok | mock | auto",
      country:             "ISO-2 code, default US",
      limit:               "1–2000, default 500",
      dryRun:              "boolean, default false",
      recalculateVelocity: "boolean, default true",
    },
  });
}

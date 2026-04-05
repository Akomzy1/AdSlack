/**
 * scheduler.ts
 *
 * Orchestrates the Adsentify ingestion pipeline.
 *
 * Responsibilities:
 *  1. Decide which ingesters to run based on available env vars
 *  2. Run them (sequentially to avoid hammering APIs simultaneously)
 *  3. Aggregate results
 *  4. Optionally trigger a velocity score recalculation
 *
 * Sources:
 *  "meta"   — Meta Ad Library API (requires META_ACCESS_TOKEN)
 *  "tiktok" — TikTok Creative Center API (requires TIKTOK_ACCESS_TOKEN)
 *  "mock"   — Deterministic fake data (no env vars needed)
 *  "auto"   — Runs all configured sources; falls back to mock if neither API key is set
 */

import { runMetaIngestion }   from "./metaIngester";
import { runTiktokIngestion } from "./tiktokIngester";
import { runMockIngestion }   from "./mockIngester";
import type { IngestionResult, IngesterOptions, SchedulerResult } from "./types";

// ─── Source type ──────────────────────────────────────────────────────────────

export type IngestionSource = "meta" | "tiktok" | "mock" | "auto";

// ─── Orchestrator ─────────────────────────────────────────────────────────────

export interface SchedulerOptions extends IngesterOptions {
  /**
   * Which sources to run.
   *  - "auto": runs meta + tiktok if tokens are present, falls back to mock
   *  - explicit array: runs only the named sources
   */
  sources?: IngestionSource | IngestionSource[];
  /**
   * After ingestion, trigger a velocity score recalculation.
   * Useful when calling from the admin endpoint.
   * Default: false (the scheduled velocity cron handles this on its own cadence)
   */
  recalculateVelocity?: boolean;
}

function hasMetaToken()   { return Boolean(process.env.META_ACCESS_TOKEN); }
function hasTiktokToken() { return Boolean(process.env.TIKTOK_ACCESS_TOKEN); }

/**
 * Expand "auto" into the concrete list of sources to run.
 * Falls back to mock when no real API keys are configured.
 */
function resolveSources(input: IngestionSource | IngestionSource[]): IngestionSource[] {
  const list = Array.isArray(input) ? input : [input];

  if (!list.includes("auto")) return list;

  const resolved: IngestionSource[] = [];
  if (hasMetaToken())   resolved.push("meta");
  if (hasTiktokToken()) resolved.push("tiktok");

  // Always run mock in non-production OR when no real tokens are set
  const isProduction = process.env.NODE_ENV === "production";
  const hasMockFlag  = process.env.MOCK_INGESTION === "1";

  if (!isProduction || hasMockFlag || resolved.length === 0) {
    resolved.push("mock");
  }

  return resolved.length > 0 ? resolved : ["mock"];
}

async function runSource(
  source: IngestionSource,
  opts: IngesterOptions
): Promise<IngestionResult> {
  switch (source) {
    case "meta":   return runMetaIngestion(opts);
    case "tiktok": return runTiktokIngestion(opts);
    case "mock":   return runMockIngestion(opts);
    default: {
      const msg = `Unknown ingestion source: ${source as string}`;
      console.error(`[scheduler] ${msg}`);
      return {
        source: source as string,
        created: 0, updated: 0, skipped: 0, errors: 1,
        duration_ms: 0, messages: [msg],
      };
    }
  }
}

/**
 * Run the ingestion pipeline for the given sources.
 *
 * Sources are run sequentially (not in parallel) to prevent overwhelming
 * external rate limits and the database connection pool.
 */
export async function runIngestion(
  opts: SchedulerOptions = {}
): Promise<SchedulerResult> {
  const wallStart = Date.now();

  const sourceInput = opts.sources ?? "auto";
  const sources     = resolveSources(sourceInput);

  console.log(
    `[scheduler] Starting ingestion — sources=[${sources.join(",")}]` +
    `${opts.dryRun ? " (dry run)" : ""}` +
    `${opts.country ? ` country=${opts.country}` : ""}`
  );

  const ingesterOpts: IngesterOptions = {
    limit:   opts.limit,
    country: opts.country,
    dryRun:  opts.dryRun,
  };

  const results: IngestionResult[] = [];

  for (const source of sources) {
    console.log(`[scheduler] Running source: ${source}`);
    try {
      const result = await runSource(source, ingesterOpts);
      results.push(result);
      console.log(
        `[scheduler] ${source} done — ` +
        `created=${result.created} updated=${result.updated} ` +
        `skipped=${result.skipped} errors=${result.errors} ` +
        `(${result.duration_ms}ms)`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[scheduler] Source ${source} threw: ${msg}`);
      results.push({
        source,
        created: 0, updated: 0, skipped: 0, errors: 1,
        duration_ms: 0, messages: [msg],
      });
    }
  }

  // Optionally recalculate velocity scores so the dashboard reflects new data immediately
  if (opts.recalculateVelocity && !opts.dryRun) {
    const totalNewAds = results.reduce((acc, r) => acc + r.created + r.updated, 0);
    if (totalNewAds > 0) {
      console.log(`[scheduler] Triggering velocity recalculation for ${totalNewAds} new/updated ads...`);
      try {
        const { recalculateAllVelocityScores } = await import("@/services/velocityEngine");
        const velResult = await recalculateAllVelocityScores({ batchSize: 100 });
        console.log(
          `[scheduler] Velocity recalc done — ` +
          `updated=${velResult.updated} errors=${velResult.errors} (${velResult.duration_ms}ms)`
        );
      } catch (err) {
        console.error("[scheduler] Velocity recalc failed:", err);
      }
    }
  }

  const total = results.reduce(
    (acc, r) => ({
      created: acc.created + r.created,
      updated: acc.updated + r.updated,
      skipped: acc.skipped + r.skipped,
      errors:  acc.errors  + r.errors,
    }),
    { created: 0, updated: 0, skipped: 0, errors: 0 }
  );

  const duration_ms = Date.now() - wallStart;

  console.log(
    `[scheduler] All sources complete — ` +
    `total created=${total.created} updated=${total.updated} ` +
    `skipped=${total.skipped} errors=${total.errors} (${duration_ms}ms)`
  );

  return { sources: results, total, duration_ms };
}

/**
 * Vercel Cron Job — runs alert matching every 30 minutes.
 * Also handles daily/weekly digest dispatching based on current UTC hour.
 *
 * Schedule (vercel.json): "* /30 * * * *"  (every 30 min)
 *
 * Authorization: Vercel sends CRON_SECRET as Bearer token.
 *
 * Manual trigger (local dev):
 *   curl -X POST http://localhost:3000/api/cron/alerts \
 *     -H "Authorization: Bearer $CRON_SECRET"
 */

import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { runAlertCycle, sendDigestEmails } from "@/lib/alertEngine";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST() {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = headers().get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("[cron/alerts] CRON_SECRET env var is not set");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const utcHour = now.getUTCHours();

  console.log(`[cron/alerts] Starting at ${now.toISOString()} (UTC ${utcHour}:xx)`);

  // ── 1. Run instant-alert matching ─────────────────────────────────────────
  const cycleResult = await runAlertCycle();
  console.log(`[cron/alerts] Cycle: ${JSON.stringify(cycleResult)}`);

  // ── 2. Daily digest at 08:00 UTC ──────────────────────────────────────────
  let dailyResult = { emailsSent: 0, errors: [] as string[] };
  if (utcHour === 8) {
    dailyResult = await sendDigestEmails("DAILY_DIGEST");
    console.log(`[cron/alerts] Daily digest: ${JSON.stringify(dailyResult)}`);
  }

  // ── 3. Weekly digest on Monday 08:00 UTC ──────────────────────────────────
  let weeklyResult = { emailsSent: 0, errors: [] as string[] };
  if (utcHour === 8 && now.getUTCDay() === 1) {
    weeklyResult = await sendDigestEmails("WEEKLY_DIGEST");
    console.log(`[cron/alerts] Weekly digest: ${JSON.stringify(weeklyResult)}`);
  }

  return NextResponse.json({
    ok: true,
    cycle: cycleResult,
    dailyDigest: dailyResult,
    weeklyDigest: weeklyResult,
    runAt: now.toISOString(),
  });
}

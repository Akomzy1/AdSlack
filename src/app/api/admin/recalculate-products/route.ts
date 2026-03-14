/**
 * POST /api/admin/recalculate-products
 *
 * Triggers a full product-matching + lifecycle recalculation pass.
 * Protected by either:
 *   - CRON_SECRET header (set by Vercel Cron / uptime monitors)
 *   - Admin session (ADMIN_EMAILS env var or AGENCY role)
 *
 * Vercel cron.json example:
 *   { "crons": [{ "path": "/api/admin/recalculate-products", "schedule": "0 */12 * * *" }] }
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { UserRole } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { runProductMatching } from "@/services/productMatcher";

// ── Auth helpers ──────────────────────────────────────────────────────────────

function isCronRequest(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("x-cron-secret") === secret;
}

function isAdmin(email: string | null | undefined, role: UserRole): boolean {
  if (!email) return false;
  const adminEmails =
    process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()) ?? [];
  return adminEmails.includes(email.toLowerCase()) || role === UserRole.AGENCY;
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  // Allow cron runners (Vercel, uptime monitors) without a session
  if (!isCronRequest(req)) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAdmin(session.user.email, session.user.role as UserRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const result = await runProductMatching();

  return NextResponse.json({
    success: true,
    result: {
      clusters:   result.clusters,
      upserted:   result.upserted,
      linked:     result.linked,
      durationMs: result.durationMs,
    },
  });
}

// Also accept GET so Vercel Cron (which sends GET) works without extra config
export const GET = POST;

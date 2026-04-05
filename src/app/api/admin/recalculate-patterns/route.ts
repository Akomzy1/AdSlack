/**
 * POST /api/admin/recalculate-patterns
 *
 * Triggers a full creative-pattern detection pass.
 * Protected by:
 *   - CRON_SECRET header (set by Vercel Cron)
 *   - Admin session (ADMIN_EMAILS env var or AGENCY role)
 *
 * Vercel cron schedule: every 6 hours (0 every-6 * * *)
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { UserRole } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { runPatternDetection } from "@/services/patternEngine";

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

export async function POST(req: Request) {
  if (!isCronRequest(req)) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAdmin(session.user.email, session.user.role as UserRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const result = await runPatternDetection();

  return NextResponse.json({
    success: true,
    result: {
      detected:   result.detected,
      upserted:   result.upserted,
      durationMs: result.durationMs,
    },
  });
}

export const GET = POST;

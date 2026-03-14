/**
 * GET  /api/alerts  — list the current user's alert rules
 * POST /api/alerts  — create a new alert rule
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { AlertFrequency } from "@prisma/client";
import { withSubscription } from "@/lib/withSubscription";
import { db } from "@/lib/db";
import { ALERT_LIMITS } from "@/lib/alertEngine";

const CreateAlertSchema = z.object({
  name: z.string().min(1).max(80),
  niches: z.array(z.string()).default([]),
  platforms: z.array(z.string()).default([]),
  velocityThreshold: z.number().min(1).max(100).default(90),
  keywords: z.string().max(200).optional(),
  frequency: z.nativeEnum(AlertFrequency).default(AlertFrequency.INSTANT),
});

export const GET = withSubscription(async (_req, { user }) => {
  const rules = await db.alertRule.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { notifications: true } },
    },
  });

  return NextResponse.json({
    rules: rules.map((r) => ({
      id: r.id,
      name: r.name,
      niches: r.niches,
      platforms: r.platforms,
      velocityThreshold: r.velocityThreshold,
      keywords: r.keywords,
      frequency: r.frequency,
      isActive: r.isActive,
      notificationCount: r._count.notifications,
      lastCheckedAt: r.lastCheckedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    })),
    limit: ALERT_LIMITS[user.role] ?? 0,
  });
});

export const POST = withSubscription(async (req, { user }) => {
  const limit = ALERT_LIMITS[user.role] ?? 0;
  if (limit === 0) {
    return NextResponse.json(
      { error: "Your plan does not include alert rules. Upgrade to PRO or higher." },
      { status: 403 }
    );
  }

  const existingCount = await db.alertRule.count({ where: { userId: user.id } });
  if (existingCount >= limit) {
    return NextResponse.json(
      { error: `Alert rule limit reached (${limit} on your plan).`, limit },
      { status: 422 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = CreateAlertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { name, niches, platforms, velocityThreshold, keywords, frequency } = parsed.data;

  const rule = await db.alertRule.create({
    data: {
      userId: user.id,
      name,
      niches,
      platforms,
      velocityThreshold,
      keywords: keywords ?? null,
      frequency,
    },
  });

  return NextResponse.json({
    rule: {
      id: rule.id,
      name: rule.name,
      niches: rule.niches,
      platforms: rule.platforms,
      velocityThreshold: rule.velocityThreshold,
      keywords: rule.keywords,
      frequency: rule.frequency,
      isActive: rule.isActive,
      notificationCount: 0,
      lastCheckedAt: null,
      createdAt: rule.createdAt.toISOString(),
    },
  }, { status: 201 });
});

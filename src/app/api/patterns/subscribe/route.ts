/**
 * POST /api/patterns/subscribe
 *
 * Creates a PATTERN_ALERT AlertRule for the current user.
 * Body: { patternId, name?, frequency?, niches? }
 *
 * Plan gate: same ALERT_LIMITS as velocity alerts (PRO+).
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { AlertFrequency, AlertRuleType, UserRole } from "@prisma/client";
import { withSubscription } from "@/lib/withSubscription";
import { db } from "@/lib/db";
import { ALERT_LIMITS } from "@/lib/alertEngine";

const SubscribeSchema = z.object({
  patternId: z.string().cuid(),
  name: z.string().min(1).max(80).optional(),
  frequency: z.nativeEnum(AlertFrequency).default(AlertFrequency.INSTANT),
  niches: z.array(z.string()).default([]),
});

export const POST = withSubscription(async (req, { user }) => {
  const limit = ALERT_LIMITS[user.role] ?? 0;
  if (limit === 0) {
    return NextResponse.json(
      { error: "Your plan does not include alerts. Upgrade to PRO or higher." },
      { status: 403 }
    );
  }

  const existingCount = await db.alertRule.count({ where: { userId: user.id } });
  if (existingCount >= limit) {
    return NextResponse.json(
      { error: `Alert limit reached (${limit}). Upgrade your plan for more.` },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = SubscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }
  const { patternId, name, frequency, niches } = parsed.data;

  // Verify pattern exists
  const pattern = await db.creativePattern.findUnique({ where: { id: patternId } });
  if (!pattern) {
    return NextResponse.json({ error: "Pattern not found" }, { status: 404 });
  }

  // Avoid duplicate subscriptions for the same pattern
  const existing = await db.alertRule.findFirst({
    where: { userId: user.id, patternId, ruleType: AlertRuleType.PATTERN_ALERT },
  });
  if (existing) {
    return NextResponse.json({ error: "Already subscribed to this pattern" }, { status: 409 });
  }

  const rule = await db.alertRule.create({
    data: {
      userId: user.id,
      name: name ?? `Pattern: ${pattern.patternName}`,
      ruleType: AlertRuleType.PATTERN_ALERT,
      patternId,
      niches,
      frequency,
      velocityThreshold: 0, // not used for pattern alerts
    },
  });

  return NextResponse.json({ rule: { id: rule.id, name: rule.name } }, { status: 201 });
}, UserRole.PRO);

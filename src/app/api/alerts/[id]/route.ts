/**
 * GET    /api/alerts/[id]  — get single rule
 * PATCH  /api/alerts/[id]  — update rule (full or toggle isActive)
 * DELETE /api/alerts/[id]  — delete rule
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { AlertFrequency } from "@prisma/client";
import { withSubscription } from "@/lib/withSubscription";
import { db } from "@/lib/db";

const UpdateAlertSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  niches: z.array(z.string()).optional(),
  platforms: z.array(z.string()).optional(),
  velocityThreshold: z.number().min(1).max(100).optional(),
  keywords: z.string().max(200).nullable().optional(),
  frequency: z.nativeEnum(AlertFrequency).optional(),
  isActive: z.boolean().optional(),
});

async function getOwnedRule(userId: string, id: string) {
  const rule = await db.alertRule.findUnique({ where: { id } });
  if (!rule || rule.userId !== userId) return null;
  return rule;
}

export const GET = withSubscription<{ id: string }>(async (_req, { user, params }) => {
  const rule = await getOwnedRule(user.id, params.id);
  if (!rule) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ rule });
});

export const PATCH = withSubscription<{ id: string }>(async (req, { user, params }) => {
  const rule = await getOwnedRule(user.id, params.id);
  if (!rule) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = UpdateAlertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }

  const updated = await db.alertRule.update({
    where: { id: params.id },
    data: {
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.niches !== undefined && { niches: parsed.data.niches }),
      ...(parsed.data.platforms !== undefined && { platforms: parsed.data.platforms }),
      ...(parsed.data.velocityThreshold !== undefined && { velocityThreshold: parsed.data.velocityThreshold }),
      ...(parsed.data.keywords !== undefined && { keywords: parsed.data.keywords }),
      ...(parsed.data.frequency !== undefined && { frequency: parsed.data.frequency }),
      ...(parsed.data.isActive !== undefined && { isActive: parsed.data.isActive }),
    },
  });

  return NextResponse.json({ rule: updated });
});

export const DELETE = withSubscription<{ id: string }>(async (_req, { user, params }) => {
  const rule = await getOwnedRule(user.id, params.id);
  if (!rule) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.alertRule.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
});

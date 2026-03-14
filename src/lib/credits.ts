import { UserRole } from "@prisma/client";
import { PLANS } from "@/constants/plans";
import { db } from "@/lib/db";

export type CreditAction =
  | "remix.hooks"
  | "remix.script"
  | "remix.copy"
  | "remix.brief"
  | "remix.wireframe"
  | "anatomy.generate";

/** Cost per action in credits */
const CREDIT_COST: Record<CreditAction, number> = {
  "remix.hooks": 1,
  "remix.script": 1,
  "remix.copy": 1,
  "remix.brief": 1,
  "remix.wireframe": 2,
  "anatomy.generate": 1,
};

export interface CreditCheckResult {
  allowed: boolean;
  reason?: "unlimited" | "sufficient" | "no_credits" | "insufficient" | "no_subscription";
  creditsRemaining: number;
  creditsUsed: number;
  creditsLimit: number;
}

/**
 * Check whether the user has enough credits for an action.
 * Does NOT deduct — call deductCredit after confirming the action succeeded.
 */
export async function checkCredit(
  userId: string,
  action: CreditAction
): Promise<CreditCheckResult> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      subscription: { select: { creditsUsed: true, creditsLimit: true } },
    },
  });

  if (!user) {
    return { allowed: false, reason: "no_subscription", creditsRemaining: 0, creditsUsed: 0, creditsLimit: 0 };
  }

  const plan = PLANS[user.role];

  // Unlimited plans — skip credit tracking
  if (plan.creditsPerMonth === -1) {
    return { allowed: true, reason: "unlimited", creditsRemaining: 999999, creditsUsed: 0, creditsLimit: 999999 };
  }

  if (!user.subscription) {
    return { allowed: false, reason: "no_subscription", creditsRemaining: 0, creditsUsed: 0, creditsLimit: 0 };
  }

  const cost = CREDIT_COST[action];
  const creditsUsed = user.subscription.creditsUsed;
  const creditsLimit = user.subscription.creditsLimit;
  const creditsRemaining = Math.max(0, creditsLimit - creditsUsed);

  if (creditsRemaining === 0) {
    return { allowed: false, reason: "no_credits", creditsRemaining: 0, creditsUsed, creditsLimit };
  }

  if (creditsRemaining < cost) {
    return { allowed: false, reason: "insufficient", creditsRemaining, creditsUsed, creditsLimit };
  }

  return { allowed: true, reason: "sufficient", creditsRemaining, creditsUsed, creditsLimit };
}

/**
 * Atomically deduct credits for an action and log usage.
 * Returns the updated credits remaining.
 * Throws if the user doesn't have sufficient credits.
 */
export async function deductCredit(
  userId: string,
  action: CreditAction,
  metadata?: Record<string, unknown>
): Promise<number> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true, subscription: { select: { creditsUsed: true, creditsLimit: true } } },
  });

  if (!user) throw new Error("User not found");

  const plan = PLANS[user.role];

  // No deduction for unlimited plans — just log
  if (plan.creditsPerMonth === -1) {
    await db.usageLog.create({ data: { userId, action, metadata: metadata ?? {} } });
    return 999999;
  }

  if (!user.subscription) throw new Error("No subscription found");

  const cost = CREDIT_COST[action];
  const { creditsUsed, creditsLimit } = user.subscription;

  if (creditsUsed + cost > creditsLimit) {
    throw new Error("Insufficient credits");
  }

  const [updated] = await db.$transaction([
    db.subscription.update({
      where: { userId },
      data: { creditsUsed: { increment: cost } },
      select: { creditsUsed: true, creditsLimit: true },
    }),
    db.usageLog.create({ data: { userId, action, metadata: metadata ?? {} } }),
  ]);

  return Math.max(0, updated.creditsLimit - updated.creditsUsed);
}

/**
 * Reset a user's credits to the current plan limit.
 * Called from the Stripe webhook on invoice.payment_succeeded.
 */
export async function resetCredits(userId: string, role: UserRole): Promise<void> {
  const plan = PLANS[role];
  const creditsLimit = plan.creditsPerMonth === -1 ? 999999 : plan.creditsPerMonth;

  await db.subscription.update({
    where: { userId },
    data: { creditsUsed: 0, creditsLimit, billingCycleStart: new Date() },
  });
}

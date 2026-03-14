import { UserRole } from "@prisma/client";
import { PLANS } from "@/constants/plans";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/**
 * Create a Stripe Checkout session for a plan upgrade.
 * Returns the URL to redirect the user to.
 */
export async function createCheckoutSession({
  userId,
  userEmail,
  targetRole,
}: {
  userId: string;
  userEmail: string;
  targetRole: UserRole;
}): Promise<string> {
  const plan = PLANS[targetRole];
  if (!plan.stripePriceEnvKey) throw new Error("No price configured for FREE plan");

  const priceId = process.env[plan.stripePriceEnvKey];
  if (!priceId) throw new Error(`Missing env var: ${plan.stripePriceEnvKey}`);

  // Retrieve or create Stripe customer
  let stripeCustomerId: string | undefined;
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });

  if (user?.stripeCustomerId) {
    stripeCustomerId = user.stripeCustomerId;
  } else {
    const customer = await stripe.customers.create({
      email: userEmail,
      metadata: { userId },
    });
    stripeCustomerId = customer.id;
    await db.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customer.id },
    });
  }

  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${APP_URL}/billing?success=1`,
    cancel_url: `${APP_URL}/billing?canceled=1`,
    metadata: { userId, targetRole },
    subscription_data: {
      metadata: { userId, targetRole },
    },
    allow_promotion_codes: true,
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return session.url;
}

/**
 * Create a Stripe Customer Portal session for managing subscriptions.
 */
export async function createPortalSession(userId: string): Promise<string> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });

  if (!user?.stripeCustomerId) {
    throw new Error("No Stripe customer found for this user");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${APP_URL}/billing`,
  });

  return session.url;
}

/**
 * Map a Stripe price ID back to a UserRole.
 */
export function priceIdToRole(priceId: string): UserRole | null {
  const entries = Object.entries(PLANS) as [UserRole, (typeof PLANS)[UserRole]][];
  for (const [role, plan] of entries) {
    if (!plan.stripePriceEnvKey) continue;
    const envPriceId = process.env[plan.stripePriceEnvKey];
    if (envPriceId === priceId) return role;
  }
  return null;
}

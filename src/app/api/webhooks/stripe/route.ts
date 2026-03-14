import { UserRole } from "@prisma/client";
import { headers } from "next/headers";
import type Stripe from "stripe";
import { PLANS } from "@/constants/plans";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { priceIdToRole } from "@/lib/billing";

// Disable body parsing — Stripe needs the raw body for signature verification
export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get("stripe-signature");

  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`Webhook signature verification failed: ${message}`);
    return new Response(`Webhook Error: ${message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      // ── New subscription activated via Checkout ─────────────────────────
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;

        const userId = session.metadata?.userId;
        const targetRole = session.metadata?.targetRole as UserRole | undefined;
        const stripeSubscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;

        if (!userId || !targetRole || !stripeSubscriptionId) {
          console.error("checkout.session.completed: missing metadata", session.metadata);
          break;
        }

        const plan = PLANS[targetRole];
        const creditsLimit =
          plan.creditsPerMonth === -1 ? 999999 : plan.creditsPerMonth;

        await db.$transaction([
          db.user.update({
            where: { id: userId },
            data: {
              role: targetRole,
              stripeSubscriptionId,
            },
          }),
          db.subscription.upsert({
            where: { userId },
            update: {
              plan: targetRole,
              stripeSubscriptionId,
              creditsUsed: 0,
              creditsLimit,
              billingCycleStart: new Date(),
            },
            create: {
              userId,
              plan: targetRole,
              stripeSubscriptionId,
              creditsUsed: 0,
              creditsLimit,
              billingCycleStart: new Date(),
            },
          }),
        ]);

        console.log(`✓ Activated ${targetRole} for user ${userId}`);
        break;
      }

      // ── Monthly renewal — reset credits ─────────────────────────────────
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        // Only process subscription renewals, not the initial payment
        if (invoice.billing_reason !== "subscription_cycle") break;

        const stripeSubId =
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription?.id;
        if (!stripeSubId) break;

        const subscription = await stripe.subscriptions.retrieve(stripeSubId);
        const userId = subscription.metadata.userId;
        if (!userId) break;

        const priceId = subscription.items.data[0]?.price.id;
        const role = priceId ? priceIdToRole(priceId) : null;
        if (!role) break;

        const plan = PLANS[role];
        const creditsLimit =
          plan.creditsPerMonth === -1 ? 999999 : plan.creditsPerMonth;

        await db.subscription.update({
          where: { userId },
          data: {
            creditsUsed: 0,
            creditsLimit,
            billingCycleStart: new Date(),
          },
        });

        console.log(`✓ Credits reset for user ${userId} (${role})`);
        break;
      }

      // ── Subscription cancelled — downgrade to FREE ──────────────────────
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata.userId;
        if (!userId) break;

        await db.$transaction([
          db.user.update({
            where: { id: userId },
            data: {
              role: UserRole.FREE,
              stripeSubscriptionId: null,
            },
          }),
          db.subscription.update({
            where: { userId },
            data: {
              plan: UserRole.FREE,
              stripeSubscriptionId: null,
              creditsUsed: 0,
              creditsLimit: PLANS.FREE.creditsPerMonth,
              billingCycleStart: new Date(),
            },
          }),
        ]);

        console.log(`✓ Downgraded user ${userId} to FREE`);
        break;
      }

      // ── Subscription updated (plan change mid-cycle) ─────────────────────
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata.userId;
        if (!userId) break;

        const priceId = subscription.items.data[0]?.price.id;
        const role = priceId ? priceIdToRole(priceId) : null;
        if (!role) break;

        const plan = PLANS[role];
        const creditsLimit =
          plan.creditsPerMonth === -1 ? 999999 : plan.creditsPerMonth;

        await db.$transaction([
          db.user.update({
            where: { id: userId },
            data: { role },
          }),
          db.subscription.update({
            where: { userId },
            data: { plan: role, creditsLimit },
          }),
        ]);

        console.log(`✓ Updated plan to ${role} for user ${userId}`);
        break;
      }

      default:
        // Unhandled event — ignore silently
        break;
    }
  } catch (err) {
    console.error(`Error processing webhook ${event.type}:`, err);
    return new Response("Webhook handler error", { status: 500 });
  }

  return new Response(null, { status: 200 });
}

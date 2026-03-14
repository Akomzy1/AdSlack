import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { PLANS } from "@/constants/plans";
import { PricingTable } from "@/components/billing/PricingTable";

export const metadata: Metadata = { title: "Billing & Plans" };

export default async function BillingPage({
  searchParams,
}: {
  searchParams: { success?: string; canceled?: string };
}) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  const subscription = userId
    ? await db.subscription.findUnique({
        where: { userId },
        select: {
          plan: true,
          creditsUsed: true,
          creditsLimit: true,
          billingCycleStart: true,
        },
      })
    : null;

  const plan = PLANS[session?.user?.role ?? "FREE"];
  const creditsRemaining = Math.max(
    0,
    (subscription?.creditsLimit ?? 0) - (subscription?.creditsUsed ?? 0)
  );
  const unlimited = plan.creditsPerMonth === -1;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      {/* Toast banners */}
      {searchParams.success === "1" && (
        <div className="mb-8 flex items-center gap-3 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          <span className="text-base">🎉</span>
          <span>
            <strong>Subscription activated!</strong> Your plan has been upgraded. Enjoy your new features.
          </span>
        </div>
      )}
      {searchParams.canceled === "1" && (
        <div className="mb-8 flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          <span className="text-base">ℹ️</span>
          <span>Checkout was canceled. No charges were made.</span>
        </div>
      )}

      {/* Header */}
      <div className="mb-10 flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Billing &amp; Plans
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your subscription and AI credit usage.
        </p>
      </div>

      {/* Current plan summary */}
      <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Current plan"
          value={plan.name}
          sub={plan.price === 0 ? "Free forever" : `$${plan.price}/month`}
          accent={plan.highlight}
        />
        <StatCard
          label="AI credits"
          value={unlimited ? "Unlimited" : String(creditsRemaining)}
          sub={
            unlimited
              ? "No limit on your plan"
              : `of ${subscription?.creditsLimit ?? 0} remaining`
          }
        />
        <StatCard
          label="Daily searches"
          value={plan.searchesPerDay === -1 ? "Unlimited" : String(plan.searchesPerDay)}
          sub="Ad search & discovery"
        />
        <StatCard
          label="Team seats"
          value={String(plan.teamSeats)}
          sub="Collaborators on this plan"
        />
      </div>

      {/* Credits bar (only for metered plans) */}
      {!unlimited && subscription && (
        <div className="mb-10 card p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">
              AI Credit Usage — {new Date(subscription.billingCycleStart).toLocaleString("default", { month: "long" })} cycle
            </p>
            <span className="text-sm text-muted-foreground">
              {subscription.creditsUsed} / {subscription.creditsLimit} used
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{
                width: `${Math.min(
                  100,
                  (subscription.creditsUsed / (subscription.creditsLimit || 1)) * 100
                )}%`,
              }}
            />
          </div>
          <p className="mt-2 text-xs text-muted">
            Credits reset on your billing date each month. Upgrade for more credits.
          </p>
        </div>
      )}

      {/* Pricing table */}
      <div>
        <div className="mb-6 flex flex-col gap-1">
          <h2 className="text-xl font-semibold text-foreground">All Plans</h2>
          <p className="text-sm text-muted-foreground">
            Upgrade anytime. Downgrade or cancel from the billing portal.
          </p>
        </div>
        <PricingTable />
      </div>

      {/* FAQ */}
      <div className="mt-16">
        <h2 className="mb-6 text-xl font-semibold text-foreground">
          Frequently asked questions
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {FAQ.map(({ q, a }) => (
            <div key={q} className="card p-5">
              <p className="text-sm font-medium text-foreground">{q}</p>
              <p className="mt-2 text-sm text-muted-foreground">{a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div className="card p-5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={[
          "mt-1 text-2xl font-bold",
          accent ? "text-accent" : "text-foreground",
        ].join(" ")}
      >
        {value}
      </p>
      <p className="mt-0.5 text-xs text-muted">{sub}</p>
    </div>
  );
}

const FAQ = [
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel from the billing portal at any time. You'll retain access until the end of your current billing period.",
  },
  {
    q: "What counts as an AI credit?",
    a: "Each AI generation (hook alternatives, script rewrite, ad copy, creative brief) costs 1 credit. Landing page wireframes cost 2 credits.",
  },
  {
    q: "Do unused credits roll over?",
    a: "Credits reset on the first day of each billing cycle and do not carry over to the next month.",
  },
  {
    q: "Can I upgrade mid-cycle?",
    a: "Yes. Upgrading is instant and prorated — you'll only pay for the remaining days in your current billing period.",
  },
  {
    q: "Is there an annual discount?",
    a: "Yes — pay annually and save 20% on Pro, Scale, and Agency plans. Contact us to set this up.",
  },
  {
    q: "What payment methods do you accept?",
    a: "All major credit and debit cards via Stripe. We don't store your card details directly.",
  },
];

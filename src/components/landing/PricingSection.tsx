"use client";

import { useState } from "react";
import Link from "next/link";

const PLANS = [
  {
    name: "Free",
    tagline: "Explore the platform",
    monthlyPrice: 0,
    popular: false,
    cta: "Get Started",
    ctaHref: "/api/auth/signin",
    features: [
      "10 ad searches / day",
      "Basic ad previews",
      "Platform filter",
      "—",
      "—",
      "—",
      "—",
      "—",
    ],
    active: [true, true, true, false, false, false, false, false],
  },
  {
    name: "Pro",
    tagline: "Full intelligence stack",
    monthlyPrice: 59,
    popular: true,
    cta: "Start Pro",
    ctaHref: "/api/auth/signin",
    features: [
      "Unlimited searches",
      "50 AI credits / month",
      "Ad Anatomy X-Ray",
      "Hook & Script Remix",
      "Creative Brief Export",
      "5 Velocity Alert rules",
      "—",
      "—",
    ],
    active: [true, true, true, true, true, true, false, false],
  },
  {
    name: "Scale",
    tagline: "Team-level power",
    monthlyPrice: 149,
    popular: false,
    cta: "Start Scale",
    ctaHref: "/api/auth/signin",
    features: [
      "Unlimited searches",
      "Unlimited AI credits",
      "Ad Anatomy X-Ray",
      "Hook & Script Remix",
      "Creative Brief Export",
      "20 Velocity Alert rules",
      "Bulk CSV + Brief Export",
      "5 team seats",
    ],
    active: [true, true, true, true, true, true, true, true],
  },
  {
    name: "Agency",
    tagline: "White-label & workspaces",
    monthlyPrice: 299,
    popular: false,
    cta: "Contact Sales",
    ctaHref: "/api/auth/signin",
    features: [
      "Unlimited searches",
      "Unlimited AI credits",
      "Ad Anatomy X-Ray",
      "Hook & Script Remix",
      "Creative Brief Export",
      "50 Velocity Alert rules",
      "Bulk CSV + Brief Export",
      "15 seats + white-label",
    ],
    active: [true, true, true, true, true, true, true, true],
  },
];

export function PricingSection() {
  const [annual, setAnnual] = useState(false);

  function displayPrice(monthly: number) {
    if (monthly === 0) return "Free";
    const price = annual ? Math.round(monthly * 0.8) : monthly;
    return `$${price}`;
  }

  return (
    <section id="pricing" className="relative overflow-hidden py-28">
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="reveal mb-16 text-center">
          <span className="inline-block rounded-full border border-accent/30 bg-accent/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-accent">
            Pricing
          </span>
          <h2 className="mt-4 text-4xl font-black text-foreground lg:text-5xl">
            Invest in winning.<br />
            <span className="text-gradient">Not guessing.</span>
          </h2>
          <p className="mt-4 text-lg text-muted">
            Start free. Upgrade when you&apos;re ready to go deep.
          </p>

          {/* Toggle */}
          <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-border bg-surface-2 p-1">
            <button
              onClick={() => setAnnual(false)}
              className={[
                "rounded-full px-5 py-2 text-sm font-medium transition-all",
                !annual
                  ? "bg-surface-3 text-foreground shadow"
                  : "text-muted hover:text-foreground",
              ].join(" ")}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={[
                "rounded-full px-5 py-2 text-sm font-medium transition-all",
                annual
                  ? "bg-surface-3 text-foreground shadow"
                  : "text-muted hover:text-foreground",
              ].join(" ")}
            >
              Annual
              <span className="ml-2 rounded-full bg-success/20 px-2 py-0.5 text-[10px] font-bold text-success">
                −20%
              </span>
            </button>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan, i) => (
            <div
              key={plan.name}
              className={[
                "reveal flex flex-col rounded-2xl border p-6 transition-all duration-300",
                `reveal-delay-${i + 1}`,
                plan.popular
                  ? "border-accent/40 bg-gradient-to-b from-accent/8 to-surface shadow-[0_0_40px_rgba(249,115,22,0.12)] scale-[1.02]"
                  : "border-border bg-surface hover:border-border-hover",
              ].join(" ")}
            >
              {plan.popular && (
                <div className="mb-4 self-start rounded-full bg-accent px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                  Most Popular
                </div>
              )}
              <p className="text-lg font-bold text-foreground">{plan.name}</p>
              <p className="mt-0.5 text-xs text-muted">{plan.tagline}</p>

              <div className="mt-5 mb-6">
                <span className="text-4xl font-black text-foreground">
                  {displayPrice(plan.monthlyPrice)}
                </span>
                {plan.monthlyPrice > 0 && (
                  <span className="ml-1.5 text-sm text-muted">/mo</span>
                )}
                {annual && plan.monthlyPrice > 0 && (
                  <p className="mt-1 text-[11px] text-muted">
                    Billed ${Math.round(plan.monthlyPrice * 0.8 * 12)}/year
                  </p>
                )}
              </div>

              <Link
                href={plan.ctaHref}
                className={[
                  "mb-6 rounded-xl py-2.5 text-center text-sm font-semibold transition-all",
                  plan.popular
                    ? "bg-accent text-white shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:bg-accent-hover"
                    : "border border-border text-foreground hover:border-border-hover hover:bg-surface-2",
                ].join(" ")}
              >
                {plan.cta}
              </Link>

              <ul className="flex flex-col gap-2.5">
                {plan.features.map((feat, fi) => (
                  <li
                    key={fi}
                    className={[
                      "flex items-center gap-2 text-xs",
                      plan.active[fi] ? "text-foreground-2" : "text-muted/40",
                    ].join(" ")}
                  >
                    {plan.active[fi] ? (
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-success/20 text-success text-[9px] font-bold">
                        ✓
                      </span>
                    ) : (
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center text-muted/30 text-xs">
                        —
                      </span>
                    )}
                    {plan.active[fi] ? feat : "Not included"}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

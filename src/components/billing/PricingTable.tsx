"use client";

import { UserRole } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Feature } from "@/constants/plans";
import { FEATURE_LABELS, PLANS } from "@/constants/plans";
import { useSubscription } from "@/hooks/useSubscription";

const PLAN_ORDER: UserRole[] = [
  UserRole.FREE,
  UserRole.PRO,
  UserRole.SCALE,
  UserRole.AGENCY,
];

// Features to display on the pricing table, in order
const TABLE_FEATURES: Feature[] = [
  "ad_search",
  "ad_anatomy",
  "remix_hooks",
  "remix_script",
  "remix_copy",
  "remix_brief",
  "remix_wireframe",
  "predictive_alerts",
  "team_seats",
  "api_access",
  "white_label",
  "client_workspaces",
  "bulk_export",
];

export function PricingTable() {
  const router = useRouter();
  const { role: currentRole, isLoading, refresh } = useSubscription();
  const [loadingRole, setLoadingRole] = useState<UserRole | null>(null);

  async function handleUpgrade(targetRole: UserRole) {
    if (targetRole === UserRole.FREE) return;
    setLoadingRole(targetRole);

    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetRole }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        alert(data.error ?? "Something went wrong");
        return;
      }

      const { url } = (await res.json()) as { url: string };
      router.push(url);
    } finally {
      setLoadingRole(null);
    }
  }

  async function handleManage() {
    setLoadingRole(currentRole);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      if (!res.ok) return;
      const { url } = (await res.json()) as { url: string };
      router.push(url);
    } finally {
      setLoadingRole(null);
    }
  }

  return (
    <div className="w-full">
      {/* Plan cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {PLAN_ORDER.map((role) => {
          const plan = PLANS[role];
          const isCurrent = currentRole === role;
          const isHighlighted = plan.highlight;
          const isLoaded = !isLoading;
          const isUpgrade =
            ["FREE", "PRO", "SCALE", "AGENCY"].indexOf(role) >
            ["FREE", "PRO", "SCALE", "AGENCY"].indexOf(currentRole);
          const isProcessing = loadingRole === role;

          return (
            <div
              key={role}
              className={[
                "relative flex flex-col rounded-xl border p-6 transition-all duration-200",
                isHighlighted
                  ? "border-accent bg-accent/5 shadow-glow"
                  : "border-border bg-surface hover:border-border-hover",
                isCurrent ? "ring-1 ring-accent/30" : "",
              ].join(" ")}
            >
              {/* Badge */}
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-accent px-3 py-0.5 text-xs font-semibold text-white shadow-glow">
                    {plan.badge}
                  </span>
                </div>
              )}

              {isCurrent && (
                <div className="absolute -top-3 right-4">
                  <span className="rounded-full border border-border bg-surface px-3 py-0.5 text-xs font-medium text-muted-foreground">
                    Current plan
                  </span>
                </div>
              )}

              {/* Header */}
              <div className="mb-6">
                <h3 className="text-base font-semibold text-foreground">{plan.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{plan.description}</p>
                <div className="mt-4 flex items-end gap-1">
                  {plan.price === 0 ? (
                    <span className="text-3xl font-bold text-foreground">Free</span>
                  ) : (
                    <>
                      <span className="text-3xl font-bold text-foreground">
                        ${plan.price}
                      </span>
                      <span className="mb-1 text-sm text-muted-foreground">/mo</span>
                    </>
                  )}
                </div>
              </div>

              {/* Credits pill */}
              <div className="mb-6">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-3 py-1">
                  <span className="text-xs text-muted-foreground">AI credits:</span>
                  <span className="text-xs font-semibold text-foreground">
                    {plan.creditsPerMonth === -1
                      ? "Unlimited"
                      : plan.creditsPerMonth === 0
                      ? "None"
                      : `${plan.creditsPerMonth}/mo`}
                  </span>
                </div>
              </div>

              {/* CTA */}
              <div className="mb-6">
                {isCurrent && currentRole !== UserRole.FREE ? (
                  <button
                    onClick={handleManage}
                    disabled={loadingRole !== null}
                    className="btn-secondary w-full py-2"
                  >
                    {isProcessing ? <Spinner /> : "Manage subscription"}
                  </button>
                ) : isCurrent ? (
                  <button disabled className="btn-secondary w-full cursor-default py-2 opacity-60">
                    Current plan
                  </button>
                ) : isUpgrade && isLoaded ? (
                  <button
                    onClick={() => handleUpgrade(role)}
                    disabled={loadingRole !== null}
                    className={
                      isHighlighted ? "btn-primary w-full py-2" : "btn-secondary w-full py-2"
                    }
                  >
                    {isProcessing ? (
                      <span className="flex items-center justify-center gap-2">
                        <Spinner /> Redirecting…
                      </span>
                    ) : (
                      `Upgrade to ${plan.name} →`
                    )}
                  </button>
                ) : (
                  <button disabled className="btn-ghost w-full cursor-default py-2 opacity-50">
                    Included in your plan
                  </button>
                )}
              </div>

              {/* Feature list */}
              <div className="flex flex-col gap-2.5">
                {TABLE_FEATURES.map((feature) => {
                  const included = plan.features.includes(feature);
                  return (
                    <div key={feature} className="flex items-start gap-2">
                      <span
                        className={[
                          "mt-0.5 shrink-0 text-sm",
                          included ? "text-accent" : "text-border",
                        ].join(" ")}
                      >
                        {included ? "✓" : "–"}
                      </span>
                      <span
                        className={[
                          "text-xs",
                          included ? "text-foreground-2" : "text-muted",
                        ].join(" ")}
                      >
                        {feature === "team_seats"
                          ? `${plan.teamSeats} team seat${plan.teamSeats !== 1 ? "s" : ""}`
                          : FEATURE_LABELS[feature]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <p className="mt-8 text-center text-xs text-muted">
        All plans include a 14-day money-back guarantee. Cancel anytime.
        Prices in USD. Annual billing available — save 20%.
      </p>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

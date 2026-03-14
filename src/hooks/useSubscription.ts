"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import type { Feature } from "@/constants/plans";
import { canAccessFeature, PLANS } from "@/constants/plans";
import type { UserRole } from "@prisma/client";

export interface SubscriptionState {
  /** Current plan role */
  role: UserRole;
  /** Human-readable plan name */
  planName: string;
  /** Monthly price in USD */
  planPrice: number;
  /** Credits remaining this billing cycle (-1 = unlimited) */
  creditsRemaining: number;
  /** Total credits this billing cycle (-1 = unlimited) */
  creditsLimit: number;
  /** Whether the user can access a given feature */
  canAccess: (feature: Feature) => boolean;
  /** Whether the subscription data is still loading */
  isLoading: boolean;
  /** Force-refresh data from the server */
  refresh: () => Promise<void>;
}

/**
 * Client-side hook that returns the current user's subscription state.
 *
 * Uses the JWT session as the fast path (no network request).
 * Call refresh() after an upgrade to get fresh data immediately.
 *
 * @example
 * const { role, creditsRemaining, canAccess } = useSubscription();
 * if (!canAccess("ad_anatomy")) return <UpgradePrompt />;
 */
export function useSubscription(): SubscriptionState {
  const { data: session, status, update } = useSession();
  const [freshCredits, setFreshCredits] = useState<{
    creditsRemaining: number;
    creditsLimit: number;
  } | null>(null);

  // When the page gains focus after a Stripe redirect, refresh the session
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "1") {
      void update(); // force NextAuth JWT refresh
    }
  }, [update]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/me");
      if (!res.ok) return;
      const data = (await res.json()) as {
        plan: { creditsRemaining: number; creditsLimit: number };
      };
      setFreshCredits({
        creditsRemaining: data.plan.creditsRemaining,
        creditsLimit: data.plan.creditsLimit,
      });
      // Also refresh the JWT so role changes are reflected immediately
      await update();
    } catch {
      // Silent — stale session data is acceptable fallback
    }
  }, [update]);

  const isLoading = status === "loading";
  const role: UserRole = session?.user?.role ?? "FREE";
  const plan = PLANS[role];

  const creditsRemaining =
    freshCredits?.creditsRemaining ??
    session?.user?.creditsRemaining ??
    0;

  const creditsLimit =
    freshCredits?.creditsLimit ??
    session?.user?.creditsLimit ??
    0;

  return {
    role,
    planName: plan.name,
    planPrice: plan.price,
    creditsRemaining: plan.creditsPerMonth === -1 ? -1 : creditsRemaining,
    creditsLimit: plan.creditsPerMonth === -1 ? -1 : creditsLimit,
    canAccess: (feature: Feature) => canAccessFeature(role, feature),
    isLoading,
    refresh,
  };
}

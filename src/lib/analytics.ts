/**
 * Analytics — PostHog event tracking
 *
 * Server-side: use `trackServerEvent` in Server Components / API routes.
 * Client-side: import `useAnalytics` hook or call `posthog.capture` directly.
 *
 * All event names are typed constants to prevent drift between call sites.
 */

import { PostHog } from "posthog-node";

// ── Event catalogue ───────────────────────────────────────────────────────────

export const EVENTS = {
  // Acquisition
  PAGE_VIEW: "page_view",
  LANDING_CTA_CLICKED: "landing_cta_clicked",

  // Auth
  SIGNUP_COMPLETED: "signup_completed",
  LOGIN_COMPLETED: "login_completed",

  // Core product
  AD_SEARCHED: "ad_searched",
  AD_VIEWED: "ad_viewed",
  AD_SAVED: "ad_saved",
  AD_UNSAVED: "ad_unsaved",

  // AI features
  ANATOMY_GENERATED: "anatomy_generated",
  REMIX_GENERATED: "remix_generated",
  BRIEF_GENERATED: "brief_generated",

  // Alerts
  ALERT_RULE_CREATED: "alert_rule_created",
  ALERT_TRIGGERED: "alert_triggered",

  // Conversion funnel
  UPGRADE_MODAL_SHOWN: "upgrade_modal_shown",
  UPGRADE_CLICKED: "upgrade_clicked",
  SUBSCRIPTION_STARTED: "subscription_started",
  SUBSCRIPTION_UPGRADED: "subscription_upgraded",
  SUBSCRIPTION_CANCELLED: "subscription_cancelled",

  // Errors
  API_ERROR_SHOWN: "api_error_shown",
  RATE_LIMIT_HIT: "rate_limit_hit",
} as const;

export type AnalyticsEvent = (typeof EVENTS)[keyof typeof EVENTS];

// ── User properties ───────────────────────────────────────────────────────────

export interface UserProperties {
  tier: string;
  signupDate: string;
  totalRemixes?: number;
  totalSearches?: number;
  totalAdsSaved?: number;
}

// ── Server-side PostHog client ────────────────────────────────────────────────

let _serverClient: PostHog | null = null;

function getServerClient(): PostHog | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

  if (!key) return null;

  if (!_serverClient) {
    _serverClient = new PostHog(key, {
      host,
      flushAt: 1,
      flushInterval: 0, // flush immediately in serverless
    });
  }

  return _serverClient;
}

/**
 * Track an event server-side (API routes, Server Components).
 * No-ops if NEXT_PUBLIC_POSTHOG_KEY is not set.
 */
export async function trackServerEvent(
  distinctId: string,
  event: AnalyticsEvent,
  properties?: Record<string, unknown>
): Promise<void> {
  const client = getServerClient();
  if (!client) return;

  client.capture({ distinctId, event, properties });
  await client.shutdown();
}

/**
 * Identify a user server-side with persistent properties.
 */
export async function identifyUser(
  distinctId: string,
  properties: UserProperties
): Promise<void> {
  const client = getServerClient();
  if (!client) return;

  client.identify({
    distinctId,
    properties: {
      tier: properties.tier,
      signup_date: properties.signupDate,
      total_remixes: properties.totalRemixes ?? 0,
      total_searches: properties.totalSearches ?? 0,
      total_ads_saved: properties.totalAdsSaved ?? 0,
    },
  });
  await client.shutdown();
}

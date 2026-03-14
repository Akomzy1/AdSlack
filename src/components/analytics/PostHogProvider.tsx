"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";

// ── Page view tracker (uses useSearchParams, must be in Suspense) ─────────────

function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname) {
      const url =
        window.location.origin +
        pathname +
        (searchParams?.toString() ? `?${searchParams.toString()}` : "");

      posthog.capture("$pageview", { $current_url: url });
    }
  }, [pathname, searchParams]);

  return null;
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host =
    process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

  useEffect(() => {
    if (!key) return;

    posthog.init(key, {
      api_host: "/ingest", // proxied through Next.js to avoid ad blockers
      ui_host: host,
      capture_pageview: false, // we handle manually via PageViewTracker
      capture_pageleave: true,
      persistence: "localStorage+cookie",
      autocapture: false, // use explicit events only
      session_recording: {
        maskAllInputs: true, // privacy: mask all form inputs
      },
    });
  }, [key, host]);

  if (!key) return <>{children}</>;

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
      {children}
    </PHProvider>
  );
}

// ── Client-side typed track helper ────────────────────────────────────────────

import type { AnalyticsEvent } from "@/lib/analytics";

export function track(
  event: AnalyticsEvent,
  properties?: Record<string, unknown>
) {
  if (typeof window === "undefined") return;
  posthog.capture(event, properties);
}

export function identifyClient(
  userId: string,
  properties: Record<string, unknown>
) {
  if (typeof window === "undefined") return;
  posthog.identify(userId, properties);
}

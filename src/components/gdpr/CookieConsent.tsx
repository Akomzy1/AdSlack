"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type ConsentChoice = "all" | "essential" | null;

const STORAGE_KEY  = "adslack:cookie-consent";
const CONSENT_VER  = "1"; // bump to re-prompt after policy changes

// ─── Hook ─────────────────────────────────────────────────────────────────────

function useConsentState() {
  const [choice, setChoice] = useState<ConsentChoice | "loading">("loading");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { choice: ConsentChoice; version: string };
        // Re-show banner if policy version changed
        if (parsed.version === CONSENT_VER) {
          setChoice(parsed.choice);
          return;
        }
      }
    } catch { /* ignore */ }
    setChoice(null);
  }, []);

  const save = (c: ConsentChoice) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ choice: c, version: CONSENT_VER }));
    } catch { /* ignore */ }
    setChoice(c);
  };

  return { choice, save };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CookieConsent() {
  const { choice, save } = useConsentState();

  // Don't render during SSR or after consent is given
  if (choice === "loading" || choice === "all" || choice === "essential") return null;

  const acceptAll = () => {
    save("all");
    // PostHog opt-in: resume tracking if previously opted out
    if (typeof window !== "undefined" && (window as typeof window & { posthog?: { opt_in_capturing?: () => void } }).posthog?.opt_in_capturing) {
      (window as typeof window & { posthog: { opt_in_capturing: () => void } }).posthog.opt_in_capturing();
    }
  };

  const acceptEssential = () => {
    save("essential");
    // PostHog opt-out: stop analytics tracking
    if (typeof window !== "undefined" && (window as typeof window & { posthog?: { opt_out_capturing?: () => void } }).posthog?.opt_out_capturing) {
      (window as typeof window & { posthog: { opt_out_capturing: () => void } }).posthog.opt_out_capturing();
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      aria-live="polite"
      className="fixed bottom-0 left-0 right-0 z-[9999] p-4 sm:bottom-4 sm:left-4 sm:right-auto sm:max-w-sm"
    >
      <div className="rounded-2xl border border-border bg-surface shadow-[0_8px_40px_rgba(0,0,0,0.5)] backdrop-blur-sm p-5">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <span className="text-xl shrink-0">🍪</span>
          <div>
            <p className="text-sm font-semibold text-foreground">Cookie preferences</p>
            <p className="mt-0.5 text-xs text-muted leading-relaxed">
              We use cookies to improve your experience and analyse usage.
              Essential cookies are always active.{" "}
              <Link href="/privacy#cookies" className="text-accent hover:underline">
                Learn more
              </Link>
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={acceptAll}
            className="flex-1 rounded-lg bg-accent py-2 text-xs font-semibold text-white hover:bg-accent/90 transition-colors active:scale-95"
          >
            Accept all
          </button>
          <button
            onClick={acceptEssential}
            className="flex-1 rounded-lg border border-border bg-surface-2 py-2 text-xs font-medium text-muted hover:bg-surface-3 hover:text-foreground transition-colors"
          >
            Essential only
          </button>
        </div>
      </div>
    </div>
  );
}

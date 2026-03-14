"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChecklistItem {
  id:       string;
  label:    string;
  detail?:  string;
  /** If set, clicking "Test" will fetch this URL and show pass/fail */
  testUrl?: string;
  /** Link to a relevant settings page or docs */
  docsUrl?: string;
  critical: boolean;
}

interface ChecklistCategory {
  id:    string;
  label: string;
  icon:  string;
  items: ChecklistItem[];
}

// ─── Checklist data ───────────────────────────────────────────────────────────

const CATEGORIES: ChecklistCategory[] = [
  {
    id:    "infra",
    label: "Infrastructure",
    icon:  "🖥",
    items: [
      {
        id:       "env-vars",
        label:    "All environment variables set in Vercel",
        detail:   "DATABASE_URL, NEXTAUTH_SECRET, ANTHROPIC_API_KEY, STRIPE_*, RESEND_API_KEY, CRON_SECRET, UPSTASH_*, SENTRY_DSN, POSTHOG_KEY",
        testUrl:  "/api/health",
        critical: true,
      },
      {
        id:       "db-migrated",
        label:    "Database migrated (prisma migrate deploy)",
        detail:   "Run: npx prisma migrate deploy && npx prisma db seed",
        critical: true,
      },
      {
        id:       "db-pooling",
        label:    "Connection pooling configured (PgBouncer or Prisma Accelerate)",
        detail:   "Without pooling, serverless functions exhaust Postgres connections under load.",
        critical: true,
      },
      {
        id:       "ssl",
        label:    "SSL certificate active",
        detail:   "Vercel auto-provisions SSL — verify via browser padlock or SSL Labs.",
        critical: true,
      },
      {
        id:       "domain",
        label:    "Custom domain configured and DNS propagated",
        detail:   "Add domain in Vercel project → Settings → Domains.",
        critical: true,
      },
    ],
  },
  {
    id:    "stripe",
    label: "Stripe & Billing",
    icon:  "💳",
    items: [
      {
        id:       "stripe-products",
        label:    "Stripe products and prices created (PRO $59, SCALE $149, AGENCY $299)",
        detail:   "Create in Stripe Dashboard → Products. Copy price IDs to env vars.",
        docsUrl:  "https://dashboard.stripe.com/products",
        critical: true,
      },
      {
        id:       "stripe-webhook",
        label:    "Stripe webhook endpoint registered",
        detail:   "Register https://yourdomain.com/api/webhooks/stripe in Stripe → Developers → Webhooks. Events: checkout.session.completed, customer.subscription.updated/deleted.",
        docsUrl:  "https://dashboard.stripe.com/webhooks",
        critical: true,
      },
      {
        id:       "stripe-webhook-test",
        label:    "Stripe webhook signature verified (STRIPE_WEBHOOK_SECRET set)",
        detail:   "Test with Stripe CLI: stripe listen --forward-to localhost:3000/api/webhooks/stripe",
        critical: true,
      },
      {
        id:       "stripe-checkout",
        label:    "Checkout flow tested end-to-end",
        detail:   "Use Stripe test card 4242 4242 4242 4242 to complete a purchase and verify role upgrade.",
        critical: true,
      },
    ],
  },
  {
    id:    "auth",
    label: "Authentication",
    icon:  "🔐",
    items: [
      {
        id:       "auth-google",
        label:    "Google OAuth tested (sign in + sign out)",
        detail:   "Add production callback URL to Google Cloud Console: https://yourdomain.com/api/auth/callback/google",
        docsUrl:  "https://console.cloud.google.com/",
        critical: true,
      },
      {
        id:       "auth-email",
        label:    "Email (magic link) auth tested",
        detail:   "Verify RESEND_API_KEY is set and email template renders correctly.",
        critical: true,
      },
      {
        id:       "auth-redirect",
        label:    "Auth redirects working (protected routes → login, login → /discover)",
        critical: false,
      },
      {
        id:       "auth-nextauth-url",
        label:    "NEXTAUTH_URL matches production domain exactly",
        detail:   "Mismatch causes OAuth callback failures.",
        critical: true,
      },
    ],
  },
  {
    id:    "features",
    label: "Core Features",
    icon:  "⚡",
    items: [
      {
        id:       "free-tier",
        label:    "Free tier limits enforced (10 searches/day, no AI features)",
        critical: true,
      },
      {
        id:       "ai-anatomy",
        label:    "AI ad anatomy generation working",
        detail:   "Test on any ad detail page. Requires ANTHROPIC_API_KEY.",
        testUrl:  "/api/health/anthropic",
        critical: true,
      },
      {
        id:       "ai-remix-hooks",
        label:    "Remix: Hook alternatives working",
        critical: true,
      },
      {
        id:       "ai-remix-script",
        label:    "Remix: Script rewriter working",
        critical: true,
      },
      {
        id:       "ai-remix-copy",
        label:    "Remix: Ad copy generator working",
        critical: true,
      },
      {
        id:       "ai-remix-brief",
        label:    "Remix: Creative brief generator working",
        critical: true,
      },
      {
        id:       "velocity-cron",
        label:    "Velocity scoring cron running on schedule (every 6h)",
        detail:   "Check Vercel dashboard → Logs → Cron for /api/cron/velocity",
        critical: true,
      },
      {
        id:       "email-notifications",
        label:    "Alert email notifications sending correctly",
        detail:   "Trigger a test alert to verify Resend integration.",
        critical: false,
      },
      {
        id:       "saturation-cron",
        label:    "Saturation analysis cron running (every 12h)",
        critical: false,
      },
    ],
  },
  {
    id:    "performance",
    label: "Performance & SEO",
    icon:  "🚀",
    items: [
      {
        id:       "perf-landing",
        label:    "Landing page loads under 3 seconds (LCP < 2.5s)",
        detail:   "Test at web.dev/measure or PageSpeed Insights.",
        docsUrl:  "https://pagespeed.web.dev/",
        critical: false,
      },
      {
        id:       "mobile",
        label:    "Mobile responsive across all pages",
        detail:   "Test on real device or Chrome DevTools mobile emulation.",
        critical: false,
      },
      {
        id:       "seo-meta",
        label:    "SEO meta tags rendering correctly (title, description, OG)",
        detail:   "Check with: curl https://yourdomain.com | grep '<meta'",
        critical: false,
      },
      {
        id:       "sitemap",
        label:    "Sitemap generating at /sitemap.xml",
        testUrl:  "/sitemap.xml",
        critical: false,
      },
      {
        id:       "robots",
        label:    "robots.txt correct at /robots.txt",
        testUrl:  "/robots.txt",
        critical: false,
      },
    ],
  },
  {
    id:    "observability",
    label: "Observability",
    icon:  "📊",
    items: [
      {
        id:       "sentry",
        label:    "Error tracking active in Sentry (NEXT_PUBLIC_SENTRY_DSN set)",
        detail:   "Trigger a test error to verify events appear in Sentry.",
        docsUrl:  "https://sentry.io/",
        critical: true,
      },
      {
        id:       "posthog",
        label:    "Analytics events firing correctly (PostHog)",
        detail:   "Verify pageview and custom events in PostHog Live Events.",
        docsUrl:  "https://app.posthog.com/",
        critical: false,
      },
    ],
  },
  {
    id:    "legal",
    label: "Legal & Compliance",
    icon:  "⚖️",
    items: [
      {
        id:       "privacy",
        label:    "Privacy Policy page live at /privacy",
        testUrl:  "/privacy",
        docsUrl:  "/privacy",
        critical: true,
      },
      {
        id:       "terms",
        label:    "Terms of Service page live at /terms",
        testUrl:  "/terms",
        docsUrl:  "/terms",
        critical: true,
      },
      {
        id:       "cookie-banner",
        label:    "GDPR cookie consent banner shown to new visitors",
        critical: true,
      },
      {
        id:       "404",
        label:    "404 error page designed and handling bad routes",
        testUrl:  "/this-page-does-not-exist-xyz",
        critical: false,
      },
      {
        id:       "500",
        label:    "500 error page handles unexpected crashes",
        critical: false,
      },
    ],
  },
];

// ─── Storage key ─────────────────────────────────────────────────────────────

const STORAGE_KEY = "adslack:launch-checklist";

// ─── Component ────────────────────────────────────────────────────────────────

export function LaunchChecklist() {
  const [checked, setChecked]   = useState<Set<string>>(new Set());
  const [testing, setTesting]   = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, "ok" | "fail" | "loading">>({});

  // Load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setChecked(new Set(JSON.parse(raw) as string[]));
    } catch { /* ignore */ }
  }, []);

  // Persist to localStorage
  const toggle = useCallback((id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const runTest = useCallback(async (item: ChecklistItem) => {
    if (!item.testUrl) return;
    setTesting(item.id);
    setTestResults((r) => ({ ...r, [item.id]: "loading" }));
    try {
      const res = await fetch(item.testUrl, { method: "GET" });
      setTestResults((r) => ({ ...r, [item.id]: res.ok ? "ok" : "fail" }));
    } catch {
      setTestResults((r) => ({ ...r, [item.id]: "fail" }));
    } finally {
      setTesting(null);
    }
  }, []);

  const resetAll = () => {
    setChecked(new Set());
    setTestResults({});
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  };

  // Compute totals
  const allItems = CATEGORIES.flatMap((c) => c.items);
  const total    = allItems.length;
  const done     = allItems.filter((i) => checked.has(i.id)).length;
  const critical = allItems.filter((i) => i.critical);
  const criticalDone = critical.filter((i) => checked.has(i.id)).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-10 space-y-8">

        {/* Header */}
        <div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-mono text-muted uppercase tracking-widest mb-1">Admin</p>
              <h1 className="text-2xl font-bold text-foreground">Launch Checklist</h1>
              <p className="text-sm text-muted mt-1">
                Complete all critical items before going live. Progress is saved in your browser.
              </p>
            </div>
            <button
              onClick={resetAll}
              className="text-xs text-muted hover:text-foreground transition-colors"
            >
              Reset
            </button>
          </div>

          {/* Progress bar */}
          <div className="mt-5 rounded-xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-foreground">
                {done} / {total} complete
              </span>
              <span className={`text-sm font-mono font-bold ${
                pct === 100 ? "text-success" :
                pct >= 75   ? "text-accent"  :
                              "text-muted"
              }`}>
                {pct}%
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-surface-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  pct === 100 ? "bg-success" :
                  pct >= 75   ? "bg-accent"  :
                  pct >= 50   ? "bg-warning" :
                                "bg-muted/40"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-2 flex items-center gap-4 text-xs text-muted">
              <span>
                <span className={criticalDone === critical.length ? "text-success" : "text-danger"}>
                  {criticalDone}/{critical.length}
                </span>
                {" "}critical items
              </span>
              {pct === 100 && (
                <span className="font-semibold text-success">
                  ✓ All clear — ready to launch!
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Categories */}
        {CATEGORIES.map((category) => {
          const catDone = category.items.filter((i) => checked.has(i.id)).length;
          return (
            <section key={category.id}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-base">{category.icon}</span>
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
                    {category.label}
                  </h2>
                </div>
                <span className="text-xs font-mono text-muted">
                  {catDone}/{category.items.length}
                </span>
              </div>

              <div className="rounded-xl border border-border bg-surface divide-y divide-border overflow-hidden">
                {category.items.map((item) => {
                  const isDone    = checked.has(item.id);
                  const testState = testResults[item.id];

                  return (
                    <div
                      key={item.id}
                      className={`flex items-start gap-3 px-4 py-3 transition-colors ${
                        isDone ? "bg-success/3" : "hover:bg-surface-2"
                      }`}
                    >
                      {/* Checkbox */}
                      <button
                        onClick={() => toggle(item.id)}
                        className={[
                          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all",
                          isDone
                            ? "border-success bg-success text-white"
                            : "border-border bg-background hover:border-accent",
                        ].join(" ")}
                        aria-label={isDone ? "Uncheck" : "Check"}
                      >
                        {isDone && <span className="text-[9px] leading-none font-bold">✓</span>}
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`text-sm ${isDone ? "line-through text-muted" : "text-foreground"}`}>
                            {item.label}
                          </p>
                          {item.critical && !isDone && (
                            <span className="rounded-full bg-danger/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-danger border border-danger/20">
                              Critical
                            </span>
                          )}
                        </div>
                        {item.detail && (
                          <p className="mt-0.5 text-xs text-muted leading-relaxed">{item.detail}</p>
                        )}

                        {/* Test result */}
                        {testState === "ok" && (
                          <p className="mt-1 text-xs text-success">✓ Responded OK</p>
                        )}
                        {testState === "fail" && (
                          <p className="mt-1 text-xs text-danger">✗ Request failed or returned error</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.testUrl && (
                          <button
                            onClick={() => void runTest(item)}
                            disabled={testing === item.id}
                            className="rounded-md border border-border bg-surface-2 px-2 py-1 text-[10px] font-medium text-muted hover:border-accent hover:text-accent transition-colors disabled:opacity-50"
                          >
                            {testing === item.id ? "…" : "Test"}
                          </button>
                        )}
                        {item.docsUrl && (
                          <Link
                            href={item.docsUrl}
                            target={item.docsUrl.startsWith("http") ? "_blank" : undefined}
                            rel={item.docsUrl.startsWith("http") ? "noopener noreferrer" : undefined}
                            className="rounded-md border border-border bg-surface-2 px-2 py-1 text-[10px] font-medium text-muted hover:border-accent hover:text-accent transition-colors"
                          >
                            ↗
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* Bottom links */}
        <div className="flex items-center gap-4 pt-2 pb-10 text-xs text-muted">
          <Link href="/admin" className="hover:text-foreground transition-colors">
            ← Admin dashboard
          </Link>
          <span>·</span>
          <Link href="/privacy" target="_blank" className="hover:text-foreground transition-colors">
            Privacy Policy
          </Link>
          <span>·</span>
          <Link href="/terms" target="_blank" className="hover:text-foreground transition-colors">
            Terms of Service
          </Link>
        </div>
      </div>
    </div>
  );
}

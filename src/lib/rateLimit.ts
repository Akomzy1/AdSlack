/**
 * Rate limiting — Upstash Redis + @upstash/ratelimit
 *
 * Tier limits (requests per minute):
 *   FREE   → 10 rpm
 *   PRO    → 60 rpm
 *   SCALE  → 200 rpm
 *   AGENCY → 500 rpm
 *   Unauthenticated → 20 rpm (by IP, for public routes)
 *
 * Usage in an API route:
 *
 *   export const POST = withSubscription(
 *     withRateLimit(async (req, { user }) => {
 *       // handler
 *     })
 *   );
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import type { User, Subscription } from "@prisma/client";
import { apiError } from "./errors";

// ── Redis client (lazy — only initialised when env vars are present) ──────────

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    if (process.env.NODE_ENV === "production") {
      console.warn("[rateLimit] Upstash env vars missing — rate limiting disabled");
    }
    return null;
  }

  redis = new Redis({ url, token });
  return redis;
}

// ── Per-tier rate limiters ────────────────────────────────────────────────────

const LIMITS: Record<string, number> = {
  FREE: 10,
  PRO: 60,
  SCALE: 200,
  AGENCY: 500,
  ANONYMOUS: 20,
};

const limiters = new Map<string, Ratelimit>();

function getLimiter(tier: string): Ratelimit | null {
  const r = getRedis();
  if (!r) return null;

  if (limiters.has(tier)) return limiters.get(tier)!;

  const rpm = LIMITS[tier] ?? LIMITS.ANONYMOUS;
  const limiter = new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(rpm, "60 s"),
    analytics: true,
    prefix: `adsentify:rl:${tier}`,
  });

  limiters.set(tier, limiter);
  return limiter;
}

// ── Result type ───────────────────────────────────────────────────────────────

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // unix ms
  tier: string;
}

// ── Check rate limit ──────────────────────────────────────────────────────────

export async function checkRateLimit(
  identifier: string,
  tier: string = "ANONYMOUS"
): Promise<RateLimitResult> {
  const limiter = getLimiter(tier);

  if (!limiter) {
    // No Redis configured — allow all (dev mode)
    return { allowed: true, remaining: 999, resetAt: 0, tier };
  }

  const { success, remaining, reset } = await limiter.limit(
    `${tier}:${identifier}`
  );

  return { allowed: success, remaining, resetAt: reset, tier };
}

// ── Rate limit response headers ───────────────────────────────────────────────

export function setRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult
): NextResponse {
  response.headers.set("X-RateLimit-Limit", String(LIMITS[result.tier] ?? 20));
  response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  response.headers.set("X-RateLimit-Reset", String(result.resetAt));
  return response;
}

// ── withRateLimit HOF ─────────────────────────────────────────────────────────

type UserWithSub = User & { subscription: Subscription | null };

type AuthedHandler<TParams = Record<string, string>> = (
  req: Request,
  context: { user: UserWithSub; params: TParams }
) => Promise<Response>;

/**
 * Wraps an authenticated route handler with per-user rate limiting.
 * Must be used after withSubscription (which injects `user`).
 *
 * @example
 * export const POST = withSubscription(
 *   withRateLimit(async (req, { user }) => { ... })
 * );
 */
export function withRateLimit<TParams = Record<string, string>>(
  handler: AuthedHandler<TParams>
): AuthedHandler<TParams> {
  return async (req, ctx) => {
    const tier = ctx.user.role as string;
    const result = await checkRateLimit(ctx.user.id, tier);

    if (!result.allowed) {
      const rpm = LIMITS[tier] ?? LIMITS.ANONYMOUS;
      const response = apiError(
        "RATE_LIMITED",
        `Rate limit exceeded. ${tier} plan allows ${rpm} requests per minute.`,
        { tier, rpm, resetAt: result.resetAt }
      );
      setRateLimitHeaders(response as unknown as NextResponse, result);
      return response;
    }

    const response = await handler(req, ctx);
    // Attach headers to the response (read-only in some runtimes, best-effort)
    try {
      setRateLimitHeaders(response as unknown as NextResponse, result);
    } catch {
      // ignore if headers are immutable
    }
    return response;
  };
}

// ── IP-based rate limiter for public routes ───────────────────────────────────

/**
 * Rate limit by IP for unauthenticated public API routes.
 * Returns a 429 Response if exceeded, otherwise returns null (continue).
 */
export async function rateLimitByIp(req: Request): Promise<Response | null> {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  const result = await checkRateLimit(`ip:${ip}`, "ANONYMOUS");

  if (!result.allowed) {
    return apiError(
      "RATE_LIMITED",
      "Too many requests from this IP. Please slow down.",
      { resetAt: result.resetAt }
    );
  }

  return null;
}

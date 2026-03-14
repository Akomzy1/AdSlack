/**
 * Standardized API error system.
 *
 * All API routes should return errors in this shape:
 * { success: false, error: { code, message, statusCode } }
 *
 * Usage:
 *   return apiError("RATE_LIMITED");
 *   return apiError("NOT_FOUND", "Ad not found");
 *   return apiError("FORBIDDEN", undefined, { requiredRole: "PRO" });
 */

import { NextResponse } from "next/server";

// ── Error code catalogue ──────────────────────────────────────────────────────

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "BAD_REQUEST"
  | "VALIDATION_ERROR"
  | "RATE_LIMITED"
  | "PLAN_LIMIT_REACHED"
  | "CREDITS_EXHAUSTED"
  | "AI_UNAVAILABLE"
  | "AI_TIMEOUT"
  | "DATABASE_ERROR"
  | "INTERNAL_ERROR"
  | "STRIPE_ERROR"
  | "EMAIL_ERROR";

interface ErrorDef {
  statusCode: number;
  defaultMessage: string;
  userMessage: string; // shown in UI toasts
}

const ERROR_DEFS: Record<ApiErrorCode, ErrorDef> = {
  UNAUTHORIZED: {
    statusCode: 401,
    defaultMessage: "Authentication required.",
    userMessage: "Please sign in to continue.",
  },
  FORBIDDEN: {
    statusCode: 403,
    defaultMessage: "You do not have permission for this action.",
    userMessage: "Upgrade your plan to access this feature.",
  },
  NOT_FOUND: {
    statusCode: 404,
    defaultMessage: "Resource not found.",
    userMessage: "We couldn't find what you're looking for.",
  },
  BAD_REQUEST: {
    statusCode: 400,
    defaultMessage: "Invalid request.",
    userMessage: "Something looks wrong with your request. Please try again.",
  },
  VALIDATION_ERROR: {
    statusCode: 422,
    defaultMessage: "Validation failed.",
    userMessage: "Please check your input and try again.",
  },
  RATE_LIMITED: {
    statusCode: 429,
    defaultMessage: "Too many requests.",
    userMessage: "You're going too fast. Please wait a moment and try again.",
  },
  PLAN_LIMIT_REACHED: {
    statusCode: 403,
    defaultMessage: "Plan limit reached.",
    userMessage: "You've reached your plan limit. Upgrade to continue.",
  },
  CREDITS_EXHAUSTED: {
    statusCode: 403,
    defaultMessage: "AI credits exhausted.",
    userMessage: "You've used all your AI credits this month. Upgrade to get more.",
  },
  AI_UNAVAILABLE: {
    statusCode: 503,
    defaultMessage: "AI service unavailable.",
    userMessage: "Our AI is temporarily unavailable. Please try again in a moment.",
  },
  AI_TIMEOUT: {
    statusCode: 504,
    defaultMessage: "AI request timed out.",
    userMessage: "The AI took too long to respond. Please try again.",
  },
  DATABASE_ERROR: {
    statusCode: 500,
    defaultMessage: "Database error.",
    userMessage: "Something went wrong. Please try again.",
  },
  INTERNAL_ERROR: {
    statusCode: 500,
    defaultMessage: "Internal server error.",
    userMessage: "Something went wrong on our end. Please try again.",
  },
  STRIPE_ERROR: {
    statusCode: 500,
    defaultMessage: "Payment processing error.",
    userMessage: "There was an issue with payment. Please try again or contact support.",
  },
  EMAIL_ERROR: {
    statusCode: 500,
    defaultMessage: "Email delivery error.",
    userMessage: "We couldn't send the email. Please try again.",
  },
};

// ── API error response ────────────────────────────────────────────────────────

export interface ApiErrorBody {
  success: false;
  error: {
    code: ApiErrorCode;
    message: string;
    userMessage: string;
    statusCode: number;
    details?: unknown;
  };
}

export function apiError(
  code: ApiErrorCode,
  message?: string,
  details?: unknown
): NextResponse<ApiErrorBody> {
  const def = ERROR_DEFS[code];

  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message: message ?? def.defaultMessage,
        userMessage: def.userMessage,
        statusCode: def.statusCode,
        ...(details !== undefined && { details }),
      },
    },
    { status: def.statusCode }
  );
}

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

// ── Error classification ──────────────────────────────────────────────────────

export function isApiError(body: unknown): body is ApiErrorBody {
  return (
    typeof body === "object" &&
    body !== null &&
    "success" in body &&
    (body as { success: unknown }).success === false
  );
}

/**
 * Wraps an async API handler with top-level error catching.
 * Any unhandled exception becomes a 500 INTERNAL_ERROR response.
 */
export function withErrorHandling<TArgs extends unknown[]>(
  handler: (...args: TArgs) => Promise<Response>
) {
  return async (...args: TArgs): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unexpected error";

      console.error("[API Error]", message, err);

      // Import Sentry lazily to avoid edge runtime issues
      try {
        const Sentry = await import("@sentry/nextjs");
        Sentry.captureException(err);
      } catch {
        // Sentry not available
      }

      return apiError("INTERNAL_ERROR", message);
    }
  };
}

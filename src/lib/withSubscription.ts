import type { Subscription, User } from "@prisma/client";
import { UserRole } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { hasMinRole } from "@/constants/plans";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

type UserWithSubscription = User & { subscription: Subscription | null };

type RouteHandler<TParams = Record<string, string>> = (
  req: Request,
  context: { user: UserWithSubscription; params: TParams }
) => Promise<Response>;

/**
 * Higher-order function that wraps an App Router route handler with:
 * - Authentication check (401 if not signed in)
 * - Role-based access control (403 if below required tier)
 * - Injects the full user + subscription into context
 *
 * @example
 * // Protect an endpoint — requires SCALE or higher
 * export const POST = withSubscription(
 *   async (req, { user }) => {
 *     // user.role is at least SCALE
 *     return NextResponse.json({ ok: true });
 *   },
 *   UserRole.SCALE
 * );
 */
export function withSubscription<TParams = Record<string, string>>(
  handler: RouteHandler<TParams>,
  requiredRole: UserRole = UserRole.FREE
) {
  return async (req: Request, routeContext?: { params?: TParams }) => {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role } = session.user;

    if (!hasMinRole(role, requiredRole)) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: `This feature requires the ${requiredRole} plan or higher.`,
          requiredRole,
          currentRole: role,
        },
        { status: 403 }
      );
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { subscription: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return handler(req, {
      user,
      params: (routeContext?.params ?? {}) as TParams,
    });
  };
}

/**
 * Server-component helper: get the current session user with subscription.
 * Returns null if the user is not authenticated.
 */
export async function getAuthenticatedUser(): Promise<UserWithSubscription | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  return db.user.findUnique({
    where: { id: session.user.id },
    include: { subscription: true },
  });
}

/**
 * Convenience: assert a feature is accessible server-side.
 * Throws a 403 Response if not.
 */
export function assertRole(currentRole: UserRole, required: UserRole): void {
  if (!hasMinRole(currentRole, required)) {
    throw NextResponse.json(
      { error: "Forbidden", requiredRole: required },
      { status: 403 }
    );
  }
}

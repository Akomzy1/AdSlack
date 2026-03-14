import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const DASHBOARD_PREFIX = "/discover";
const PROTECTED_PREFIXES = [
  "/discover",
  "/anatomy",
  "/remix",
  "/settings",
  "/billing",
  "/campaigns",
];

// Routes inside (dashboard) group that require authentication
function isDashboardRoute(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

// Auth routes — redirect to dashboard if already logged in
function isAuthRoute(pathname: string): boolean {
  return pathname.startsWith("/login") || pathname.startsWith("/signup");
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const isAuthenticated = Boolean(token);

  // Unauthenticated user hitting a protected route → /login
  if (isDashboardRoute(pathname) && !isAuthenticated) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.url);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated user hitting /login or /signup → /discover
  if (isAuthRoute(pathname) && isAuthenticated) {
    return NextResponse.redirect(new URL(DASHBOARD_PREFIX, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static, _next/image (Next.js internals)
     * - favicon.ico
     * - Public files in /public
     * - API routes (handled by their own auth guards)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

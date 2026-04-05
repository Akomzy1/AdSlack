import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const CREATOR_PREFIX = "/creator/";
const ADVERTISER_PREFIXES = [
  "/discover",
  "/anatomy",
  "/remix",
  "/settings",
  "/billing",
  "/campaigns",
  "/saved",
  "/products",
  "/patterns",
  "/creators",
  "/alerts",
  "/admin",
];

function isCreatorRoute(pathname: string): boolean {
  return pathname === "/creator" || pathname.startsWith(CREATOR_PREFIX);
}

function isAdvertiserRoute(pathname: string): boolean {
  return ADVERTISER_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isAuthRoute(pathname: string): boolean {
  return pathname.startsWith("/login") || pathname.startsWith("/signup");
}

function isSelectRoleRoute(pathname: string): boolean {
  return pathname === "/select-role";
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const isAuthenticated = Boolean(token);
  const userRole = (token as { userRole?: string } | null)?.userRole ?? null;

  // ── /select-role: only allow if no userRole set ──────────────────────────
  if (isSelectRoleRoute(pathname)) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", req.url);
      return NextResponse.redirect(loginUrl);
    }
    if (userRole === "ADVERTISER") {
      return NextResponse.redirect(new URL("/discover", req.url));
    }
    if (userRole === "CREATOR") {
      return NextResponse.redirect(new URL("/creator/briefs", req.url));
    }
    return NextResponse.next();
  }

  // ── /creator/* routes ─────────────────────────────────────────────────────
  if (isCreatorRoute(pathname)) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", req.url);
      return NextResponse.redirect(loginUrl);
    }
    if (!userRole) {
      return NextResponse.redirect(new URL("/select-role", req.url));
    }
    if (userRole === "ADVERTISER") {
      return NextResponse.redirect(new URL("/discover", req.url));
    }
    return NextResponse.next();
  }

  // ── Advertiser routes ─────────────────────────────────────────────────────
  if (isAdvertiserRoute(pathname)) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", req.url);
      return NextResponse.redirect(loginUrl);
    }
    if (!userRole) {
      return NextResponse.redirect(new URL("/select-role", req.url));
    }
    if (userRole === "CREATOR") {
      return NextResponse.redirect(new URL("/creator/briefs", req.url));
    }
    return NextResponse.next();
  }

  // ── Auth routes: already logged in ───────────────────────────────────────
  if (isAuthRoute(pathname) && isAuthenticated) {
    if (userRole === "CREATOR") {
      return NextResponse.redirect(new URL("/creator/briefs", req.url));
    }
    return NextResponse.redirect(new URL("/discover", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/creator/:path*",
    "/discover/:path*",
    "/anatomy/:path*",
    "/remix/:path*",
    "/settings/:path*",
    "/billing/:path*",
    "/campaigns/:path*",
    "/saved/:path*",
    "/products/:path*",
    "/patterns/:path*",
    "/creators/:path*",
    "/alerts/:path*",
    "/admin/:path*",
    "/select-role",
    "/login",
    "/signup",
  ],
};

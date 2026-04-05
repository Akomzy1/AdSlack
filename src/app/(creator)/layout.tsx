"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { UserRole } from "@prisma/client";

const NAV_TABS = [
  { label: "My Profile", href: "/creator/profile" },
  { label: "Briefs", href: "/creator/briefs" },
  { label: "Reviews", href: "/creator/reviews" },
  { label: "Stats", href: "/creator/stats" },
];

export default function CreatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [togglingAvailability, setTogglingAvailability] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (status === "authenticated") {
      const userRole = session?.user?.userRole;
      if (!userRole) {
        router.replace("/select-role");
        return;
      }
      if (userRole !== UserRole.CREATOR) {
        router.replace("/discover");
        return;
      }
    }
  }, [status, session, router]);

  // Load availability
  useEffect(() => {
    if (status === "authenticated" && session?.user?.userRole === UserRole.CREATOR) {
      fetch("/api/creator/profile")
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data && typeof data.isAvailable === "boolean") {
            setAvailable(data.isAvailable);
          }
        })
        .catch(() => null);
    }
  }, [status, session]);

  async function toggleAvailability() {
    if (available === null || togglingAvailability) return;
    setTogglingAvailability(true);
    const newVal = !available;
    setAvailable(newVal);
    try {
      await fetch("/api/creator/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable: newVal }),
      });
    } catch {
      setAvailable(!newVal);
    } finally {
      setTogglingAvailability(false);
    }
  }

  if (status === "loading") {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ backgroundColor: "#06070c" }}
      >
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#06070c" }}>
      {/* Navbar */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{
          backgroundColor: "#06070c",
          borderColor: "#1a1d2e",
        }}
      >
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
          {/* Logo + Badge */}
          <div className="flex items-center gap-3">
            <Link href="/creator/briefs" className="flex items-center gap-2">
              <span className="text-lg font-bold" style={{ color: "#f97316" }}>
                Adsentify
              </span>
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                style={{
                  backgroundColor: "#06b6d4" + "22",
                  color: "#06b6d4",
                  border: "1px solid " + "#06b6d4" + "44",
                }}
              >
                Creator
              </span>
            </Link>

            {/* Nav tabs */}
            <nav className="ml-4 hidden items-center gap-1 sm:flex">
              {NAV_TABS.map((tab) => {
                const active = pathname === tab.href || pathname.startsWith(tab.href + "/");
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className="rounded-lg px-3 py-1.5 text-sm transition-colors"
                    style={{
                      color: active ? "#06b6d4" : "#9ca3af",
                      backgroundColor: active ? "#06b6d4" + "15" : "transparent",
                    }}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Availability toggle */}
            <button
              onClick={toggleAvailability}
              disabled={available === null || togglingAvailability}
              className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all disabled:opacity-50"
              style={{
                borderColor: available ? "#22c55e44" : "#374151",
                backgroundColor: available ? "#22c55e11" : "transparent",
                color: available ? "#22c55e" : "#9ca3af",
              }}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor: available ? "#22c55e" : "#6b7280",
                  boxShadow: available ? "0 0 6px #22c55e" : "none",
                }}
              />
              {available ? "Available" : "Unavailable"}
            </button>

            {/* User name */}
            {session?.user?.name && (
              <span className="hidden text-sm sm:block" style={{ color: "#9ca3af" }}>
                {session.user.name}
              </span>
            )}

            {/* Sign out */}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="rounded-lg border px-3 py-1.5 text-xs transition-colors hover:bg-white/5"
              style={{ borderColor: "#1a1d2e", color: "#6b7280" }}
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="flex overflow-x-auto border-t sm:hidden" style={{ borderColor: "#1a1d2e" }}>
          {NAV_TABS.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex-shrink-0 px-4 py-2 text-xs font-medium transition-colors"
                style={{
                  color: active ? "#06b6d4" : "#9ca3af",
                  borderBottom: active ? "2px solid #06b6d4" : "2px solid transparent",
                }}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
    </div>
  );
}

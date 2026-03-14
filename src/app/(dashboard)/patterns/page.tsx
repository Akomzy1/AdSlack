import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { hasMinRole } from "@/constants/plans";
import { db } from "@/lib/db";
import { PatternStatusBadge } from "@/components/patterns/PatternStatusBadge";
import { PatternsView } from "./PatternsView";
import type { PatternStatus } from "@prisma/client";

export const metadata: Metadata = {
  title: "Creative Pattern Intelligence",
  description: "Discover the structural ad patterns that are winning right now. Copy what works before everyone else does.",
};

export default async function PatternsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/api/auth/signin");

  if (!hasMinRole(session.user.role, "PRO")) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <div className="max-w-sm">
          <div className="mb-4 text-5xl">🧠</div>
          <h1 className="mb-2 text-2xl font-bold text-foreground">
            Creative Pattern Intelligence
          </h1>
          <p className="mb-6 text-muted">
            Discover structural ad formulas that are winning across niches — before your competitors spot them.
          </p>
          <a
            href="/billing"
            className="inline-block rounded-xl bg-gradient-to-r from-accent to-orange-600 px-6 py-3 text-sm font-bold text-white shadow-glow transition-all hover:shadow-[0_0_24px_rgba(249,115,22,0.5)]"
          >
            Upgrade to Pro →
          </a>
        </div>
      </div>
    );
  }

  // Fetch the #1 trending pattern for the hero banner
  const topPattern = await db.creativePattern.findFirst({
    orderBy: { viralityScore: "desc" },
    where: { status: { in: ["EMERGING", "TRENDING"] } },
  });

  const totalPatterns = await db.creativePattern.count();

  return (
    <div className="flex h-full flex-col">
      {/* Hero banner */}
      <div className="relative overflow-hidden border-b border-border bg-gradient-to-br from-surface via-surface to-surface-2 p-6 pb-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(249,115,22,0.08),transparent_60%)]" />
        <div className="relative">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-accent">
            Meta-Intelligence · {totalPatterns} Pattern{totalPatterns !== 1 ? "s" : ""} Detected
          </p>
          <h1 className="text-2xl font-bold text-foreground">
            What&apos;s Working Right Now
          </h1>
          <p className="mt-1 text-sm text-muted max-w-lg">
            Recurring creative structures extracted from thousands of high-velocity ads. Copy the formula, not just the ad.
          </p>

          {topPattern && (
            <div className="mt-5 flex items-start gap-4 rounded-xl border border-accent/30 bg-accent/5 p-4 max-w-xl">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-xl">
                🏆
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-accent">#1 Pattern</span>
                  <PatternStatusBadge status={topPattern.status as PatternStatus} size="sm" />
                </div>
                <p className="font-semibold text-foreground text-sm truncate">{topPattern.patternName}</p>
                <div className="flex gap-3 mt-1.5 text-[10px] text-muted">
                  <span>⚡ {Math.round(topPattern.viralityScore)} virality</span>
                  <span>📢 {topPattern.totalAdsUsing} ads</span>
                  <span>🌍 {(topPattern.nicheSpread as string[]).length} niches</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pattern feed */}
      <PatternsView />
    </div>
  );
}

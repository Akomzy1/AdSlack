/**
 * GET /api/creators
 *
 * Returns creator directory with filters and pagination.
 * Accessible by all authenticated users.
 *
 * Query params:
 *   q          string  — search by name, niche, or bio
 *   platform   string  — TikTok | Instagram | YouTube Shorts
 *   niche      string  — comma-separated list
 *   style      string  — comma-separated content styles
 *   maxPrice   number  — filter by parsed price range
 *   turnaround string  — "1-3" | "3-7" | "7+"
 *   minRating  number  — 4 | 4.5
 *   available  boolean — true = only available creators
 *   sort       string  — rating (default) | price | turnaround | briefs
 *   page       number  — default 1
 *   limit      number  — default 20, max 50
 */

import { NextResponse } from "next/server";
import { withSubscription } from "@/lib/withSubscription";
import { db } from "@/lib/db";

export const GET = withSubscription(async (req) => {
  const { searchParams } = new URL(req.url);

  const q          = searchParams.get("q")?.toLowerCase();
  const platform   = searchParams.get("platform");
  const niches     = searchParams.get("niche")?.split(",").filter(Boolean) ?? [];
  const styles     = searchParams.get("style")?.split(",").filter(Boolean) ?? [];
  const maxPrice   = parseFloat(searchParams.get("maxPrice") ?? "0") || 0;
  const turnaround = searchParams.get("turnaround"); // "1-3" | "3-7" | "7+"
  const minRating  = parseFloat(searchParams.get("minRating") ?? "0") || 0;
  const available  = searchParams.get("available") === "true";
  const sort       = searchParams.get("sort") ?? "rating";
  const page       = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit      = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const skip       = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (available) where.isAvailable = true;
  if (minRating > 0) where.rating = { gte: minRating };

  // Turnaround filter
  if (turnaround === "1-3") where.turnaroundDays = { lte: 3 };
  else if (turnaround === "3-7") where.turnaroundDays = { gte: 3, lte: 7 };
  else if (turnaround === "7+") where.turnaroundDays = { gte: 7 };

  const orderBy =
    sort === "price"      ? { turnaroundDays: "asc" as const } :
    sort === "turnaround" ? { turnaroundDays: "asc" as const } :
    sort === "briefs"     ? { completedBriefs: "desc" as const } :
    sort === "newest"     ? { createdAt: "desc" as const } :
                            { rating: "desc" as const };

  let creators = await db.creator.findMany({
    where,
    orderBy,
    skip,
    take: limit + 1,
    select: {
      id:             true,
      name:           true,
      profileImageUrl:true,
      bio:            true,
      platforms:      true,
      niches:         true,
      contentStyles:  true,
      priceRange:     true,
      turnaroundDays: true,
      rating:         true,
      reviewCount:    true,
      completedBriefs:true,
      country:        true,
      isVerified:     true,
      isAvailable:    true,
    },
  });

  // Client-side filters (arrays stored as JSON/String[])
  if (q) {
    creators = creators.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      c.bio?.toLowerCase().includes(q) ||
      c.niches.some((n) => n.toLowerCase().includes(q)) ||
      c.platforms.some((p) => p.toLowerCase().includes(q))
    );
  }
  if (platform) {
    creators = creators.filter((c) =>
      c.platforms.some((p) => p.toLowerCase() === platform.toLowerCase())
    );
  }
  if (niches.length > 0) {
    creators = creators.filter((c) =>
      niches.some((n) => c.niches.some((cn) => cn.toLowerCase().includes(n.toLowerCase())))
    );
  }
  if (styles.length > 0) {
    creators = creators.filter((c) =>
      styles.some((s) => c.contentStyles.some((cs) => cs.toLowerCase().includes(s.toLowerCase())))
    );
  }
  if (maxPrice > 0) {
    creators = creators.filter((c) => {
      // Parse the lower bound from priceRange e.g. "$50–$150 per video"
      const match = c.priceRange.match(/\$(\d+)/);
      const lo = match?.[1] ? parseInt(match[1], 10) : 0;
      return lo <= maxPrice;
    });
  }

  const hasMore = creators.length > limit;
  if (hasMore) creators.pop();

  const total = await db.creator.count({ where });

  return NextResponse.json({ creators, total, page, hasMore });
});

/**
 * GET /api/saturation/overview
 *
 * Returns market-wide saturation summary, grouped by niche.
 * Sorted by average saturation score descending.
 */

import { NextResponse } from "next/server";
import { withSubscription } from "@/lib/withSubscription";
import { getSaturationOverview } from "@/services/saturationEngine";

export const GET = withSubscription(
  async () => {
    const overview = await getSaturationOverview();
    return NextResponse.json({ niches: overview });
  },
);

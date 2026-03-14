/**
 * GET /api/ads/[id]/saturation
 *
 * Returns the saturation analysis for a specific ad.
 * Includes score, level, duplicate count, and a list of similar ads.
 */

import { NextResponse } from "next/server";
import { withSubscription } from "@/lib/withSubscription";
import { getAdSaturationDetail } from "@/services/saturationEngine";

export const GET = withSubscription(
  async (_req, { params }) => {
    const { id } = params as { id: string };

    const detail = await getAdSaturationDetail(id);
    if (!detail) {
      return NextResponse.json({ error: "Ad not found" }, { status: 404 });
    }

    return NextResponse.json(detail);
  },
);

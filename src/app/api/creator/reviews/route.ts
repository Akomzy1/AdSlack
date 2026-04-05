import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.userRole !== UserRole.CREATOR) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const profile = await db.creatorProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const reviews = await db.creatorReview2.findMany({
    where: { creatorId: profile.id },
    orderBy: { createdAt: "desc" },
    include: {
      reviewer: { select: { name: true, image: true } },
      brief: { select: { briefType: true, productName: true } },
    },
  });

  // Rating distribution
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of reviews) {
    if (r.rating >= 1 && r.rating <= 5) distribution[r.rating]++;
  }

  return NextResponse.json({
    reviews,
    summary: {
      avgRating: profile.rating,
      reviewCount: profile.reviewCount,
      completedBriefs: profile.completedBriefs,
      distribution,
    },
  });
}

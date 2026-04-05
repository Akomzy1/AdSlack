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

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Briefs received this month
  const briefsThisMonth = await db.brief.count({
    where: { creatorId: profile.id, sentAt: { gte: monthStart } },
  });

  // Last 10 brief events
  const recentBriefs = await db.brief.findMany({
    where: { creatorId: profile.id },
    orderBy: { sentAt: "desc" },
    take: 10,
    select: {
      id: true,
      status: true,
      productName: true,
      brandName: true,
      briefType: true,
      sentAt: true,
      respondedAt: true,
      completedAt: true,
    },
  });

  return NextResponse.json({
    profileViews: profile.profileViews,
    briefsThisMonth,
    completedBriefs: profile.completedBriefs,
    avgRating: profile.rating,
    recentBriefs,
  });
}

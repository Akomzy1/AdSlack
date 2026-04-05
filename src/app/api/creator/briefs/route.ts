import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserRole, BriefStatus } from "@prisma/client";

export async function GET(req: Request) {
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

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status");

  const where: { creatorId: string; status?: BriefStatus } = { creatorId: profile.id };
  if (statusParam && Object.values(BriefStatus).includes(statusParam as BriefStatus)) {
    where.status = statusParam as BriefStatus;
  }

  const briefs = await db.brief.findMany({
    where,
    orderBy: { sentAt: "desc" },
    include: {
      sender: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  // Count by status
  const counts = await db.brief.groupBy({
    by: ["status"],
    where: { creatorId: profile.id },
    _count: true,
  });

  return NextResponse.json({ briefs, counts });
}

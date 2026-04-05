import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
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

  const brief = await db.brief.findFirst({
    where: { id: params.id, creatorId: profile.id },
    include: {
      sender: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  if (!brief) {
    return NextResponse.json({ error: "Brief not found" }, { status: 404 });
  }

  return NextResponse.json(brief);
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
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

  const brief = await db.brief.findFirst({
    where: { id: params.id, creatorId: profile.id },
  });
  if (!brief) {
    return NextResponse.json({ error: "Brief not found" }, { status: 404 });
  }

  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { status } = body;
  if (!status) {
    return NextResponse.json({ error: "status is required" }, { status: 400 });
  }

  const updateData: {
    status: string;
    respondedAt?: Date;
    completedAt?: Date;
  } = { status };

  if (status === "ACCEPTED" || status === "DECLINED") {
    updateData.respondedAt = new Date();
  }
  if (status === "COMPLETED") {
    updateData.completedAt = new Date();
  }

  const updated = await db.brief.update({
    where: { id: params.id },
    data: updateData as Parameters<typeof db.brief.update>[0]["data"],
  });

  // Increment completedBriefs counter
  if (status === "COMPLETED") {
    await db.creatorProfile.update({
      where: { id: profile.id },
      data: { completedBriefs: { increment: 1 } },
    });
  }

  return NextResponse.json(updated);
}

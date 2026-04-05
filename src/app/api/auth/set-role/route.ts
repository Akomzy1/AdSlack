import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { role?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { role } = body;
  if (role !== "ADVERTISER" && role !== "CREATOR") {
    return NextResponse.json(
      { error: "role must be ADVERTISER or CREATOR" },
      { status: 400 }
    );
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { userRole: role as UserRole },
  });

  return NextResponse.json({ success: true });
}

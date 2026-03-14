import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { PLANS } from "@/constants/plans";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      role: true,
      subscription: {
        select: {
          creditsUsed: true,
          creditsLimit: true,
          billingCycleStart: true,
          plan: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const plan = PLANS[user.role];
  const creditsLimit = plan.creditsPerMonth === -1 ? 999999 : plan.creditsPerMonth;
  const creditsUsed = user.subscription?.creditsUsed ?? 0;
  const creditsRemaining = Math.max(0, creditsLimit - creditsUsed);

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    role: user.role,
    plan: {
      name: plan.name,
      price: plan.price,
      creditsRemaining,
      creditsLimit,
      creditsUsed,
      searchesPerDay: plan.searchesPerDay,
      teamSeats: plan.teamSeats,
      features: plan.features,
      billingCycleStart: user.subscription?.billingCycleStart ?? null,
    },
  });
}

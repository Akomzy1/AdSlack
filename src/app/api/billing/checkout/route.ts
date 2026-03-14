import { UserRole } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { createCheckoutSession } from "@/lib/billing";
import { hasMinRole } from "@/constants/plans";

const schema = z.object({
  targetRole: z.nativeEnum(UserRole),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { targetRole } = parsed.data;

  // Prevent downgrade via this endpoint
  if (hasMinRole(session.user.role, targetRole)) {
    return NextResponse.json(
      { error: "Already on this plan or higher" },
      { status: 400 }
    );
  }

  if (targetRole === UserRole.FREE) {
    return NextResponse.json(
      { error: "Use the customer portal to cancel" },
      { status: 400 }
    );
  }

  try {
    const url = await createCheckoutSession({
      userId: session.user.id,
      userEmail: session.user.email!,
      targetRole,
    });
    return NextResponse.json({ url });
  } catch (err) {
    console.error("Checkout error:", err);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

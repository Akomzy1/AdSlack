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
  if (session.user.userRole !== UserRole.CREATOR) {
    return NextResponse.json({ error: "Forbidden: Creator role required" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    displayName,
    bio,
    profileImageUrl,
    platforms,
    niches,
    contentStyles,
    priceMin,
    priceMax,
    turnaroundDays,
    portfolioUrls,
    country,
    language,
    isAvailable,
  } = body as {
    displayName: string;
    bio?: string;
    profileImageUrl?: string;
    platforms?: string[];
    niches?: string[];
    contentStyles?: string[];
    priceMin: number;
    priceMax: number;
    turnaroundDays?: number;
    portfolioUrls?: string[];
    country?: string;
    language?: string;
    isAvailable?: boolean;
  };

  if (!displayName) {
    return NextResponse.json({ error: "displayName is required" }, { status: 400 });
  }

  try {
    const profile = await db.creatorProfile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        displayName,
        bio: bio ?? null,
        profileImageUrl: profileImageUrl ?? null,
        platforms: platforms ?? [],
        niches: niches ?? [],
        contentStyles: contentStyles ?? [],
        priceMin: priceMin ?? 0,
        priceMax: priceMax ?? 0,
        turnaroundDays: turnaroundDays ?? 5,
        portfolioUrls: portfolioUrls ?? [],
        country: country ?? null,
        language: language ?? "English",
        isAvailable: isAvailable ?? true,
      },
      update: {
        displayName,
        bio: bio ?? null,
        profileImageUrl: profileImageUrl ?? null,
        platforms: platforms ?? [],
        niches: niches ?? [],
        contentStyles: contentStyles ?? [],
        priceMin: priceMin ?? 0,
        priceMax: priceMax ?? 0,
        turnaroundDays: turnaroundDays ?? 5,
        portfolioUrls: portfolioUrls ?? [],
        country: country ?? null,
        language: language ?? "English",
        isAvailable: isAvailable ?? true,
      },
    });

    return NextResponse.json(profile, { status: 201 });
  } catch (err) {
    console.error("[creator/profile POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.userRole !== UserRole.CREATOR) {
    return NextResponse.json({ error: "Forbidden: Creator role required" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const profile = await db.creatorProfile.update({
      where: { userId: session.user.id },
      data: body as Parameters<typeof db.creatorProfile.update>[0]["data"],
    });
    return NextResponse.json(profile);
  } catch (err) {
    console.error("[creator/profile PATCH]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await db.creatorProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json(profile);
}

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/withSubscription";
import { RemixView } from "./RemixView";

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ad = await db.ad.findUnique({
    where: { id: params.id },
    select: { brandName: true, productName: true },
  });
  if (!ad) return { title: "Not Found" };
  return {
    title: `Forge Remix — ${ad.productName ?? ad.brandName} | Adsentify`,
    description: `AI-powered creative variations for ${ad.brandName}'s winning ad.`,
  };
}

export default async function RemixPage({ params }: Props) {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/api/auth/signin");

  const ad = await db.ad.findUnique({
    where: { id: params.id },
    select: {
      id:           true,
      brandName:    true,
      productName:  true,
      niche:        true,
      platform:     true,
      adType:       true,
      duration:     true,
      thumbnailUrl: true,
      isActive:     true,
    },
  });

  if (!ad) notFound();

  // Subscription credit state
  const isUnlimited     = user.subscription?.creditsLimit === 999999;
  const creditsUsed     = user.subscription?.creditsUsed ?? 0;
  const creditsLimit    = user.subscription?.creditsLimit ?? 0;
  const creditsRemaining = isUnlimited ? null : Math.max(0, creditsLimit - creditsUsed);
  const creditsTotal     = isUnlimited ? null : creditsLimit;

  return (
    <RemixView
      ad={ad}
      userRole={user.role}
      creditsRemaining={creditsRemaining}
      creditsTotal={creditsTotal}
    />
  );
}

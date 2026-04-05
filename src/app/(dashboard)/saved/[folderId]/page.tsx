import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import type { AdWithMetrics } from "@/types/ads";
import { FolderView } from "./FolderView";

interface Props {
  params: { folderId: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (params.folderId === "all") {
    return { title: "All Saved Ads | Adsentify" };
  }
  const folder = await db.folder.findUnique({
    where: { id: params.folderId },
    select: { name: true },
  });
  return { title: folder ? `${folder.name} — Saved | Adsentify` : "Saved Folder" };
}

export default async function FolderPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/api/auth/signin");

  const userId = session.user.id;
  const { folderId } = params;

  // Build where clause for saved ads
  const savedWhere =
    folderId === "all"
      ? { userId }
      : { userId, folderId };

  // For named folders, verify ownership
  let folderName = "All Saved";
  if (folderId !== "all") {
    const folder = await db.folder.findUnique({
      where: { id: folderId },
      select: { name: true, userId: true },
    });
    if (!folder || folder.userId !== userId) notFound();
    folderName = folder.name;
  }

  const savedAds = await db.savedAd.findMany({
    where: savedWhere,
    orderBy: { createdAt: "desc" },
    include: {
      ad: {
        include: {
          metrics: {
            orderBy: { recordedAt: "desc" },
            take: 1,
            select: {
              views: true, likes: true, comments: true, shares: true,
            },
          },
        },
      },
    },
  });

  const ads: AdWithMetrics[] = savedAds.map(({ ad }) => ({
    id: ad.id,
    platform: ad.platform,
    externalId: ad.externalId,
    brandName: ad.brandName,
    productName: ad.productName,
    niche: ad.niche,
    adType: ad.adType,
    duration: ad.duration,
    country: ad.country,
    language: ad.language,
    hookText: ad.hookText,
    hookType: ad.hookType,
    ctaText: ad.ctaText,
    ctaType: ad.ctaType,
    thumbnailUrl: ad.thumbnailUrl,
    landingPageUrl: ad.landingPageUrl,
    estimatedSpendMin: ad.estimatedSpendMin,
    estimatedSpendMax: ad.estimatedSpendMax,
    firstSeenAt: ad.firstSeenAt.toISOString(),
    lastSeenAt: ad.lastSeenAt.toISOString(),
    daysRunning: ad.daysRunning,
    isActive: ad.isActive,
    status: ad.status,
    velocityScore: ad.velocityScore,
    velocityTier: ad.velocityTier as AdWithMetrics["velocityTier"],
    latestMetrics: ad.metrics[0]
      ? {
          views: Number(ad.metrics[0].views),
          likes: Number(ad.metrics[0].likes),
          comments: Number(ad.metrics[0].comments),
          shares: Number(ad.metrics[0].shares),
          earlyVelocityScore: 0,
        }
      : null,
  }));

  // User role for export gating
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  return (
    <FolderView
      folderId={folderId}
      folderName={folderName}
      ads={ads}
      userRole={user?.role ?? "FREE"}
    />
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { SavedView } from "./SavedView";

export const metadata: Metadata = {
  title: "Saved Ads | Adslack",
  description: "Your saved ads organized into folders.",
};

export default async function SavedPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/api/auth/signin");

  const userId = session.user.id;

  const [folders, allSavedCount] = await Promise.all([
    db.folder.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      include: {
        _count: { select: { savedAds: true } },
        savedAds: {
          orderBy: { createdAt: "desc" },
          take: 4,
          select: {
            ad: { select: { thumbnailUrl: true, niche: true } },
          },
        },
      },
    }),
    db.savedAd.count({ where: { userId } }),
  ]);

  const folderSummaries = folders.map((f) => ({
    id: f.id,
    name: f.name,
    adCount: f._count.savedAds,
    thumbnails: f.savedAds
      .map((s) => s.ad.thumbnailUrl)
      .filter((t): t is string => !!t),
    niches: [...new Set(f.savedAds.map((s) => s.ad.niche).filter(Boolean))] as string[],
    createdAt: f.createdAt.toISOString(),
  }));

  return (
    <SavedView
      folders={folderSummaries}
      allSavedCount={allSavedCount}
    />
  );
}

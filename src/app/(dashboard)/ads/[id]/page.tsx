import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdDetailView } from "./AdDetailView";

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ad = await db.ad.findUnique({
    where: { id: params.id },
    select: { brandName: true, productName: true },
  });
  if (!ad) return { title: "Ad Not Found" };
  return {
    title: `${ad.brandName}${ad.productName ? ` · ${ad.productName}` : ""} — X-Ray`,
    description: `Full AI anatomy breakdown for ${ad.brandName}'s ad creative.`,
  };
}

export default async function AdDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) notFound();

  // Fetch ad with latest metrics snapshot in one query
  const ad = await db.ad.findUnique({
    where: { id: params.id },
    include: {
      metrics: {
        orderBy: { recordedAt: "desc" },
        take: 1,
        select: {
          views: true, likes: true, comments: true, shares: true,
          earlyVelocityScore: true, recordedAt: true,
        },
      },
    },
  });

  if (!ad) notFound();

  // Fetch cached anatomy (null if not yet generated)
  const anatomy = await db.adAnatomy.findUnique({
    where: { adId: params.id },
  });

  const m = ad.metrics[0];

  return (
    <AdDetailView
      ad={{
        id:                ad.id,
        platform:          ad.platform,
        externalId:        ad.externalId,
        brandName:         ad.brandName,
        productName:       ad.productName,
        niche:             ad.niche,
        adType:            ad.adType,
        duration:          ad.duration,
        country:           ad.country,
        language:          ad.language,
        hookText:          ad.hookText,
        hookType:          ad.hookType,
        ctaText:           ad.ctaText,
        ctaType:           ad.ctaType,
        thumbnailUrl:      ad.thumbnailUrl,
        videoUrl:          ad.videoUrl,
        landingPageUrl:    ad.landingPageUrl,
        estimatedSpendMin: ad.estimatedSpendMin,
        estimatedSpendMax: ad.estimatedSpendMax,
        firstSeenAt:       ad.firstSeenAt.toISOString(),
        lastSeenAt:        ad.lastSeenAt.toISOString(),
        daysRunning:       ad.daysRunning,
        isActive:          ad.isActive,
        status:            ad.status,
        velocityScore:     ad.velocityScore,
        velocityTier:      ad.velocityTier,
      }}
      latestMetrics={
        m
          ? {
              views:    Number(m.views),
              likes:    Number(m.likes),
              comments: Number(m.comments),
              shares:   Number(m.shares),
            }
          : null
      }
      initialAnatomy={
        anatomy
          ? {
              hookScore:        anatomy.hookScore,
              emotionalTriggers: anatomy.emotionalTriggers as string[] | null,
              scriptStructure:   anatomy.scriptStructure as {
                formula: string;
                stages: Array<{ stage: string; description: string; duration?: string }>;
              } | null,
              colorPalette:    anatomy.colorPalette as {
                dominant: string[];
                accent: string;
                mood: string;
              } | null,
              audioMood:       anatomy.audioMood,
              pacingNotes:     anatomy.pacingNotes,
              targetPsychology: anatomy.targetPsychology,
              fullScriptBreakdown: anatomy.fullScript
                ? JSON.parse(anatomy.fullScript) as Array<{
                    timestamp: string;
                    action: string;
                    text: string;
                  }>
                : null,
              funnelType: anatomy.funnelType,
              aiModel:    anatomy.aiModel,
              generatedAt: anatomy.generatedAt.toISOString(),
            }
          : null
      }
    />
  );
}

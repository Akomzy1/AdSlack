"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import type { VelocityTier } from "@/types/ads";
import { LifecycleBadge } from "@/components/products/LifecycleBadge";
import { SaturationMeter } from "@/components/products/SaturationMeter";
import { STAGE_META } from "@/services/lifecycleEngine";
import type { LifecycleStage } from "@/services/lifecycleEngine";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdDetail {
  id: string;
  platform: string;
  externalId: string;
  brandName: string;
  productName: string | null;
  niche: string;
  adType: string;
  duration: number | null;
  country: string;
  language: string;
  hookText: string | null;
  hookType: string | null;
  ctaText: string | null;
  ctaType: string | null;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  landingPageUrl: string | null;
  estimatedSpendMin: number | null;
  estimatedSpendMax: number | null;
  firstSeenAt: string;
  lastSeenAt: string;
  daysRunning: number;
  isActive: boolean;
  status: string;
  velocityScore: number;
  velocityTier: string;
}

interface LatestMetrics {
  views: number;
  likes: number;
  comments: number;
  shares: number;
}

interface ScriptStage {
  stage: string;
  description: string;
  duration?: string;
}

interface ScriptBreakdownItem {
  timestamp: string;
  action: string;
  text: string;
}

interface AnatomyData {
  hookScore: number | null;
  emotionalTriggers: string[] | null;
  scriptStructure: { formula: string; stages: ScriptStage[] } | null;
  colorPalette: { dominant: string[]; accent: string; mood: string } | null;
  audioMood: string | null;
  pacingNotes: string | null;
  targetPsychology: string | null;
  fullScriptBreakdown: ScriptBreakdownItem[] | null;
  funnelType: string | null;
  aiModel: string | null;
  generatedAt: string;
}

interface AdDetailViewProps {
  ad: AdDetail;
  latestMetrics: LatestMetrics | null;
  initialAnatomy: AnatomyData | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const NICHE_EMOJI: Record<string, string> = {
  beauty: "💄", kitchen: "🍳", pets: "🐾", fitness: "💪",
  tech: "💻", home_decor: "🏠", fashion: "👗", health: "🌿",
  gaming: "🎮", finance: "💰", education: "📚", other: "📦",
};

const PLATFORM_CONFIG: Record<string, { label: string; bgClass: string; icon: string }> = {
  TIKTOK:    { label: "TikTok",    bgClass: "bg-[#ff005018] text-[#ff0050] border-[#ff005030]", icon: "♪" },
  FACEBOOK:  { label: "Facebook",  bgClass: "bg-[#1877f218] text-[#1877f2] border-[#1877f230]", icon: "f" },
  INSTAGRAM: { label: "Instagram", bgClass: "bg-[#e1306c18] text-[#e1306c] border-[#e1306c30]", icon: "◎" },
  YOUTUBE:   { label: "YouTube",   bgClass: "bg-[#ff000018] text-[#ff0000] border-[#ff000030]", icon: "▶" },
};

const VELOCITY_CONFIG: Record<VelocityTier, { label: string; className: string }> = {
  EXPLOSIVE: { label: "🔥 Explosive", className: "bg-success/15 text-success border-success/30 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.4)]" },
  HIGH:      { label: "⚡ High",      className: "bg-accent/15 text-accent border-accent/30 shadow-[0_0_6px_rgba(249,115,22,0.3)]" },
  RISING:    { label: "↑ Rising",     className: "bg-warning/15 text-warning border-warning/30" },
  STEADY:    { label: "· Steady",     className: "bg-muted/10 text-muted border-border" },
};

const TRIGGER_COLORS: Record<string, string> = {
  FOMO:       "bg-accent/15 text-accent border-accent/30",
  Curiosity:  "bg-primary/15 text-primary border-primary/30",
  Trust:      "bg-success/15 text-success border-success/30",
  Aspiration: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  Fear:       "bg-danger/15 text-danger border-danger/30",
  Humor:      "bg-warning/15 text-warning border-warning/30",
  Guilt:      "bg-muted/15 text-muted-foreground border-border",
  Pride:      "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  Urgency:    "bg-danger/15 text-danger border-danger/30",
  Nostalgia:  "bg-purple-400/15 text-purple-300 border-purple-400/30",
  Desire:     "bg-pink-500/15 text-pink-400 border-pink-500/30",
  Validation: "bg-success/15 text-success border-success/30",
  Greed:      "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  Belonging:  "bg-primary/15 text-primary border-primary/30",
};

const FUNNEL_LABELS: Record<string, string> = {
  DIRECT_RESPONSE: "Direct Response",
  LEAD_GEN:        "Lead Generation",
  CONTENT_FIRST:   "Content-First",
  BRAND_AWARENESS: "Brand Awareness",
  RETARGETING:     "Retargeting",
  PRODUCT_LAUNCH:  "Product Launch",
};

const COUNTRY_FLAGS: Record<string, string> = {
  US: "🇺🇸", GB: "🇬🇧", CA: "🇨🇦", AU: "🇦🇺", DE: "🇩🇪",
  FR: "🇫🇷", IN: "🇮🇳", BR: "🇧🇷", JP: "🇯🇵", KR: "🇰🇷",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function fmtSpend(min?: number | null, max?: number | null): string {
  if (!min && !max) return "—";
  if (min && max)   return `$${fmt(min)}–$${fmt(max)}`;
  if (max)          return `≤$${fmt(max)}`;
  return `≥$${fmt(min!)}`;
}

function buildBriefText(ad: AdDetail, anatomy: AnatomyData): string {
  const lines: string[] = [
    `AD BRIEF — ${ad.brandName}${ad.productName ? ` · ${ad.productName}` : ""}`,
    "=".repeat(60),
    "",
    `Platform:   ${ad.platform}`,
    `Ad Type:    ${ad.adType}${ad.duration ? ` · ${ad.duration}s` : ""}`,
    `Niche:      ${ad.niche}`,
    `Country:    ${ad.country}`,
    `Days Live:  ${ad.daysRunning}`,
    `Velocity:   ${ad.velocityScore}/100 (${ad.velocityTier})`,
    "",
    "HOOK",
    "-".repeat(40),
    `Hook Text:  ${ad.hookText ?? "—"}`,
    `Hook Type:  ${ad.hookType ?? "—"}`,
    `Hook Score: ${anatomy.hookScore ?? "—"}/100`,
    "",
    "SCRIPT STRUCTURE",
    "-".repeat(40),
    anatomy.scriptStructure?.formula ?? "—",
    "",
    ...(anatomy.scriptStructure?.stages ?? []).map(
      (s) => `  [${s.stage}]${s.duration ? ` (${s.duration})` : ""}: ${s.description}`
    ),
    "",
    "EMOTIONAL TRIGGERS",
    "-".repeat(40),
    (anatomy.emotionalTriggers ?? []).join(", "),
    "",
    "TARGET PSYCHOLOGY",
    "-".repeat(40),
    anatomy.targetPsychology ?? "—",
    "",
    "FUNNEL TYPE",
    "-".repeat(40),
    FUNNEL_LABELS[anatomy.funnelType ?? ""] ?? anatomy.funnelType ?? "—",
    "",
    "AUDIO & PACING",
    "-".repeat(40),
    `Audio: ${anatomy.audioMood ?? "—"}`,
    `Pacing: ${anatomy.pacingNotes ?? "—"}`,
    "",
  ];

  if (anatomy.fullScriptBreakdown?.length) {
    lines.push("FULL SCRIPT", "-".repeat(40));
    anatomy.fullScriptBreakdown.forEach((s) => {
      lines.push(`${s.timestamp.padEnd(8)} [${s.action}]`);
      lines.push(`         ${s.text}`);
      lines.push("");
    });
  }

  lines.push(`Generated by Adsentify · ${anatomy.generatedAt}`);
  return lines.join("\n");
}

// ─── Main component ───────────────────────────────────────────────────────────

// ── AdSaturation types (local, matching API shape) ───────────────────────────

interface SimilarAdItem {
  id:              string;
  brandName:       string;
  similarityScore: number;
  similarityType:  string;
  hookText:        string | null;
  thumbnailUrl:    string | null;
  niche:           string;
}

interface AdSaturationData {
  adId:                    string;
  saturationScore:         number;
  level:                   { label: string; color: string };
  duplicateCount:          number;
  duplicateAdvertiserCount: number;
  similarAds:              SimilarAdItem[];
}

// ── ProductInsight types (local, matching API shape) ──────────────────────────

interface ProductInsightData {
  id: string;
  productName: string;
  productCategory: string;
  lifecycleStage: LifecycleStage;
  saturationScore: number;
  totalAdCount: number;
  uniqueAdvertiserCount: number;
  avgDaysRunning: number;
  trendDirection: string;
  priceRange: string | null;
  topPlatform: string | null;
}

// ── Main component ─────────────────────────────────────────────────────────────

export function AdDetailView({ ad, latestMetrics, initialAnatomy }: AdDetailViewProps) {
  const [anatomy, setAnatomy] = useState<AnatomyData | null>(initialAnatomy);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [productInsight, setProductInsight] = useState<ProductInsightData | null | "loading">("loading");
  const [saturation, setSaturation] = useState<AdSaturationData | null | "loading">("loading");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/ads/${ad.id}/product-insight`)
      .then((r) => r.ok ? r.json() as Promise<{ data: ProductInsightData | null }> : null)
      .then((json) => { if (!cancelled) setProductInsight(json?.data ?? null); })
      .catch(() => { if (!cancelled) setProductInsight(null); });
    return () => { cancelled = true; };
  }, [ad.id]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/ads/${ad.id}/saturation`)
      .then((r) => r.ok ? r.json() as Promise<AdSaturationData> : null)
      .then((json) => { if (!cancelled) setSaturation(json ?? null); })
      .catch(() => { if (!cancelled) setSaturation(null); });
    return () => { cancelled = true; };
  }, [ad.id]);

  const platform = PLATFORM_CONFIG[ad.platform] ?? {
    label: ad.platform, bgClass: "bg-surface-2 text-muted border-border", icon: "?",
  };
  const velocity = VELOCITY_CONFIG[ad.velocityTier as VelocityTier] ?? VELOCITY_CONFIG.STEADY;
  const nicheEmoji = NICHE_EMOJI[ad.niche] ?? "📦";
  const flag = COUNTRY_FLAGS[ad.country] ?? "🌍";

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch(`/api/ads/${ad.id}/anatomy`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string }).error ?? `HTTP ${res.status}`
        );
      }
      const data = await res.json() as { anatomy: AnatomyData; meta: { generatedAt: string; model: string } };
      setAnatomy({ ...data.anatomy, aiModel: data.meta.model, generatedAt: data.meta.generatedAt });
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  }, [ad.id]);

  const handleCopyScript = useCallback(() => {
    if (!anatomy?.fullScriptBreakdown) return;
    const text = anatomy.fullScriptBreakdown
      .map((s) => `${s.timestamp}  [${s.action}]\n  ${s.text}`)
      .join("\n\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [anatomy]);

  const handleExportBrief = useCallback(() => {
    if (!anatomy) return;
    const text = buildBriefText(ad, anatomy);
    const blob = new Blob([text], { type: "text/plain" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `${ad.brandName.toLowerCase().replace(/\s+/g, "-")}-brief.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [ad, anatomy]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-5 py-6 space-y-6">

        {/* ── Header bar ───────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <Link
            href="/discover"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="font-mono">←</span> Back to Discover
          </Link>
          <div className="flex items-center gap-2">
            {anatomy?.fullScriptBreakdown && (
              <button
                onClick={handleCopyScript}
                className="btn-secondary h-8 px-3 text-xs"
              >
                {copied ? "✓ Copied" : "Copy Script"}
              </button>
            )}
            {anatomy && (
              <button
                onClick={handleExportBrief}
                className="btn-secondary h-8 px-3 text-xs"
              >
                ↓ Export Brief
              </button>
            )}
          </div>
        </div>

        {/* ── Top section ──────────────────────────────────────────────── */}
        <div className="flex gap-5">
          {/* Thumbnail / Emoji */}
          <div className="shrink-0">
            {ad.thumbnailUrl ? (
              <div className="relative h-40 w-32 overflow-hidden rounded-xl border border-border bg-surface-3">
                <Image
                  src={ad.thumbnailUrl}
                  alt={`${ad.brandName} ad`}
                  fill
                  className="object-cover"
                  sizes="128px"
                />
              </div>
            ) : (
              <div className="flex h-40 w-32 items-center justify-center rounded-xl border border-border bg-surface-2 text-5xl">
                {nicheEmoji}
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="flex flex-1 flex-col justify-between min-w-0">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
                  {ad.niche.replace("_", " ")}
                </span>
                {ad.isActive && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success">
                    ● Live
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-foreground leading-tight truncate">
                {ad.productName ?? ad.brandName}
              </h1>
              <p className="text-sm text-muted-foreground font-medium">
                {ad.brandName}
                {ad.productName && (
                  <span className="ml-2 text-muted">·</span>
                )}
                {ad.adType === "VIDEO" && ad.duration && (
                  <span className="ml-2 font-mono text-xs text-muted">{ad.duration}s</span>
                )}
              </p>
            </div>

            {/* Tags row */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {/* Platform */}
              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${platform.bgClass}`}>
                <span className="font-mono">{platform.icon}</span>
                {platform.label}
              </span>

              {/* Velocity */}
              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${velocity.className}`}>
                {velocity.label}
                {ad.velocityScore > 0 && (
                  <span className="ml-1 font-mono opacity-70">{ad.velocityScore}</span>
                )}
              </span>

              {/* Ad type */}
              <span className="inline-flex items-center rounded-full border border-border bg-surface-2 px-2.5 py-0.5 text-xs font-mono text-muted-foreground">
                {ad.adType}
              </span>

              {/* Spend */}
              {(ad.estimatedSpendMin || ad.estimatedSpendMax) && (
                <span className="inline-flex items-center rounded-full border border-border bg-surface-2 px-2.5 py-0.5 text-xs font-mono text-muted-foreground">
                  {fmtSpend(ad.estimatedSpendMin, ad.estimatedSpendMax)}/mo
                </span>
              )}

              {/* Days running */}
              <span className="inline-flex items-center rounded-full border border-border bg-surface-2 px-2.5 py-0.5 text-xs font-mono text-muted-foreground">
                {ad.daysRunning}d running
              </span>

              {/* Country */}
              <span className="inline-flex items-center rounded-full border border-border bg-surface-2 px-2.5 py-0.5 text-xs font-mono text-muted-foreground">
                {flag} {ad.country}
              </span>
            </div>

            {/* Forge Remix CTA */}
            <div className="mt-4">
              <Link
                href={`/ads/${ad.id}/remix`}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-accent to-orange-400 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(249,115,22,0.3)] transition-all duration-200 hover:shadow-[0_0_30px_rgba(249,115,22,0.5)] hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>⚡</span>
                Forge Remix
              </Link>
            </div>
          </div>
        </div>

        {/* ── Stats row ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-5 gap-3">
          <StatCard
            icon="❤️" label="Likes"
            value={latestMetrics ? fmt(latestMetrics.likes) : "—"}
            color="text-pink-400"
          />
          <StatCard
            icon="💬" label="Comments"
            value={latestMetrics ? fmt(latestMetrics.comments) : "—"}
            color="text-primary"
          />
          <StatCard
            icon="🔁" label="Shares"
            value={latestMetrics ? fmt(latestMetrics.shares) : "—"}
            color="text-accent"
          />
          <StatCard
            icon="🎯" label="Hook Score"
            value={anatomy?.hookScore != null ? `${anatomy.hookScore}` : "—"}
            suffix={anatomy?.hookScore != null ? "/100" : undefined}
            color={
              !anatomy?.hookScore ? "text-muted" :
              anatomy.hookScore >= 85 ? "text-success" :
              anatomy.hookScore >= 65 ? "text-accent" : "text-warning"
            }
          />
          <StatCard
            icon="🛒" label="CTA Type"
            value={ad.ctaType
              ? ad.ctaType.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
              : "—"
            }
            color="text-foreground-2"
          />
        </div>

        {/* ── Product Lifecycle card ───────────────────────────────────── */}
        <section>
          <div className="mb-4 flex items-center gap-2.5">
            <div className="h-4 w-0.5 rounded-full bg-primary" />
            <h2 className="text-base font-bold text-foreground">Product Lifecycle</h2>
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
              Market
            </span>
          </div>

          {productInsight === "loading" ? (
            <div className="rounded-xl border border-border bg-surface p-5 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-6 w-28 rounded-full bg-surface-3" />
                <div className="h-2 flex-1 rounded-full bg-surface-3" />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="h-5 w-12 rounded bg-surface-3" />
                    <div className="h-3 w-16 rounded bg-surface-3" />
                  </div>
                ))}
              </div>
            </div>
          ) : productInsight ? (
            <ProductLifecycleCard insight={productInsight} />
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-surface/50 p-6 text-center">
              <p className="text-sm text-muted">
                No lifecycle data yet — product matching runs every 12 hours.
              </p>
            </div>
          )}
        </section>

        {/* ── Saturation Analysis card ─────────────────────────────────── */}
        <section>
          <div className="mb-4 flex items-center gap-2.5">
            <div className="h-4 w-0.5 rounded-full bg-orange-400" />
            <h2 className="text-base font-bold text-foreground">Saturation Analysis</h2>
            <span className="rounded-full bg-orange-400/15 px-2 py-0.5 text-[10px] font-semibold text-orange-400">
              Market
            </span>
          </div>

          {saturation === "loading" ? (
            <div className="rounded-xl border border-border bg-surface p-5 animate-pulse">
              <div className="flex gap-4 mb-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="h-6 w-10 rounded bg-surface-3" />
                    <div className="h-3 w-16 rounded bg-surface-3" />
                  </div>
                ))}
              </div>
              <div className="h-2 w-full rounded-full bg-surface-3" />
            </div>
          ) : saturation ? (
            <SaturationAnalysisCard saturation={saturation} adId={ad.id} />
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-surface/50 p-6 text-center">
              <p className="text-sm text-muted">
                No saturation data yet — analysis runs every 12 hours.
              </p>
            </div>
          )}
        </section>

        {/* ── Anatomy X-Ray section ─────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="h-4 w-0.5 rounded-full bg-accent" />
              <h2 className="text-base font-bold text-foreground">Ad Anatomy X-Ray</h2>
              <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">
                AI
              </span>
            </div>
            {anatomy?.aiModel && (
              <span className="font-mono text-[10px] text-muted">
                {anatomy.aiModel.split(" ")[0]}
              </span>
            )}
          </div>

          {!anatomy && !isGenerating && (
            <GeneratePrompt
              onGenerate={handleGenerate}
              error={generateError}
            />
          )}

          {isGenerating && <AnatomySkeleton />}

          {anatomy && !isGenerating && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* 1 — Hook Analysis */}
              <AnatomyCard title="Hook Analysis" icon="🎣" delay={0}>
                {ad.hookText && (
                  <blockquote className="border-l-2 border-accent/50 pl-3 mb-3">
                    <p className="text-sm italic leading-relaxed text-foreground-2">
                      &ldquo;{ad.hookText}&rdquo;
                    </p>
                  </blockquote>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  {anatomy.hookScore != null && (
                    <div className="flex items-center gap-1.5 rounded-lg bg-surface-3 px-3 py-1.5">
                      <span className="font-mono text-lg font-bold text-accent leading-none">
                        {anatomy.hookScore}
                      </span>
                      <span className="text-xs text-muted">/100</span>
                    </div>
                  )}
                  {ad.hookType && (
                    <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      {ad.hookType.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
                    </span>
                  )}
                </div>
              </AnatomyCard>

              {/* 2 — Script Structure */}
              <AnatomyCard title="Script Structure" icon="📐" delay={100}>
                {anatomy.scriptStructure?.formula && (
                  <div className="mb-3 flex flex-wrap items-center gap-1">
                    {anatomy.scriptStructure.formula.split(" → ").map((stage, i, arr) => (
                      <span key={i} className="flex items-center gap-1">
                        <span className="rounded-md bg-surface-3 px-2 py-0.5 text-xs font-medium text-foreground-2 whitespace-nowrap">
                          {stage}
                        </span>
                        {i < arr.length - 1 && (
                          <span className="text-xs font-bold text-accent">→</span>
                        )}
                      </span>
                    ))}
                  </div>
                )}
                {anatomy.scriptStructure?.stages && (
                  <div className="space-y-2">
                    {anatomy.scriptStructure.stages.map((s, i) => (
                      <div key={i} className="flex gap-2.5">
                        <span className="mt-0.5 shrink-0 rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent leading-none">
                          {s.stage}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs text-foreground-2 leading-relaxed">{s.description}</p>
                          {s.duration && (
                            <span className="font-mono text-[10px] text-muted">{s.duration}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </AnatomyCard>

              {/* 3 — Emotional Triggers */}
              <AnatomyCard title="Emotional Triggers" icon="⚡" delay={200}>
                <div className="flex flex-wrap gap-2">
                  {(anatomy.emotionalTriggers ?? []).map((trigger) => (
                    <span
                      key={trigger}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${TRIGGER_COLORS[trigger] ?? "bg-surface-3 text-muted-foreground border-border"}`}
                    >
                      {trigger}
                    </span>
                  ))}
                  {(!anatomy.emotionalTriggers?.length) && (
                    <span className="text-xs text-muted">No triggers identified</span>
                  )}
                </div>
              </AnatomyCard>

              {/* 4 — Target Psychology */}
              <AnatomyCard title="Target Psychology" icon="🧠" delay={300}>
                {anatomy.targetPsychology ? (
                  <p className="text-sm leading-relaxed text-foreground-2">
                    {anatomy.targetPsychology}
                  </p>
                ) : (
                  <span className="text-xs text-muted">Not available</span>
                )}
              </AnatomyCard>

              {/* 5 — Color Palette */}
              <AnatomyCard title="Color Palette" icon="🎨" delay={400}>
                {anatomy.colorPalette ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {anatomy.colorPalette.dominant.map((color, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <div
                            className="h-7 w-7 rounded-md border border-border/50 shadow-inner"
                            style={{ backgroundColor: color }}
                          />
                          <span className="font-mono text-[10px] text-muted-foreground">{color}</span>
                        </div>
                      ))}
                      {anatomy.colorPalette.accent && (
                        <div className="flex items-center gap-1.5">
                          <div
                            className="h-7 w-7 rounded-md border border-border/50 shadow-inner ring-1 ring-white/10"
                            style={{ backgroundColor: anatomy.colorPalette.accent }}
                          />
                          <span className="font-mono text-[10px] text-muted">accent</span>
                        </div>
                      )}
                    </div>
                    <span className="inline-flex items-center rounded-full border border-border bg-surface-3 px-2.5 py-0.5 text-xs font-medium text-muted-foreground capitalize">
                      {anatomy.colorPalette.mood} mood
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-muted">Not applicable for this ad type</span>
                )}
              </AnatomyCard>

              {/* 6 — Audio & Pacing */}
              <AnatomyCard title="Audio & Pacing" icon="🎵" delay={500}>
                {anatomy.audioMood && (
                  <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-3 px-3 py-1.5">
                    <span className="text-sm">🎵</span>
                    <span className="text-xs font-medium text-foreground-2">{anatomy.audioMood}</span>
                  </div>
                )}
                {anatomy.pacingNotes && (
                  <p className="text-sm leading-relaxed text-foreground-2">
                    {anatomy.pacingNotes}
                  </p>
                )}
              </AnatomyCard>
            </div>
          )}
        </section>

        {/* ── Full Script section ───────────────────────────────────────── */}
        {anatomy?.fullScriptBreakdown && anatomy.fullScriptBreakdown.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-4 w-0.5 rounded-full bg-primary" />
                <h2 className="text-base font-bold text-foreground">Full Script</h2>
                <span className="font-mono text-[10px] text-muted">
                  {anatomy.fullScriptBreakdown.length} segments
                </span>
              </div>
              <button
                onClick={handleCopyScript}
                className="btn-secondary h-7 px-2.5 text-[10px]"
              >
                {copied ? "✓" : "Copy"}
              </button>
            </div>

            <div className="rounded-xl border border-border bg-surface-2 overflow-hidden">
              <div className="border-b border-border bg-surface-3 px-4 py-2 flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-danger/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-warning/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-success/60" />
                <span className="ml-2 font-mono text-[10px] text-muted">
                  {ad.brandName} · {ad.adType}
                  {ad.duration ? ` · ${ad.duration}s` : ""}
                </span>
              </div>
              <div className="divide-y divide-border/40 font-mono">
                {anatomy.fullScriptBreakdown.map((segment, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[56px_1fr] gap-0 px-4 py-3 hover:bg-surface-3/50 transition-colors"
                  >
                    <span className="text-accent text-xs pt-0.5 shrink-0">
                      {segment.timestamp}
                    </span>
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-[10px] text-muted uppercase tracking-wider">
                        [{segment.action}]
                      </p>
                      <p className="text-sm text-foreground-2 leading-relaxed break-words">
                        {segment.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Funnel info row ───────────────────────────────────────────── */}
        {anatomy && (
          <section>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="h-4 w-0.5 rounded-full bg-success" />
              <h2 className="text-base font-bold text-foreground">Funnel Intelligence</h2>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <InfoCard
                label="Landing Type"
                value={FUNNEL_LABELS[anatomy.funnelType ?? ""] ?? anatomy.funnelType ?? "—"}
                icon="🎯"
              />
              <InfoCard
                label="Ad Format"
                value={`${ad.adType}${ad.duration ? ` · ${ad.duration}s` : ""}`}
                icon="📹"
              />
              <InfoCard
                label="Market"
                value={`${COUNTRY_FLAGS[ad.country] ?? "🌍"} ${ad.country} · ${ad.language.toUpperCase()}`}
                icon="🌐"
              />
            </div>
          </section>
        )}

        {/* Bottom padding */}
        <div className="h-10" />
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  icon, label, value, suffix, color,
}: {
  icon: string;
  label: string;
  value: string;
  suffix?: string;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3 flex flex-col gap-1.5">
      <span className="text-sm">{icon}</span>
      <div className="flex items-baseline gap-1">
        <span className={`font-mono text-lg font-bold leading-none ${color ?? "text-foreground"}`}>
          {value}
        </span>
        {suffix && <span className="font-mono text-xs text-muted">{suffix}</span>}
      </div>
      <span className="text-[10px] text-muted uppercase tracking-wider">{label}</span>
    </div>
  );
}

function AnatomyCard({
  title, icon, delay, children,
}: {
  title: string;
  icon: string;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl border border-border bg-surface p-4 animate-fade-in"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
    >
      <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-border">
        <span className="text-base">{icon}</span>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

function InfoCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-sm">{icon}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</span>
      </div>
      <p className="text-sm font-medium text-foreground-2">{value}</p>
    </div>
  );
}

// ── Saturation Analysis Card ───────────────────────────────────────────────────

const SIMILARITY_TYPE_LABEL: Record<string, string> = {
  HOOK_TEXT:        "Hook text",
  SCRIPT_STRUCTURE: "Script structure",
  PRODUCT_MATCH:    "Product match",
  LANDING_PAGE:     "Same landing page",
};

function SaturationAnalysisCard({ saturation, adId }: { saturation: AdSaturationData; adId: string }) {
  const score = saturation.saturationScore;
  const isHighRisk = score >= 71;
  const isModerate = score >= 46 && score < 71;

  return (
    <div className={`rounded-xl border p-5 ${
      isHighRisk ? "border-red-500/30 bg-red-500/5" :
      isModerate ? "border-orange-400/30 bg-orange-400/5" :
      "border-border bg-surface"
    }`}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-3xl font-bold text-foreground leading-none">{score}</span>
              <span className="font-mono text-sm text-muted">/100</span>
            </div>
            <span className={`text-xs font-semibold mt-0.5 ${saturation.level.color}`}>
              {saturation.level.label}
            </span>
          </div>
          {/* Score bar */}
          <div className="flex-1 min-w-[120px]">
            <div className="h-2 w-full rounded-full bg-surface-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  score <= 20  ? "bg-emerald-400" :
                  score <= 45  ? "bg-blue-400"    :
                  score <= 70  ? "bg-amber-400"   :
                  score <= 90  ? "bg-orange-400"  :
                                 "bg-red-500"
                }`}
                style={{ width: `${score}%` }}
              />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4 text-right shrink-0">
          <div>
            <p className="font-mono text-lg font-bold text-foreground">{saturation.duplicateCount}</p>
            <p className="text-[10px] text-muted">Similar ads</p>
          </div>
          <div>
            <p className="font-mono text-lg font-bold text-foreground">{saturation.duplicateAdvertiserCount}</p>
            <p className="text-[10px] text-muted">Advertisers</p>
          </div>
        </div>
      </div>

      {/* Warning banner */}
      {isHighRisk && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-xs text-red-300">
          ⚠ High duplication detected. {saturation.duplicateAdvertiserCount} advertisers are running similar creative. Consider a differentiated hook or angle.
        </div>
      )}
      {isModerate && !isHighRisk && (
        <div className="mb-4 rounded-lg border border-orange-400/30 bg-orange-400/10 px-3 py-2.5 text-xs text-orange-300">
          This market is getting crowded. Monitor performance closely and consider creative refreshes.
        </div>
      )}

      {/* Similar ads preview */}
      {saturation.similarAds.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-muted uppercase tracking-wide mb-2">
            Similar Ads Detected
          </p>
          <div className="space-y-2">
            {saturation.similarAds.slice(0, 5).map((sim) => (
              <Link
                key={sim.id}
                href={`/ads/${sim.id}` as `/ads/${string}`}
                className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 px-3 py-2 hover:border-border-hover hover:bg-surface-3 transition-colors"
              >
                {sim.thumbnailUrl ? (
                  <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded bg-surface-3">
                    <Image src={sim.thumbnailUrl} alt="" fill className="object-cover" sizes="32px" />
                  </div>
                ) : (
                  <div className="h-8 w-8 shrink-0 rounded bg-surface-3 flex items-center justify-center text-xs text-muted">◻</div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground">{sim.brandName}</p>
                  {sim.hookText && (
                    <p className="truncate text-[10px] text-muted italic">&ldquo;{sim.hookText}&rdquo;</p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-xs text-orange-400">{Math.round(sim.similarityScore * 100)}%</p>
                  <p className="text-[10px] text-muted">{SIMILARITY_TYPE_LABEL[sim.similarityType] ?? sim.similarityType}</p>
                </div>
              </Link>
            ))}
          </div>
          {saturation.duplicateCount > 5 && (
            <Link
              href={`/ads/${adId}/duplicates` as `/ads/${string}/duplicates`}
              className="mt-2 block text-xs text-muted hover:text-foreground transition-colors"
            >
              View all {saturation.duplicateCount} similar ads →
            </Link>
          )}
        </div>
      )}

      {/* Remix CTA when saturated */}
      {score >= 46 && (
        <div className="mt-4 flex items-center justify-between rounded-lg border border-accent/30 bg-accent/5 px-3 py-2.5">
          <p className="text-xs text-muted">Differentiate with a fresh angle using Remix</p>
          <Link
            href={`/ads/${adId}/remix`}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent/90 transition-colors"
          >
            ⚡ Remix
          </Link>
        </div>
      )}
    </div>
  );
}

// ── Product Lifecycle Card ─────────────────────────────────────────────────────

const TREND_ICON: Record<string, string>  = { RISING: "↑", STABLE: "→", DECLINING: "↓" };
const TREND_COLOR: Record<string, string> = {
  RISING: "text-emerald-400", STABLE: "text-muted", DECLINING: "text-red-400",
};

function ProductLifecycleCard({ insight }: { insight: {
  id: string;
  productName: string;
  lifecycleStage: LifecycleStage;
  saturationScore: number;
  totalAdCount: number;
  uniqueAdvertiserCount: number;
  avgDaysRunning: number;
  trendDirection: string;
  priceRange: string | null;
  topPlatform: string | null;
}}) {
  const meta = STAGE_META[insight.lifecycleStage];
  const isWarning = meta.warningThreshold;
  const trend = insight.trendDirection;

  return (
    <div className={`rounded-xl border p-5 ${isWarning ? "border-orange-400/30 bg-orange-400/5" : "border-border bg-surface"}`}>
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{insight.productName}</p>
          {insight.priceRange && (
            <p className="text-xs text-muted">{insight.priceRange}</p>
          )}
        </div>
        <div className="shrink-0">
          <LifecycleBadge stage={insight.lifecycleStage} />
        </div>
      </div>

      {/* Saturation meter */}
      <div className="mb-4">
        <SaturationMeter score={insight.saturationScore} />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <p className="text-lg font-bold text-foreground">{insight.totalAdCount.toLocaleString()}</p>
          <p className="text-xs text-muted">Total ads</p>
        </div>
        <div>
          <p className="text-lg font-bold text-foreground">{insight.uniqueAdvertiserCount}</p>
          <p className="text-xs text-muted">Advertisers</p>
        </div>
        <div>
          <p className="text-lg font-bold text-foreground">{Math.round(insight.avgDaysRunning)}d</p>
          <p className="text-xs text-muted">Avg run time</p>
        </div>
        <div>
          <p className={`text-lg font-bold ${TREND_COLOR[trend] ?? "text-muted"}`}>
            {TREND_ICON[trend] ?? "→"} {trend.charAt(0) + trend.slice(1).toLowerCase()}
          </p>
          <p className="text-xs text-muted">Trend</p>
        </div>
      </div>

      {/* Warning banner for SATURATED / DYING */}
      {isWarning && (
        <div className="mt-4 rounded-lg border border-orange-400/30 bg-orange-400/10 px-3 py-2.5 text-xs text-orange-300">
          {insight.lifecycleStage === "SATURATED"
            ? `This product has ${insight.uniqueAdvertiserCount}+ advertisers. Consider testing a differentiated angle or finding an alternative.`
            : `Advertiser count is declining. Velocity is low. This market may be past its peak — proceed with caution.`
          }
        </div>
      )}

      {/* Link to full product page */}
      <div className="mt-3">
        <Link
          href={`/products/${insight.id}` as `/products/${string}`}
          className="text-xs text-muted hover:text-foreground transition-colors"
        >
          View full product analysis →
        </Link>
      </div>
    </div>
  );
}

function GeneratePrompt({ onGenerate, error }: { onGenerate: () => void; error: string | null }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface/50 p-10 flex flex-col items-center gap-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-2xl">
        🔬
      </div>
      <div className="space-y-1">
        <p className="font-semibold text-foreground">No X-Ray generated yet</p>
        <p className="text-sm text-muted-foreground">
          Run AI analysis to get hook scoring, script structure, emotional triggers, and more.
        </p>
        <p className="text-xs text-muted">Costs 1 credit · ~15 seconds</p>
      </div>
      {error && (
        <p className="rounded-lg bg-danger/10 border border-danger/30 px-4 py-2 text-xs text-danger">
          {error}
        </p>
      )}
      <button
        onClick={onGenerate}
        className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-accent to-orange-400 px-6 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:shadow-[0_0_30px_rgba(249,115,22,0.5)] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span>🔬</span>
        Generate X-Ray Analysis
      </button>
    </div>
  );
}

function AnatomySkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-border">
            <div className="skeleton h-4 w-4 rounded" />
            <div className="skeleton h-3 w-24 rounded" />
          </div>
          <div className="space-y-2">
            <div className="skeleton h-3 w-full rounded" />
            <div className="skeleton h-3 w-4/5 rounded" />
            {i % 2 === 0 && <div className="skeleton h-3 w-3/5 rounded" />}
          </div>
        </div>
      ))}
    </div>
  );
}

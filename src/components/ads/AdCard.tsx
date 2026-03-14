"use client";

import Image from "next/image";
import type { AdWithMetrics, VelocityTier } from "@/types/ads";
import { BookmarkButton } from "./BookmarkButton";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function fmtSpend(min?: number | null, max?: number | null): string {
  if (!min && !max) return "—";
  if (min && max) return `$${fmt(min)}–$${fmt(max)}`;
  if (max) return `≤$${fmt(max)}`;
  return `≥$${fmt(min!)}`;
}

const COUNTRY_FLAGS: Record<string, string> = {
  US: "🇺🇸", GB: "🇬🇧", CA: "🇨🇦", AU: "🇦🇺", DE: "🇩🇪",
  FR: "🇫🇷", IN: "🇮🇳", BR: "🇧🇷", MX: "🇲🇽", JP: "🇯🇵",
  KR: "🇰🇷", IT: "🇮🇹", ES: "🇪🇸", NL: "🇳🇱", PL: "🇵🇱",
  SE: "🇸🇪", SG: "🇸🇬", AE: "🇦🇪", ZA: "🇿🇦", NG: "🇳🇬",
};

const PLATFORM_CONFIG: Record<
  string,
  { label: string; textColor: string; bgClass: string; icon: string }
> = {
  TIKTOK: {
    label: "TikTok",
    textColor: "#ff0050",
    bgClass: "bg-[#ff005018] text-[#ff0050] border-[#ff005030]",
    icon: "♪",
  },
  FACEBOOK: {
    label: "Facebook",
    textColor: "#1877f2",
    bgClass: "bg-[#1877f218] text-[#1877f2] border-[#1877f230]",
    icon: "f",
  },
  INSTAGRAM: {
    label: "Instagram",
    textColor: "#e1306c",
    bgClass: "bg-[#e1306c18] text-[#e1306c] border-[#e1306c30]",
    icon: "◎",
  },
  YOUTUBE: {
    label: "YouTube",
    textColor: "#ff0000",
    bgClass: "bg-[#ff000018] text-[#ff0000] border-[#ff000030]",
    icon: "▶",
  },
};

const AD_TYPE_ICON: Record<string, string> = {
  VIDEO: "▶",
  IMAGE: "◻",
  CAROUSEL: "⊞",
};

// Saturation dot: shown next to velocity badge; red/orange palette
function SaturationDot({ score }: { score: number | null }) {
  if (score == null) return null;
  let color: string;
  let label: string;
  if (score <= 20)      { color = "bg-emerald-400"; label = `Fresh (${score})`;        }
  else if (score <= 45) { color = "bg-blue-400";    label = `Growing (${score})`;      }
  else if (score <= 70) { color = "bg-amber-400";   label = `Crowded (${score})`;      }
  else if (score <= 90) { color = "bg-orange-400";  label = `Saturated (${score})`;    }
  else                  { color = "bg-red-500";      label = `Oversaturated (${score})`; }

  return (
    <span
      title={`Market saturation: ${label}`}
      className={`shrink-0 inline-block h-2 w-2 rounded-full ${color}`}
    />
  );
}

const VELOCITY_CONFIG: Record<
  VelocityTier,
  { label: string; className: string; animate?: string }
> = {
  EXPLOSIVE: {
    label: "🔥 Explosive",
    className:
      "bg-success/15 text-success border-success/30 font-bold shadow-[0_0_8px_rgba(34,197,94,0.4)]",
    animate: "animate-pulse",
  },
  HIGH: {
    label: "⚡ High",
    className:
      "bg-accent/15 text-accent border-accent/30 shadow-[0_0_6px_rgba(249,115,22,0.3)]",
  },
  RISING: {
    label: "↑ Rising",
    className: "bg-warning/15 text-warning border-warning/30",
  },
  STEADY: {
    label: "· Steady",
    className: "bg-muted/10 text-muted border-border",
  },
};

// ── Card ──────────────────────────────────────────────────────────────────────

interface AdCardProps {
  ad: AdWithMetrics;
  onClick?: (ad: AdWithMetrics) => void;
}

export function AdCard({ ad, onClick }: AdCardProps) {
  const platform = PLATFORM_CONFIG[ad.platform] ?? {
    label: ad.platform,
    textColor: "#888",
    bgClass: "bg-surface-2 text-muted border-border",
    icon: "?",
  };
  const velocity = ad.velocityTier
    ? VELOCITY_CONFIG[ad.velocityTier as VelocityTier]
    : null;
  const flag = COUNTRY_FLAGS[ad.country] ?? "🌍";

  return (
    <article
      onClick={() => onClick?.(ad)}
      className={[
        "group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border border-border bg-surface",
        "transition-all duration-200",
        "hover:-translate-y-0.5 hover:border-border-hover hover:shadow-[0_8px_30px_rgba(0,0,0,0.3),0_0_0_1px_rgba(249,115,22,0.15)]",
      ].join(" ")}
    >
      {/* Thumbnail */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-3">
        {ad.thumbnailUrl ? (
          <Image
            src={ad.thumbnailUrl}
            alt={`${ad.brandName} ad`}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-5xl opacity-30">
            {AD_TYPE_ICON[ad.adType] ?? "◻"}
          </div>
        )}

        {/* Overlaid badges */}
        <div className="absolute left-2 top-2 flex gap-1.5">
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold backdrop-blur-sm ${platform.bgClass}`}
          >
            <span className="font-mono">{platform.icon}</span>
            {platform.label}
          </span>
          {ad.adType !== "IMAGE" && (
            <span className="inline-flex items-center rounded-full border border-border bg-background/70 px-2 py-0.5 text-[10px] font-mono text-muted backdrop-blur-sm">
              {ad.adType === "VIDEO" && ad.duration ? `${ad.duration}s` : ad.adType}
            </span>
          )}
        </div>

        {/* Bookmark button */}
        <BookmarkButton
          adId={ad.id}
          className="absolute right-2 top-2 z-10"
        />

        {/* Arrow indicator on hover */}
        <div className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-accent opacity-0 shadow-glow transition-all duration-200 group-hover:opacity-100">
          <span className="text-xs font-bold text-white">→</span>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        {/* Brand + velocity */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {ad.brandName}
            </p>
            {ad.productName && (
              <p className="truncate text-xs text-muted-foreground">
                {ad.productName}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <SaturationDot score={ad.saturationScore ?? null} />
            {velocity && (
              <span
                className={[
                  "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                  velocity.className,
                  velocity.animate ?? "",
                ].join(" ")}
              >
                {velocity.label}
                {ad.velocityScore > 0 && (
                  <span className="ml-1 font-mono opacity-70">{ad.velocityScore}</span>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Hook text */}
        {ad.hookText && (
          <blockquote className="relative rounded-lg border-l-2 border-accent/50 bg-surface-2 px-3 py-2">
            <p className="line-clamp-3 text-xs leading-relaxed text-foreground-2">
              &ldquo;{ad.hookText}&rdquo;
            </p>
          </blockquote>
        )}

        {/* Stats row */}
        {ad.latestMetrics && (
          <div className="grid grid-cols-4 gap-1">
            <Stat icon="👁" value={fmt(ad.latestMetrics.views)} label="views" />
            <Stat icon="❤️" value={fmt(ad.latestMetrics.likes)} label="likes" />
            <Stat icon="💬" value={fmt(ad.latestMetrics.comments)} label="coms" />
            <Stat icon="🔁" value={fmt(ad.latestMetrics.shares)} label="shares" />
          </div>
        )}

        {/* Footer row */}
        <div className="flex items-center justify-between border-t border-border pt-2.5">
          <div className="flex items-center gap-2 text-[10px] text-muted font-mono">
            <span>{flag} {ad.country}</span>
            <span>·</span>
            <span>{ad.daysRunning}d running</span>
            {ad.isActive && (
              <>
                <span>·</span>
                <span className="text-success">● live</span>
              </>
            )}
          </div>
          <span className="text-[10px] font-mono text-muted">
            {fmtSpend(ad.estimatedSpendMin, ad.estimatedSpendMax)}
          </span>
        </div>
      </div>
    </article>
  );
}

// ── Stat cell ─────────────────────────────────────────────────────────────────

function Stat({
  icon,
  value,
  label,
}: {
  icon: string;
  value: string;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-md bg-surface-2 px-1.5 py-1.5">
      <span className="text-[10px]">{icon}</span>
      <span className="font-mono text-[10px] font-semibold text-foreground">
        {value}
      </span>
      <span className="text-[8px] text-muted">{label}</span>
    </div>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

export function AdCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-surface">
      {/* Thumbnail */}
      <div className="skeleton aspect-[4/3] w-full" />
      {/* Body */}
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1.5">
            <div className="skeleton h-3.5 w-28 rounded" />
            <div className="skeleton h-3 w-20 rounded" />
          </div>
          <div className="skeleton h-5 w-16 rounded-full" />
        </div>
        <div className="skeleton h-16 w-full rounded-lg" />
        <div className="grid grid-cols-4 gap-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-12 rounded-md" />
          ))}
        </div>
        <div className="flex justify-between border-t border-border pt-2.5">
          <div className="skeleton h-3 w-24 rounded" />
          <div className="skeleton h-3 w-16 rounded" />
        </div>
      </div>
    </div>
  );
}

import Image from "next/image";
import Link from "next/link";
import { LifecycleBadge } from "./LifecycleBadge";
import { SaturationMeter } from "./SaturationMeter";
import type { LifecycleStage } from "@/services/lifecycleEngine";

interface TopAd {
  id: string;
  thumbnailUrl: string | null;
  brandName: string;
}

export interface ProductCardData {
  id: string;
  productName: string;
  productCategory: string;
  lifecycleStage: LifecycleStage;
  saturationScore: number;
  totalAdCount: number;
  uniqueAdvertiserCount: number;
  avgDaysRunning: number;
  trendDirection: string;
  topPlatform: string | null;
  priceRange: string | null;
  ads: TopAd[];
}

interface Props {
  product: ProductCardData;
}

const TREND_ICON: Record<string, string> = {
  RISING:   "↑",
  STABLE:   "→",
  DECLINING: "↓",
};

const TREND_COLOR: Record<string, string> = {
  RISING:   "text-emerald-400",
  STABLE:   "text-muted",
  DECLINING: "text-red-400",
};

export function ProductCard({ product }: Props) {
  const topAd = product.ads[0];
  const trend = product.trendDirection;

  return (
    <Link
      href={`/products/${product.id}` as `/products/${string}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-all hover:border-accent/40 hover:bg-surface-2 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)]"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-gradient-to-br from-surface-3 to-surface-2 overflow-hidden">
        {topAd?.thumbnailUrl ? (
          <Image
            src={topAd.thumbnailUrl}
            alt={topAd.brandName}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl opacity-20">
            📦
          </div>
        )}

        {/* Platform badge */}
        {product.topPlatform && (
          <span className="absolute right-2 top-2 rounded bg-background/70 px-1.5 py-0.5 text-[10px] font-medium text-foreground-2 backdrop-blur-sm">
            {product.topPlatform}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        {/* Name + badge */}
        <div>
          <div className="mb-1.5">
            <LifecycleBadge stage={product.lifecycleStage as LifecycleStage} size="sm" />
          </div>
          <p className="font-semibold text-sm text-foreground leading-tight">
            {product.productName}
          </p>
          <p className="mt-0.5 text-xs text-muted capitalize">{product.productCategory}</p>
        </div>

        {/* Saturation meter */}
        <SaturationMeter score={product.saturationScore} height="sm" />

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <p className="font-semibold text-foreground">{product.totalAdCount.toLocaleString()}</p>
            <p className="text-muted">ads</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">{product.uniqueAdvertiserCount}</p>
            <p className="text-muted">brands</p>
          </div>
          <div>
            <p className={`font-semibold ${TREND_COLOR[trend] ?? "text-muted"}`}>
              {TREND_ICON[trend] ?? "→"} {trend.charAt(0) + trend.slice(1).toLowerCase()}
            </p>
            <p className="text-muted">trend</p>
          </div>
        </div>

        {/* Price + avg running */}
        {(product.priceRange || product.avgDaysRunning > 0) && (
          <div className="flex items-center justify-between border-t border-border/50 pt-2 text-xs text-muted">
            {product.priceRange && <span>{product.priceRange}</span>}
            {product.avgDaysRunning > 0 && (
              <span>{Math.round(product.avgDaysRunning)}d avg run</span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="aspect-video animate-pulse bg-surface-2" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-24 animate-pulse rounded bg-surface-2" />
        <div className="h-5 w-3/4 animate-pulse rounded bg-surface-2" />
        <div className="h-2 w-full animate-pulse rounded-full bg-surface-2" />
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-1">
              <div className="h-4 w-full animate-pulse rounded bg-surface-2" />
              <div className="h-3 w-full animate-pulse rounded bg-surface-2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

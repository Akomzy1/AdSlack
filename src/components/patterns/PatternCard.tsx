"use client";

import { useState } from "react";
import Image from "next/image";
import { PatternStatus } from "@prisma/client";
import { PatternStatusBadge } from "./PatternStatusBadge";

export interface PatternData {
  id: string;
  patternName: string;
  hookType: string;
  scriptStructure: string;
  adType: string;
  emotionalTriggers: string[];
  avgVelocity: number;
  medianEngagement: number;
  nicheSpread: string[];
  totalAdsUsing: number;
  growthRate: number;
  viralityScore: number;
  exampleAdIds: string[];
  status: PatternStatus;
  firstDetectedAt: string;
  lastUpdatedAt: string;
}

interface ExampleAd {
  id: string;
  brandName: string;
  niche: string;
  hookText: string | null;
  thumbnailUrl: string | null;
  velocityScore: number;
  adType: string;
  daysRunning: number;
}

interface PatternCardProps {
  pattern: PatternData;
  rank?: number;
  onGenerateAd?: (pattern: PatternData) => void;
}

export function PatternCard({ pattern, rank, onGenerateAd }: PatternCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [examples, setExamples] = useState<ExampleAd[] | null>(null);
  const [loadingExamples, setLoadingExamples] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  async function handleExpand() {
    if (!expanded && !examples) {
      setLoadingExamples(true);
      try {
        const res = await fetch(`/api/patterns/${pattern.id}`);
        if (res.ok) {
          const data = await res.json() as { pattern: { exampleAds: ExampleAd[] } };
          setExamples(data.pattern.exampleAds);
        }
      } finally {
        setLoadingExamples(false);
      }
    }
    setExpanded((v) => !v);
  }

  async function handleSubscribe() {
    setSubscribing(true);
    try {
      const res = await fetch("/api/patterns/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patternId: pattern.id }),
      });
      if (res.ok || res.status === 409) setSubscribed(true);
    } finally {
      setSubscribing(false);
    }
  }

  const growthPositive = pattern.growthRate >= 0;
  const formulaSegments = pattern.scriptStructure.split("→");

  return (
    <div className="rounded-xl border border-border bg-surface flex flex-col gap-0 overflow-hidden transition-shadow hover:shadow-lg">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-4 pb-3">
        <div className="flex items-start gap-3 min-w-0">
          {rank !== undefined && (
            <span className="shrink-0 text-lg font-bold text-muted">#{rank}</span>
          )}
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground leading-snug truncate" title={pattern.patternName}>
              {pattern.patternName}
            </h3>
            <p className="text-xs text-muted mt-0.5">{pattern.adType} · {pattern.hookType.replace(/_/g, " ")}</p>
          </div>
        </div>
        <PatternStatusBadge status={pattern.status} size="sm" />
      </div>

      {/* Formula pills */}
      <div className="flex flex-wrap gap-1 px-4 pb-3">
        {formulaSegments.map((seg, i) => (
          <span key={i} className="flex items-center gap-1">
            <span className="rounded bg-surface-2 px-2 py-0.5 text-[10px] font-medium text-foreground capitalize">
              {seg}
            </span>
            {i < formulaSegments.length - 1 && (
              <span className="text-[10px] text-muted">→</span>
            )}
          </span>
        ))}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-px bg-border mx-4 mb-3 rounded-lg overflow-hidden text-center">
        <div className="bg-surface px-2 py-2">
          <div className="text-sm font-bold text-accent">{pattern.viralityScore}</div>
          <div className="text-[9px] text-muted uppercase tracking-wide">Virality</div>
        </div>
        <div className="bg-surface px-2 py-2">
          <div className={`text-sm font-bold ${growthPositive ? "text-emerald-400" : "text-rose-400"}`}>
            {growthPositive ? "+" : ""}{pattern.growthRate}%
          </div>
          <div className="text-[9px] text-muted uppercase tracking-wide">Growth</div>
        </div>
        <div className="bg-surface px-2 py-2">
          <div className="text-sm font-bold text-foreground">{pattern.totalAdsUsing}</div>
          <div className="text-[9px] text-muted uppercase tracking-wide">Ads</div>
        </div>
      </div>

      {/* Niche spread */}
      {pattern.nicheSpread.length > 0 && (
        <div className="flex flex-wrap gap-1 px-4 pb-3">
          {pattern.nicheSpread.slice(0, 5).map((niche) => (
            <span key={niche} className="rounded-full bg-accent/10 px-2 py-0.5 text-[9px] font-medium text-accent">
              {niche}
            </span>
          ))}
          {pattern.nicheSpread.length > 5 && (
            <span className="text-[9px] text-muted self-center">+{pattern.nicheSpread.length - 5}</span>
          )}
        </div>
      )}

      {/* Emotional triggers */}
      {pattern.emotionalTriggers.length > 0 && (
        <div className="flex flex-wrap gap-1 px-4 pb-3">
          {pattern.emotionalTriggers.map((t) => (
            <span key={t} className="rounded-full border border-border px-2 py-0.5 text-[9px] text-muted capitalize">
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Avg velocity */}
      <div className="mx-4 mb-3 flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-surface-2 overflow-hidden">
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${Math.min(100, pattern.avgVelocity)}%` }}
          />
        </div>
        <span className="text-[10px] text-muted whitespace-nowrap">
          Avg velocity {pattern.avgVelocity}
        </span>
      </div>

      {/* Example ad expander */}
      <button
        onClick={handleExpand}
        className="flex items-center justify-between px-4 py-2.5 border-t border-border text-xs text-muted hover:bg-surface-2 hover:text-foreground transition-colors"
      >
        <span>Example ads ({pattern.exampleAdIds.length})</span>
        <span className="text-[10px]">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="border-t border-border divide-y divide-border">
          {loadingExamples && (
            <div className="flex items-center justify-center py-6 text-xs text-muted">
              Loading examples…
            </div>
          )}
          {examples?.map((ad) => (
            <div key={ad.id} className="flex gap-3 p-3">
              {ad.thumbnailUrl ? (
                <div className="relative h-12 w-12 shrink-0 rounded overflow-hidden bg-surface-2">
                  <Image
                    src={ad.thumbnailUrl}
                    alt={ad.brandName}
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                </div>
              ) : (
                <div className="h-12 w-12 shrink-0 rounded bg-surface-2 flex items-center justify-center text-muted text-lg">
                  📺
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-foreground truncate">{ad.brandName}</div>
                <div className="text-[10px] text-muted truncate">{ad.hookText ?? "No hook text"}</div>
                <div className="flex gap-2 mt-1">
                  <span className="text-[9px] text-accent">⚡ {ad.velocityScore}</span>
                  <span className="text-[9px] text-muted">{ad.niche}</span>
                  <span className="text-[9px] text-muted">{ad.daysRunning}d running</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 p-4 pt-3 border-t border-border mt-auto">
        <button
          onClick={() => onGenerateAd?.(pattern)}
          className="flex-1 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white hover:bg-accent/90 transition-colors"
        >
          Generate Ad Using This Pattern
        </button>
        <button
          onClick={handleSubscribe}
          disabled={subscribed || subscribing}
          className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted hover:bg-surface-2 hover:text-foreground transition-colors disabled:opacity-50"
        >
          {subscribed ? "✓ Alerted" : subscribing ? "…" : "🔔"}
        </button>
      </div>
    </div>
  );
}

export function PatternCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-3 animate-pulse">
      <div className="flex justify-between">
        <div className="h-4 w-40 rounded bg-surface-2" />
        <div className="h-5 w-16 rounded-full bg-surface-2" />
      </div>
      <div className="flex gap-1">
        {[48, 32, 56, 40].map((w) => (
          <div key={w} className="h-5 rounded bg-surface-2" style={{ width: w }} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-10 rounded bg-surface-2" />
        ))}
      </div>
      <div className="flex gap-1">
        {[40, 56, 48, 64].map((w) => (
          <div key={w} className="h-4 rounded-full bg-surface-2" style={{ width: w }} />
        ))}
      </div>
      <div className="h-8 rounded-lg bg-surface-2 mt-auto" />
    </div>
  );
}

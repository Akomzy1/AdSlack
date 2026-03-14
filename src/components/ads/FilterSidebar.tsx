"use client";

import { AdType, Platform } from "@prisma/client";
import { useState } from "react";
import type { AdFilters, DateRange } from "@/types/ads";

// ── Constants ─────────────────────────────────────────────────────────────────

const PLATFORMS: { value: Platform; label: string; icon: string }[] = [
  { value: Platform.TIKTOK, label: "TikTok", icon: "♪" },
  { value: Platform.FACEBOOK, label: "Facebook", icon: "f" },
  { value: Platform.INSTAGRAM, label: "Instagram", icon: "◎" },
  { value: Platform.YOUTUBE, label: "YouTube", icon: "▶" },
];

const NICHES = [
  "Beauty", "Kitchen", "Pets", "Fitness", "Tech",
  "Home Decor", "Fashion", "Health", "Finance", "Education",
  "Travel", "Food", "Gaming", "Software", "Kids",
];

const COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "IN", name: "India" },
  { code: "BR", name: "Brazil" },
  { code: "MX", name: "Mexico" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" },
  { code: "IT", name: "Italy" },
  { code: "ES", name: "Spain" },
  { code: "NL", name: "Netherlands" },
  { code: "SE", name: "Sweden" },
  { code: "SG", name: "Singapore" },
  { code: "AE", name: "UAE" },
  { code: "ZA", name: "South Africa" },
  { code: "NG", name: "Nigeria" },
  { code: "PL", name: "Poland" },
];

const AD_TYPES: { value: AdType; label: string }[] = [
  { value: AdType.VIDEO, label: "Video" },
  { value: AdType.IMAGE, label: "Image" },
  { value: AdType.CAROUSEL, label: "Carousel" },
];

const DATE_RANGES: { value: DateRange; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "14d", label: "Last 14 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

// ── Component ─────────────────────────────────────────────────────────────────

interface FilterSidebarProps {
  filters: AdFilters;
  onApply: (filters: AdFilters) => void;
  onClose?: () => void;
}

export function FilterSidebar({ filters, onApply, onClose }: FilterSidebarProps) {
  // Local state — only applied on "Apply" click
  const [local, setLocal] = useState<AdFilters>({ ...filters });

  function toggle<T>(list: T[], item: T): T[] {
    return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
  }

  function handleApply() {
    onApply(local);
    onClose?.();
  }

  function handleClear() {
    const cleared: AdFilters = {
      ...filters,
      platforms: [],
      niches: [],
      country: "",
      adTypes: [],
      dateRange: "30d",
      velocityMin: 0,
      velocityMax: 100,
      spendMin: "",
      spendMax: "",
    };
    setLocal(cleared);
    onApply(cleared);
  }

  const activeCount = [
    local.platforms.length > 0,
    local.niches.length > 0,
    !!local.country,
    local.adTypes.length > 0,
    local.dateRange !== "30d",
    local.velocityMin > 0 || local.velocityMax < 100,
    !!local.spendMin || !!local.spendMax,
  ].filter(Boolean).length;

  return (
    <aside className="flex h-full flex-col bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">Filters</span>
          {activeCount > 0 && (
            <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">
              {activeCount}
            </span>
          )}
        </div>
        {onClose && (
          <button onClick={onClose} className="btn-ghost h-7 w-7 p-0 text-muted">
            ✕
          </button>
        )}
      </div>

      {/* Scrollable filter body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {/* Platform */}
        <FilterSection title="Platform">
          <div className="space-y-1.5">
            {PLATFORMS.map((p) => (
              <CheckItem
                key={p.value}
                label={`${p.icon} ${p.label}`}
                checked={local.platforms.includes(p.value)}
                onChange={() =>
                  setLocal((s) => ({ ...s, platforms: toggle(s.platforms, p.value) }))
                }
              />
            ))}
          </div>
        </FilterSection>

        {/* Niche */}
        <FilterSection title="Niche / Category">
          <div className="flex flex-wrap gap-1.5">
            {NICHES.map((niche) => {
              const nicheKey = niche.toLowerCase().replace(/ /g, "_");
              const isActive = local.niches.includes(nicheKey);
              return (
                <button
                  key={niche}
                  onClick={() =>
                    setLocal((s) => ({ ...s, niches: toggle(s.niches, nicheKey) }))
                  }
                  className={[
                    "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                    isActive
                      ? "border-accent bg-accent/15 text-accent"
                      : "border-border bg-surface-2 text-muted-foreground hover:border-border-hover hover:text-foreground",
                  ].join(" ")}
                >
                  {niche}
                </button>
              );
            })}
          </div>
        </FilterSection>

        {/* Country */}
        <FilterSection title="Country">
          <select
            value={local.country}
            onChange={(e) => setLocal((s) => ({ ...s, country: e.target.value }))}
            className="input text-sm"
          >
            <option value="">All countries</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </FilterSection>

        {/* Ad Type */}
        <FilterSection title="Ad Format">
          <div className="space-y-1.5">
            {AD_TYPES.map((t) => (
              <CheckItem
                key={t.value}
                label={t.label}
                checked={local.adTypes.includes(t.value)}
                onChange={() =>
                  setLocal((s) => ({ ...s, adTypes: toggle(s.adTypes, t.value) }))
                }
              />
            ))}
          </div>
        </FilterSection>

        {/* Date Range */}
        <FilterSection title="First Seen">
          <div className="space-y-1.5">
            {DATE_RANGES.map((d) => (
              <label key={d.value} className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="radio"
                  name="dateRange"
                  value={d.value}
                  checked={local.dateRange === d.value}
                  onChange={() => setLocal((s) => ({ ...s, dateRange: d.value }))}
                  className="h-3.5 w-3.5 accent-accent"
                />
                <span className="text-xs text-foreground-2">{d.label}</span>
              </label>
            ))}
          </div>
        </FilterSection>

        {/* Velocity Score */}
        <FilterSection title="Velocity Score">
          <div className="space-y-3">
            <div className="flex justify-between font-mono text-[10px] text-muted">
              <span>{local.velocityMin}</span>
              <span>{local.velocityMax === 100 ? "100 (max)" : local.velocityMax}</span>
            </div>
            <div className="relative h-1.5 rounded-full bg-surface-3">
              <div
                className="absolute h-full rounded-full bg-accent"
                style={{
                  left: `${local.velocityMin}%`,
                  width: `${local.velocityMax - local.velocityMin}%`,
                }}
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-[10px] text-muted">Min</label>
                <input
                  type="range"
                  min={0}
                  max={local.velocityMax}
                  value={local.velocityMin}
                  onChange={(e) =>
                    setLocal((s) => ({ ...s, velocityMin: Number(e.target.value) }))
                  }
                  className="w-full accent-accent"
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-[10px] text-muted">Max</label>
                <input
                  type="range"
                  min={local.velocityMin}
                  max={100}
                  value={local.velocityMax}
                  onChange={(e) =>
                    setLocal((s) => ({ ...s, velocityMax: Number(e.target.value) }))
                  }
                  className="w-full accent-accent"
                />
              </div>
            </div>
          </div>
        </FilterSection>

        {/* Estimated Spend */}
        <FilterSection title="Estimated Spend">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-[10px] text-muted">Min ($)</label>
              <input
                type="number"
                placeholder="0"
                value={local.spendMin}
                onChange={(e) => setLocal((s) => ({ ...s, spendMin: e.target.value }))}
                className="input py-1.5 text-xs"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-[10px] text-muted">Max ($)</label>
              <input
                type="number"
                placeholder="Any"
                value={local.spendMax}
                onChange={(e) => setLocal((s) => ({ ...s, spendMax: e.target.value }))}
                className="input py-1.5 text-xs"
              />
            </div>
          </div>
        </FilterSection>
      </div>

      {/* Footer buttons */}
      <div className="flex gap-2 border-t border-border p-4">
        <button
          onClick={handleClear}
          className="btn-ghost flex-1 py-2 text-sm"
        >
          Clear All
        </button>
        <button
          onClick={handleApply}
          className="btn-primary flex-1 py-2 text-sm"
        >
          Apply
          {activeCount > 0 && (
            <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold">
              {activeCount}
            </span>
          )}
        </button>
      </div>
    </aside>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
        {title}
      </p>
      {children}
    </div>
  );
}

function CheckItem({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5">
      <span
        className={[
          "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
          checked
            ? "border-accent bg-accent text-white"
            : "border-border bg-surface-2 hover:border-border-hover",
        ].join(" ")}
        onClick={onChange}
      >
        {checked && <span className="text-[9px] font-black leading-none">✓</span>}
      </span>
      <span className="text-xs text-foreground-2">{label}</span>
    </label>
  );
}

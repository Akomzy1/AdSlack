"use client";

import type { SortOption } from "@/types/ads";

const SORT_OPTIONS: { value: SortOption; label: string; icon: string }[] = [
  { value: "velocity", label: "Early Velocity", icon: "⚡" },
  { value: "engagement", label: "Engagement", icon: "❤️" },
  { value: "newest", label: "Newest", icon: "✦" },
  { value: "longest", label: "Longest Running", icon: "📅" },
  { value: "spend", label: "Highest Spend", icon: "💰" },
];

interface SortControlsProps {
  value: SortOption;
  onChange: (sort: SortOption) => void;
  total: number;
  isLoading: boolean;
}

export function SortControls({ value, onChange, total, isLoading }: SortControlsProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Result count */}
      <p className="text-xs text-muted-foreground">
        {isLoading ? (
          <span className="inline-block h-3.5 w-24 animate-pulse rounded bg-surface-3" />
        ) : (
          <>
            <span className="font-mono font-semibold text-foreground">{total.toLocaleString()}</span>{" "}
            ad{total !== 1 ? "s" : ""} found
          </>
        )}
      </p>

      {/* Sort pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
        <span className="shrink-0 text-xs text-muted">Sort:</span>
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={[
              "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150",
              value === opt.value
                ? "border-accent bg-accent/15 text-accent shadow-glow"
                : "border-border bg-surface-2 text-muted-foreground hover:border-border-hover hover:text-foreground",
            ].join(" ")}
          >
            <span className="mr-1">{opt.icon}</span>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

interface Props {
  score: number;        // 0–100
  showLabel?: boolean;
  height?: "sm" | "md";
}

export function SaturationMeter({ score, showLabel = true, height = "md" }: Props) {
  const pct = Math.max(0, Math.min(100, score));

  // Gradient: green (low sat) → yellow → orange → red (high sat)
  const gradientStyle = {
    background: "linear-gradient(to right, #10b981, #f59e0b, #f97316, #ef4444)",
  };

  const labelColor =
    pct < 30  ? "text-emerald-400" :
    pct < 55  ? "text-yellow-400"  :
    pct < 75  ? "text-orange-400"  :
    "text-red-400";

  return (
    <div className="w-full">
      {showLabel && (
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-muted">Saturation</span>
          <span className={`font-semibold ${labelColor}`}>{Math.round(pct)}%</span>
        </div>
      )}
      <div
        className={[
          "w-full overflow-hidden rounded-full bg-surface-3",
          height === "sm" ? "h-1.5" : "h-2",
        ].join(" ")}
      >
        <div
          className="h-full rounded-full"
          style={{ ...gradientStyle, width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

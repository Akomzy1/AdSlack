import { PatternStatus } from "@prisma/client";
import { PATTERN_STATUS_META } from "@/services/patternEngine";

interface PatternStatusBadgeProps {
  status: PatternStatus;
  size?: "sm" | "md";
}

export function PatternStatusBadge({ status, size = "md" }: PatternStatusBadgeProps) {
  const meta = PATTERN_STATUS_META[status];
  const textSize = size === "sm" ? "text-[10px]" : "text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold ${textSize} ${meta.bg} ${meta.border} ${meta.color}`}
    >
      <span>{meta.emoji}</span>
      {meta.label}
    </span>
  );
}

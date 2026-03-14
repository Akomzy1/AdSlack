import { STAGE_META } from "@/services/lifecycleEngine";
import type { LifecycleStage } from "@/services/lifecycleEngine";

interface Props {
  stage: LifecycleStage;
  size?: "sm" | "md";
}

export function LifecycleBadge({ stage, size = "md" }: Props) {
  const meta = STAGE_META[stage];
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full border font-semibold",
        size === "sm"
          ? "px-2 py-0.5 text-[10px]"
          : "px-2.5 py-1 text-xs",
        meta.color,
        meta.bg,
        meta.border,
      ].join(" ")}
    >
      <span role="img" aria-hidden>{meta.emoji}</span>
      {meta.label}
    </span>
  );
}

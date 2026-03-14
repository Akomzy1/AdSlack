import type { Metadata } from "next";

export const metadata: Metadata = { title: "Ad Anatomy" };

export default function AnatomyPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-foreground">Ad Anatomy</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        AI-powered breakdowns of winning ad creatives.
      </p>
      {/* Anatomy detail — to be implemented */}
    </div>
  );
}

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Remix" };

export default function RemixPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-foreground">Remix</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Generate scripts, hooks, copy, and briefs from winning ads.
      </p>
      {/* Remix panel — to be implemented */}
    </div>
  );
}

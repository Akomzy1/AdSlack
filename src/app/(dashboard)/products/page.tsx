import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { hasMinRole } from "@/constants/plans";
import { ProductsView } from "./ProductsView";

export const metadata: Metadata = {
  title: "Product Lifecycle Tracker",
  description: "Track where products sit in their market lifecycle. Find hidden gems before they saturate.",
};

export default async function ProductsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/api/auth/signin");

  // PRO+ feature
  if (!hasMinRole(session.user.role, "PRO")) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <div className="max-w-sm">
          <div className="mb-4 text-5xl">📊</div>
          <h1 className="mb-2 text-2xl font-bold text-foreground">
            Product Lifecycle Tracker
          </h1>
          <p className="mb-6 text-muted">
            Know exactly where a product sits in its market lifecycle — before you spend a dollar on ads.
          </p>
          <a
            href="/billing"
            className="inline-block rounded-xl bg-gradient-to-r from-accent to-orange-600 px-6 py-3 text-sm font-bold text-white shadow-glow transition-all hover:shadow-[0_0_24px_rgba(249,115,22,0.5)]"
          >
            Upgrade to Pro →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border/60 px-6 py-5">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Product Lifecycle Tracker</h1>
            <p className="mt-0.5 text-sm text-muted">
              Find hidden gems, avoid saturated markets, spot dying trends before you invest.
            </p>
          </div>
          <div className="hidden rounded-xl border border-border bg-surface p-3 text-xs text-muted sm:block">
            Updated every 12 hours
          </div>
        </div>

        {/* Stage legend */}
        <div className="mt-4 flex flex-wrap gap-3 text-xs">
          {[
            { emoji: "💎", label: "Hidden Gem",    desc: "< 5 brands, high velocity" },
            { emoji: "🚀", label: "Early Scaling", desc: "5–20 brands, growing fast" },
            { emoji: "📈", label: "Growth",        desc: "20–80 brands, strong demand" },
            { emoji: "⚠️", label: "Saturated",     desc: "80+ brands competing" },
            { emoji: "📉", label: "Dying",         desc: "Declining advertisers & velocity" },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-1.5 text-muted">
              <span>{s.emoji}</span>
              <span className="font-medium text-foreground-2">{s.label}</span>
              <span>— {s.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Client view */}
      <div className="flex-1 overflow-hidden">
        <ProductsView />
      </div>
    </div>
  );
}

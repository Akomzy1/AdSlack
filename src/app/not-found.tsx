import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Not Found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      {/* Decorative glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-[96px]" />
      </div>

      <div className="relative space-y-5">
        <p className="font-mono text-7xl font-bold text-accent/40 leading-none select-none">
          404
        </p>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Page not found
          </h1>
          <p className="mt-2 max-w-sm text-sm text-muted">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            href="/discover"
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:bg-accent/90 transition-all hover:shadow-[0_0_30px_rgba(249,115,22,0.4)] active:scale-95"
          >
            Go to Discover
          </Link>
          <Link
            href="/"
            className="rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-surface-2 transition-colors"
          >
            Home
          </Link>
        </div>

        <p className="pt-2 font-mono text-xs text-muted/50">
          Adsentify · Error 404
        </p>
      </div>
    </div>
  );
}

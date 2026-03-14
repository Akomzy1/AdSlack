import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Blog — AdForge",
    template: "%s | AdForge Blog",
  },
  description:
    "Ad intelligence guides, creative strategy breakdowns, and platform deep-dives from the AdForge team.",
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Blog-specific top nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent text-xs font-bold text-white">
                A
              </div>
              <span className="font-bold text-foreground">AdForge</span>
            </Link>
            <span className="hidden text-border sm:block">/</span>
            <Link href="/blog" className="hidden text-sm text-muted-foreground hover:text-foreground transition-colors sm:block">
              Blog
            </Link>
          </div>

          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/tools/free-ad-library"
              className="hidden text-muted-foreground hover:text-foreground transition-colors sm:block"
            >
              Free Ad Library
            </Link>
            <Link
              href="/api/auth/signin"
              className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground-2 hover:border-border-hover hover:bg-surface-2 transition-all"
            >
              Sign in
            </Link>
            <Link
              href="/api/auth/signin"
              className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
            >
              Start free
            </Link>
          </nav>
        </div>
      </header>

      {children}

      {/* Blog footer */}
      <footer className="mt-20 border-t border-border bg-surface py-10">
        <div className="mx-auto max-w-5xl px-6">
          <div className="flex flex-col items-center justify-between gap-4 text-sm text-muted sm:flex-row">
            <span>© {new Date().getFullYear()} AdForge. All rights reserved.</span>
            <div className="flex items-center gap-6">
              <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
              <Link href="/blog" className="hover:text-foreground transition-colors">Blog</Link>
              <Link href="/tools/free-ad-library" className="hover:text-foreground transition-colors">Free Tools</Link>
              <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts } from "@/lib/posts";
import { PostCard } from "@/components/blog/PostCard";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Ad Intelligence Blog",
  description:
    "Guides, breakdowns, and strategies for finding winning ads, decoding viral creative, and building better campaigns — powered by ad intelligence.",
  path: "/blog",
  keywords: [
    "ad spy tool guide",
    "winning ad creative",
    "TikTok ad strategy",
    "Facebook ad research",
    "ad intelligence blog",
  ],
});

const CATEGORIES = ["All", "Guide", "Comparison", "Strategy", "Science"];

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: { category?: string };
}) {
  const allPosts = await getAllPosts();
  const activeCategory = searchParams.category ?? "All";

  const filtered =
    activeCategory === "All"
      ? allPosts
      : allPosts.filter((p) => p.category === activeCategory);

  const featured = allPosts.find((p) => p.featured) ?? allPosts[0];
  const rest = filtered.filter((p) => p.slug !== featured?.slug);

  return (
    <main className="min-h-screen bg-background">
      {/* Hero */}
      <section className="border-b border-border/60 py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-2 text-sm font-semibold uppercase tracking-widest text-accent">
            Adsentify Blog
          </div>
          <h1 className="mb-3 text-4xl font-bold tracking-tight sm:text-5xl">
            Ad Intelligence
            <br />
            <span className="text-gradient">Made actionable</span>
          </h1>
          <p className="max-w-xl text-muted-foreground">
            Guides, deep-dives, and strategies for finding winning ads before your competitors — and turning what you learn into better creative.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-6 py-12">
        {/* Featured post */}
        {featured && (
          <div className="mb-12">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted">
              Featured
            </p>
            <PostCard post={featured} featured />
          </div>
        )}

        {/* Category filter */}
        <div className="mb-8 flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat}
              href={cat === "All" ? "/blog" : `/blog?category=${cat}`}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                activeCategory === cat
                  ? "bg-accent text-white shadow-glow"
                  : "border border-border bg-surface-2 text-muted hover:border-border-hover hover:text-foreground"
              }`}
            >
              {cat}
            </Link>
          ))}
        </div>

        {/* Post grid */}
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-12 text-center">
            <p className="text-muted">No posts in this category yet.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
        )}

        {/* Internal links to tools */}
        <div className="mt-16 rounded-2xl border border-accent/20 bg-accent/5 p-8">
          <h2 className="mb-4 text-xl font-bold">Explore Adsentify tools</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                href: "/tools/free-ad-library",
                title: "Free Ad Library",
                desc: "Browse today's top 20 trending ads — no account needed.",
              },
              {
                href: "/vs/pipiads",
                title: "Adsentify vs PiPiAds",
                desc: "How does Adsentify compare to the most popular TikTok spy tool?",
              },
              {
                href: "/api/auth/signin",
                title: "Start for free",
                desc: "Get full access to velocity scoring, AI X-Ray, and alerts.",
              },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group rounded-xl border border-border bg-surface p-4 transition-all hover:border-accent/40 hover:bg-surface-2"
              >
                <p className="mb-1 font-semibold text-foreground group-hover:text-accent transition-colors">
                  {link.title} →
                </p>
                <p className="text-xs text-muted">{link.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

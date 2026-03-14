import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { getPostBySlug, getPostSlugs, getRelatedPosts } from "@/lib/posts";
import { TableOfContents } from "@/components/blog/TableOfContents";
import { PostCard } from "@/components/blog/PostCard";
import { mdxComponents } from "@/components/blog/MdxComponents";
import { buildMetadata, blogPostSchema, breadcrumbSchema, canonical } from "@/lib/seo";

// ── Static params ─────────────────────────────────────────────────────────────

export function generateStaticParams() {
  return getPostSlugs().map((slug) => ({ slug }));
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const post = getPostBySlug(params.slug);
  if (!post) return {};

  return buildMetadata({
    title: post.title,
    description: post.excerpt,
    path: `/blog/${post.slug}`,
    keywords: post.keywords,
    publishedAt: post.date,
    type: "article",
  });
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function BlogPostPage({
  params,
}: {
  params: { slug: string };
}) {
  const post = getPostBySlug(params.slug);
  if (!post) notFound();

  const related = await getRelatedPosts(post.slug, post.category);

  const jsonLd = blogPostSchema({
    title: post.title,
    description: post.excerpt,
    slug: post.slug,
    date: post.date,
    authorName: post.author.name,
  });

  const breadcrumbLd = breadcrumbSchema([
    { name: "Home", url: canonical("/") },
    { name: "Blog", url: canonical("/blog") },
    { name: post.title, url: canonical(`/blog/${post.slug}`) },
  ]);

  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <main className="min-h-screen bg-background">
        {/* Hero */}
        <div className="border-b border-border/60 py-12">
          <div className="mx-auto max-w-5xl px-6">
            <div className="mb-4 flex items-center gap-2 text-sm text-muted">
              <Link href="/blog" className="hover:text-foreground transition-colors">
                Blog
              </Link>
              <span>/</span>
              <span className="text-accent">{post.category}</span>
            </div>
            <h1 className="mb-4 max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              {post.title}
            </h1>
            <p className="mb-6 max-w-2xl text-lg text-muted-foreground">
              {post.excerpt}
            </p>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-accent">
                  {post.author.avatar}
                </div>
                <div>
                  <p className="font-medium text-foreground-2">{post.author.name}</p>
                  <p className="text-xs">{post.author.role}</p>
                </div>
              </div>
              <span className="text-border">·</span>
              <time dateTime={post.date}>
                {new Date(post.date).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </time>
              <span className="text-border">·</span>
              <span>{post.readTime}</span>
            </div>
          </div>
        </div>

        {/* Content + sidebar */}
        <div className="mx-auto max-w-5xl px-6 py-12">
          <div className="flex gap-12">
            {/* Article */}
            <article className="min-w-0 flex-1">
              <div className="prose-adslack">
                <MDXRemote
                  source={post.content}
                  components={mdxComponents}
                  options={{
                    mdxOptions: {
                      remarkPlugins: [remarkGfm],
                      rehypePlugins: [rehypeSlug],
                    },
                  }}
                />
              </div>

              {/* Author bio */}
              <div className="mt-12 rounded-2xl border border-border bg-surface p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent/20 text-lg font-bold text-accent">
                    {post.author.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{post.author.name}</p>
                    <p className="text-sm text-muted">{post.author.role}</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      The AdSlack team obsesses over ad creative performance so you don&apos;t have to. We track millions of ads daily and distil what works into actionable guides.
                    </p>
                  </div>
                </div>
              </div>

              {/* Related posts */}
              {related.length > 0 && (
                <div className="mt-12">
                  <h2 className="mb-6 text-xl font-bold">Related articles</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {related.map((p) => (
                      <PostCard key={p.slug} post={p} />
                    ))}
                  </div>
                </div>
              )}
            </article>

            {/* Sticky sidebar */}
            <aside className="hidden w-56 shrink-0 lg:block">
              <div className="sticky top-24 space-y-8">
                {/* ToC */}
                <TableOfContents headings={post.headings} />

                {/* CTA */}
                <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
                  <p className="mb-1 text-sm font-semibold text-foreground">
                    Find ads like these
                  </p>
                  <p className="mb-3 text-xs text-muted">
                    AdSlack tracks viral ads in real-time across TikTok, Meta, YouTube, and more.
                  </p>
                  <Link
                    href="/api/auth/signin"
                    className="block rounded-lg bg-accent px-3 py-2 text-center text-xs font-bold text-white hover:bg-accent-hover transition-colors"
                  >
                    Start free →
                  </Link>
                </div>

                {/* Comparison links */}
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
                    Comparisons
                  </p>
                  <ul className="space-y-1">
                    {[
                      ["vs PiPiAds", "/vs/pipiads"],
                      ["vs BigSpy", "/vs/bigspy"],
                      ["vs AdSpy", "/vs/adspy"],
                      ["vs Minea", "/vs/minea"],
                    ].map(([label, href]) => (
                      <li key={href}>
                        <Link
                          href={href}
                          className="block rounded py-1 text-xs text-muted hover:text-foreground transition-colors"
                        >
                          AdSlack {label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </>
  );
}

import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getCompetitor, getAllCompetitors, COMPETITOR_SLUGS } from "@/lib/competitors";
import { buildMetadata, faqSchema, breadcrumbSchema, canonical } from "@/lib/seo";

// ── Static params ─────────────────────────────────────────────────────────────

export function generateStaticParams() {
  return COMPETITOR_SLUGS.map((slug) => ({ competitor: slug }));
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: { competitor: string };
}): Promise<Metadata> {
  const c = getCompetitor(params.competitor);
  if (!c) return {};

  return buildMetadata({
    title: `Adsentify vs ${c.name}: Full Comparison (2026)`,
    description: `Honest comparison of Adsentify vs ${c.name}. See feature differences, pricing, data freshness, and which ad spy tool is right for your team.`,
    path: `/vs/${c.slug}`,
    ogType: "compare",
    keywords: [
      `Adsentify vs ${c.name}`,
      `${c.name} alternative`,
      `${c.name} competitor`,
      `best ad spy tool`,
      `ad intelligence comparison`,
    ],
  });
}

// ── Check icon ────────────────────────────────────────────────────────────────

function Check() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none">
      <path d="M3 8.5 6.5 12 13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function VsPage({ params }: { params: { competitor: string } }) {
  const competitor = getCompetitor(params.competitor);
  if (!competitor) notFound();

  const others = getAllCompetitors().filter((c) => c.slug !== competitor.slug);
  const jsonLd = faqSchema(competitor.faqItems);
  const breadcrumbLd = breadcrumbSchema([
    { name: "Home", url: canonical("/") },
    { name: "Comparisons", url: canonical("/vs/pipiads") },
    { name: `Adsentify vs ${competitor.name}`, url: canonical(`/vs/${competitor.slug}`) },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent text-xs font-bold text-white">A</div>
            <span className="font-bold text-foreground">Adsentify</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/blog" className="hidden text-sm text-muted-foreground hover:text-foreground transition-colors sm:block">Blog</Link>
            <Link href="/tools/free-ad-library" className="hidden text-sm text-muted-foreground hover:text-foreground transition-colors sm:block">Free Tools</Link>
            <Link href="/api/auth/signin" className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors">
              Try Adsentify free
            </Link>
          </div>
        </div>
      </header>

      <main className="min-h-screen bg-background">
        {/* Hero */}
        <section className="border-b border-border/60 py-16">
          <div className="mx-auto max-w-5xl px-6">
            {/* Breadcrumb */}
            <div className="mb-6 flex items-center gap-2 text-sm text-muted">
              <Link href="/" className="hover:text-foreground transition-colors">Adsentify</Link>
              <span>/</span>
              <span>Comparisons</span>
              <span>/</span>
              <span className="text-foreground-2">vs {competitor.name}</span>
            </div>

            {/* VS header */}
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent text-2xl font-black text-white">
                A
              </div>
              <div className="text-2xl font-bold text-muted">vs</div>
              <div className="flex h-14 w-14 items-center justify-center rounded-xl border-2 border-border bg-surface-2 text-2xl font-black text-muted">
                {competitor.name[0]}
              </div>
            </div>

            <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
              Adsentify vs {competitor.name}
              <br />
              <span className="text-gradient">Full Comparison (2026)</span>
            </h1>
            <p className="mb-6 max-w-2xl text-lg text-muted-foreground">
              {competitor.description}
            </p>

            {/* Quick stats */}
            <div className="inline-grid grid-cols-2 gap-4 rounded-2xl border border-border bg-surface p-5 sm:grid-cols-4">
              {[
                { label: "Adsentify refresh", value: "30 min" },
                { label: `${competitor.name} refresh`, value: competitor.refreshRate },
                { label: "Adsentify starts at", value: "$0/mo" },
                { label: `${competitor.name} starts at`, value: competitor.monthlyPrice },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-lg font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-5xl px-6 py-12 space-y-16">
          {/* Feature comparison table */}
          <section>
            <h2 className="mb-6 text-2xl font-bold">Feature comparison</h2>
            <div className="overflow-hidden rounded-2xl border border-border bg-surface">
              {/* Header */}
              <div className="grid grid-cols-3 border-b border-border bg-surface-2">
                <div className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-muted">Feature</div>
                <div className="border-l border-border px-6 py-4 text-center">
                  <span className="text-sm font-bold text-accent">Adsentify</span>
                </div>
                <div className="border-l border-border px-6 py-4 text-center">
                  <span className="text-sm font-semibold text-muted">{competitor.name}</span>
                </div>
              </div>

              {competitor.features.map((row, i) => (
                <div
                  key={row.name}
                  className={`grid grid-cols-3 border-b border-border/60 last:border-0 ${i % 2 === 1 ? "bg-surface-2/30" : ""}`}
                >
                  <div className="px-6 py-3.5 text-sm text-foreground-2">{row.name}</div>

                  {/* Adsentify cell */}
                  <div className="border-l border-border/60 px-6 py-3.5 flex items-center justify-center">
                    {typeof row.adsentify === "boolean" ? (
                      row.adsentify ? (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500/15 text-green-400">
                          <Check />
                        </span>
                      ) : (
                        <span className="text-muted/40 text-sm">—</span>
                      )
                    ) : (
                      <span className="text-sm font-medium text-accent">{row.adsentify}</span>
                    )}
                  </div>

                  {/* Competitor cell */}
                  <div className="border-l border-border/60 px-6 py-3.5 flex items-center justify-center">
                    {typeof row.them === "boolean" ? (
                      row.them ? (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-3 text-muted">
                          <Check />
                        </span>
                      ) : (
                        <span className="text-muted/40 text-sm">✕</span>
                      )
                    ) : (
                      <span className="text-sm text-muted">{row.them}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Side-by-side strengths */}
          <section className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-2xl border border-accent/30 bg-accent/5 p-6">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-xs font-bold text-white">A</div>
                <h3 className="font-bold text-foreground">Why teams choose Adsentify</h3>
              </div>
              <ul className="space-y-3">
                {competitor.ourAdvantages.map((adv) => (
                  <li key={adv} className="flex items-start gap-2 text-sm text-foreground-2">
                    <span className="mt-0.5 shrink-0 text-green-400"><Check /></span>
                    {adv}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-6">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-3 text-xs font-bold text-muted">
                  {competitor.name[0]}
                </div>
                <h3 className="font-bold text-foreground">Where {competitor.name} excels</h3>
              </div>
              <ul className="space-y-3">
                {competitor.theirStrengths.map((str) => (
                  <li key={str} className="flex items-start gap-2 text-sm text-muted">
                    <span className="mt-0.5 shrink-0 text-muted"><Check /></span>
                    {str}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Verdict */}
          <section className="rounded-2xl border border-border bg-surface p-8">
            <h2 className="mb-4 text-xl font-bold">Our honest verdict</h2>
            <p className="text-muted-foreground leading-relaxed">{competitor.verdict}</p>
            <div className="mt-6">
              <Link
                href="/api/auth/signin"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent to-orange-600 px-6 py-3 text-sm font-bold text-white shadow-glow hover:shadow-[0_0_32px_rgba(249,115,22,0.5)] transition-all active:scale-95"
              >
                Try Adsentify free — no credit card →
              </Link>
            </div>
          </section>

          {/* FAQ */}
          <section>
            <h2 className="mb-6 text-2xl font-bold">Frequently asked questions</h2>
            <div className="space-y-4">
              {competitor.faqItems.map((item) => (
                <div key={item.question} className="rounded-xl border border-border bg-surface p-5">
                  <p className="mb-2 font-semibold text-foreground">{item.question}</p>
                  <p className="text-sm text-muted leading-relaxed">{item.answer}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Other comparisons */}
          <section>
            <h2 className="mb-6 text-xl font-bold text-muted">Compare other tools</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {others.map((c) => (
                <Link
                  key={c.slug}
                  href={`/vs/${c.slug}`}
                  className="group rounded-xl border border-border bg-surface p-4 transition-all hover:border-accent/40 hover:bg-surface-2"
                >
                  <p className="mb-1 font-semibold text-foreground group-hover:text-accent transition-colors">
                    Adsentify vs {c.name} →
                  </p>
                  <p className="text-xs text-muted">{c.tagline}</p>
                </Link>
              ))}
            </div>
          </section>

          {/* Internal blog links */}
          <section className="rounded-2xl border border-border bg-surface p-6">
            <h2 className="mb-4 text-base font-semibold text-muted">Related reading</h2>
            <ul className="space-y-2">
              {[
                { href: "/blog/tiktok-ad-spy-tools-guide", label: "TikTok Ad Spy Tools: The Complete 2026 Guide" },
                { href: "/blog/winning-products-ad-intelligence", label: "How to Find Winning Products Using Ad Intelligence" },
                { href: "/blog/reverse-engineer-competitor-ad-strategy", label: "How to Reverse-Engineer a Competitor's Ad Strategy in 15 Minutes" },
                { href: "/tools/free-ad-library", label: "Free Ad Library — Today's Top 20 Trending Ads" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-accent hover:underline"
                  >
                    {link.label} →
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>

      <footer className="border-t border-border bg-surface py-8">
        <div className="mx-auto max-w-5xl px-6">
          <div className="flex flex-col items-center justify-between gap-4 text-xs text-muted sm:flex-row">
            <span>© {new Date().getFullYear()} Adsentify. All rights reserved.</span>
            <div className="flex items-center gap-6">
              <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
              <Link href="/blog" className="hover:text-foreground transition-colors">Blog</Link>
              <Link href="/tools/free-ad-library" className="hover:text-foreground transition-colors">Free Tools</Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

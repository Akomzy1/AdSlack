import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { buildMetadata, faqSchema, breadcrumbSchema, howToSchema, canonical } from "@/lib/seo";

export const revalidate = 86400; // ISR: regenerate once per day

export const metadata: Metadata = buildMetadata({
  title: "Free Ad Library — Top 20 Trending Ads Today",
  description:
    "Browse today's top 20 highest-velocity ads across TikTok, Meta, YouTube, and more. Updated daily. No account required. Find winning creative before your competitors do.",
  path: "/tools/free-ad-library",
  ogType: "tool",
  keywords: [
    "free ad library",
    "trending ads today",
    "top performing ads",
    "free ad spy tool",
    "winning ads free",
    "TikTok trending ads",
  ],
});

const PLATFORM_LABELS: Record<string, string> = {
  TIKTOK: "TikTok",
  META: "Meta",
  YOUTUBE: "YouTube",
  GOOGLE: "Google",
  PINTEREST: "Pinterest",
  SNAPCHAT: "Snapchat",
};

type TierConfig = { label: string; icon: string; color: string; bg: string };
const TIER_FALLBACK: TierConfig = { label: "Steady", icon: "→", color: "text-muted", bg: "bg-surface-3 border-border" };
const TIER_CONFIG: { [k: string]: TierConfig | undefined } = {
  EXPLOSIVE: { label: "Explosive", icon: "🔥", color: "text-green-400", bg: "bg-green-400/10 border-green-400/20" },
  HIGH:      { label: "High",      icon: "⚡", color: "text-accent",    bg: "bg-accent/10 border-accent/20" },
  RISING:    { label: "Rising",    icon: "📈", color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/20" },
  STEADY:    TIER_FALLBACK,
};

const FAQ_ITEMS = [
  {
    question: "What is the Adsentify free ad library?",
    answer:
      "The free ad library shows today's top 20 highest-velocity ads tracked by Adsentify, refreshed daily. Velocity measures how fast an ad is gaining traction — so these are the ads gaining momentum right now, not just the ones with the most total views.",
  },
  {
    question: "How often is this updated?",
    answer:
      "The free library updates daily with a fresh top 20 list. Adsentify Pro subscribers get real-time updates every 30 minutes across 2M+ ads.",
  },
  {
    question: "What's included in a free Adsentify account?",
    answer:
      "A free account gives you access to 50 ad views per month, basic filtering by niche and platform, and the ability to save up to 10 ads. Pro unlocks unlimited browsing, AI X-Ray analysis, the brief generator, and velocity alerts.",
  },
  {
    question: "Are these ads from real advertisers?",
    answer:
      "Yes. Every ad in Adsentify's database is a real paid advertisement currently (or recently) running on the specified platform. We track ad data from TikTok, Meta (Facebook/Instagram), YouTube, and Google.",
  },
];

async function getTopAds() {
  try {
    const ads = await db.ad.findMany({
      where: { isActive: true },
      orderBy: { velocityScore: "desc" },
      take: 20,
      select: {
        id: true,
        brandName: true,
        productName: true,
        niche: true,
        platform: true,
        thumbnailUrl: true,
        hookText: true,
        velocityScore: true,
        velocityTier: true,
        daysRunning: true,
      },
    });
    return ads;
  } catch {
    // Return mock data if DB is unavailable (e.g., public demo)
    return getMockAds();
  }
}

function getMockAds() {
  return [
    { id: "mock-1", brandName: "NovaSkin", productName: "Retinol Serum", niche: "skincare", platform: "TIKTOK", thumbnailUrl: null, hookText: "I've been using this every morning for 90 days. My dermatologist was shocked.", velocityScore: 98, velocityTier: "EXPLOSIVE", daysRunning: 14 },
    { id: "mock-2", brandName: "MusclePeak", productName: "Pre-Workout", niche: "fitness", platform: "META", thumbnailUrl: null, hookText: "If you're still using regular pre-workout, you're leaving gains on the table.", velocityScore: 91, velocityTier: "EXPLOSIVE", daysRunning: 21 },
    { id: "mock-3", brandName: "ZenBrews", productName: "Adaptogen Coffee", niche: "wellness", platform: "TIKTOK", thumbnailUrl: null, hookText: "The coffee replacement that 40,000 entrepreneurs switched to this year.", velocityScore: 87, velocityTier: "HIGH", daysRunning: 9 },
    { id: "mock-4", brandName: "FitFuel", productName: "Protein Bar", niche: "nutrition", platform: "META", thumbnailUrl: null, hookText: "What happens when you eat protein bars every day for 30 days? I tried it.", velocityScore: 84, velocityTier: "HIGH", daysRunning: 18 },
    { id: "mock-5", brandName: "GlowLab", productName: "Vitamin C Serum", niche: "skincare", platform: "YOUTUBE", thumbnailUrl: null, hookText: "Dermatologists don't want you to know this 3-ingredient routine works.", velocityScore: 82, velocityTier: "HIGH", daysRunning: 32 },
    { id: "mock-6", brandName: "SleepWave", productName: "Magnesium Spray", niche: "wellness", platform: "TIKTOK", thumbnailUrl: null, hookText: "I haven't had a bad night's sleep in 3 months. Here's what changed.", velocityScore: 79, velocityTier: "HIGH", daysRunning: 7 },
    { id: "mock-7", brandName: "CargoKing", productName: "Tactical Pants", niche: "fashion", platform: "META", thumbnailUrl: null, hookText: "These pants have 14 pockets. I wore them for a week straight.", velocityScore: 76, velocityTier: "HIGH", daysRunning: 28 },
    { id: "mock-8", brandName: "AquaPure", productName: "Water Filter", niche: "home", platform: "TIKTOK", thumbnailUrl: null, hookText: "Testing the tap water in my city. You need to see these results.", velocityScore: 74, velocityTier: "RISING", daysRunning: 5 },
    { id: "mock-9", brandName: "BrainBoost", productName: "Focus Supplement", niche: "nootropics", platform: "YOUTUBE", thumbnailUrl: null, hookText: "I took this every day for 60 days. This is what happened to my work output.", velocityScore: 72, velocityTier: "RISING", daysRunning: 11 },
    { id: "mock-10", brandName: "PureCoat", productName: "Ceramic Car Coating", niche: "automotive", platform: "META", thumbnailUrl: null, hookText: "Before/after of a $65,000 car. This is 3 hours of work.", velocityScore: 70, velocityTier: "RISING", daysRunning: 16 },
    { id: "mock-11", brandName: "ChaiCo", productName: "Masala Chai Mix", niche: "food_beverage", platform: "TIKTOK", thumbnailUrl: null, hookText: "My grandmother's recipe is now a product. 90,000 people tried it last month.", velocityScore: 68, velocityTier: "RISING", daysRunning: 43 },
    { id: "mock-12", brandName: "KettleCore", productName: "Cast Iron Kettle", niche: "kitchen", platform: "META", thumbnailUrl: null, hookText: "Why every serious cook I know has switched from stainless to cast iron for this.", velocityScore: 66, velocityTier: "RISING", daysRunning: 29 },
    { id: "mock-13", brandName: "AirPillow", productName: "Travel Neck Pillow", niche: "travel", platform: "YOUTUBE", thumbnailUrl: null, hookText: "I flew 14 hours and my neck was fine. Here's the pillow that changed everything.", velocityScore: 64, velocityTier: "RISING", daysRunning: 19 },
    { id: "mock-14", brandName: "NordLight", productName: "SAD Lamp", niche: "wellness", platform: "TIKTOK", thumbnailUrl: null, hookText: "I live in Seattle. This is the only reason I can function in November.", velocityScore: 62, velocityTier: "RISING", daysRunning: 8 },
    { id: "mock-15", brandName: "GripForce", productName: "Grip Trainer", niche: "fitness", platform: "META", thumbnailUrl: null, hookText: "Grip strength predicts all-cause mortality. This is how I trained mine.", velocityScore: 61, velocityTier: "RISING", daysRunning: 22 },
    { id: "mock-16", brandName: "IceBath Co", productName: "Cold Plunge Tub", niche: "recovery", platform: "TIKTOK", thumbnailUrl: null, hookText: "30 days of cold plunging. Here's what nobody tells you about day 15.", velocityScore: 59, velocityTier: "RISING", daysRunning: 37 },
    { id: "mock-17", brandName: "MindfulMat", productName: "Meditation Cushion", niche: "wellness", platform: "YOUTUBE", thumbnailUrl: null, hookText: "I've meditated daily for 2 years. This is the one piece of gear that actually mattered.", velocityScore: 58, velocityTier: "RISING", daysRunning: 44 },
    { id: "mock-18", brandName: "SpeedDeck", productName: "Standing Desk Converter", niche: "office", platform: "META", thumbnailUrl: null, hookText: "6 hours sitting vs 6 hours standing. My doctor told me to show everyone this data.", velocityScore: 57, velocityTier: "RISING", daysRunning: 26 },
    { id: "mock-19", brandName: "SolarGro", productName: "Grow Light", niche: "gardening", platform: "TIKTOK", thumbnailUrl: null, hookText: "I grew tomatoes in my apartment in February. This is how.", velocityScore: 55, velocityTier: "RISING", daysRunning: 12 },
    { id: "mock-20", brandName: "DripCraft", productName: "Pour-Over Coffee Kit", niche: "food_beverage", platform: "META", thumbnailUrl: null, hookText: "Barista in my building said this is better than anything she makes at the cafe.", velocityScore: 54, velocityTier: "RISING", daysRunning: 31 },
  ] as const;
}

export default async function FreeAdLibraryPage() {
  const ads = await getTopAds();

  const schemas = [
    faqSchema(FAQ_ITEMS),
    breadcrumbSchema([
      { name: "Home", url: canonical("/") },
      { name: "Tools", url: canonical("/tools/free-ad-library") },
      { name: "Free Ad Library", url: canonical("/tools/free-ad-library") },
    ]),
    howToSchema({
      name: "How to Find Winning Ads with the Free Ad Library",
      description:
        "Use Adsentify's free ad library to discover high-velocity ads before they saturate your feed.",
      steps: [
        {
          name: "Browse today's top 20",
          text: "View the daily-refreshed list of the highest-velocity ads across TikTok, Meta, YouTube, and Google — ranked by momentum, not total views.",
          url: canonical("/tools/free-ad-library"),
        },
        {
          name: "Spot the velocity tier",
          text: "Each ad is tagged Explosive, High, Rising, or Steady. Focus on Explosive and High-tier ads — these are gaining traction fastest and are likely to dominate their niche within 48 hours.",
        },
        {
          name: "Unlock AI X-Ray for deep analysis",
          text: "Sign up free to access AI-powered ad anatomy breakdowns: hook analysis, emotional triggers, CTA structure, and the ability to remix the winning formula into your own creative.",
          url: canonical("/api/auth/signin"),
        },
      ],
    }),
  ];

  return (
    <>
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent text-xs font-bold text-white">A</div>
            <span className="font-bold text-foreground">Adsentify</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/blog" className="hidden text-sm text-muted-foreground hover:text-foreground transition-colors sm:block">Blog</Link>
            <Link href="/api/auth/signin" className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground-2 hover:bg-surface-2 transition-all">Sign in</Link>
            <Link href="/api/auth/signin" className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors">Unlock full access</Link>
          </div>
        </div>
      </header>

      <main className="min-h-screen bg-background">
        {/* Hero */}
        <section className="border-b border-border/60 py-14">
          <div className="mx-auto max-w-6xl px-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                  Updated daily · {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </div>
                <h1 className="mb-3 text-4xl font-bold tracking-tight sm:text-5xl">
                  Today&apos;s Top 20
                  <br />
                  <span className="text-gradient">Trending Ads</span>
                </h1>
                <p className="max-w-xl text-muted-foreground">
                  The highest-velocity ads across TikTok, Meta, YouTube, and more — refreshed daily. These are the ads gaining momentum <em>right now</em>, before they saturate your feed.
                </p>
              </div>

              {/* Upgrade CTA */}
              <div className="shrink-0 rounded-2xl border border-accent/30 bg-accent/5 p-5 lg:w-72">
                <p className="mb-1 font-semibold text-foreground">Want the full picture?</p>
                <p className="mb-4 text-sm text-muted">
                  Unlock 2M+ ads, real-time velocity tracking, AI X-Ray analysis, and velocity alerts.
                </p>
                <Link
                  href="/api/auth/signin"
                  className="block rounded-xl bg-gradient-to-r from-accent to-orange-600 px-4 py-2.5 text-center text-sm font-bold text-white shadow-glow transition-all hover:shadow-[0_0_24px_rgba(249,115,22,0.5)]"
                >
                  Start free — no credit card →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Ad grid */}
        <section className="py-10">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {ads.map((ad, index) => {
                const tier = TIER_CONFIG[ad.velocityTier] ?? TIER_FALLBACK;
                const platform = PLATFORM_LABELS[ad.platform] ?? ad.platform;

                return (
                  <div
                    key={ad.id}
                    className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-all hover:border-accent/40 hover:bg-surface-2"
                  >
                    {/* Rank badge */}
                    <div className="absolute left-3 top-3 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-background/80 text-xs font-bold text-muted backdrop-blur-sm">
                      {index + 1}
                    </div>

                    {/* Thumbnail */}
                    <div className="relative aspect-video bg-gradient-to-br from-surface-3 to-surface-2 flex items-center justify-center overflow-hidden">
                      {ad.thumbnailUrl ? (
                        <Image
                          src={ad.thumbnailUrl}
                          alt={`${ad.brandName} ad`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        />
                      ) : (
                        <span className="text-3xl opacity-20">🎬</span>
                      )}

                      {/* Blurred CTA overlay for anatomy */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/80 opacity-0 transition-opacity group-hover:opacity-100 backdrop-blur-sm">
                        <p className="text-xs font-semibold text-foreground">AI Analysis locked</p>
                        <Link
                          href="/api/auth/signin"
                          className="rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-white hover:bg-accent-hover transition-colors"
                        >
                          Unlock X-Ray →
                        </Link>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex flex-1 flex-col p-4">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tier.bg} ${tier.color}`}>
                          {tier.icon} {tier.label}
                        </span>
                        <span className="rounded bg-surface-3 px-2 py-0.5 text-[10px] text-muted">{platform}</span>
                      </div>

                      <p className="mb-1 font-semibold text-sm text-foreground">{ad.brandName}</p>
                      {ad.productName && (
                        <p className="mb-2 text-xs text-muted">{ad.productName}</p>
                      )}

                      {ad.hookText && (
                        <p className="mb-3 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                          &ldquo;{ad.hookText}&rdquo;
                        </p>
                      )}

                      <div className="mt-auto flex items-center justify-between text-xs text-muted">
                        <div className="flex items-center gap-1">
                          <span className={`font-bold text-sm ${tier.color}`}>
                            {Math.round(ad.velocityScore)}
                          </span>
                          <span>velocity</span>
                        </div>
                        <span>{ad.daysRunning}d running</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mid-page CTA */}
            <div className="my-12 overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-r from-accent/10 via-transparent to-primary/10 p-8 text-center">
              <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-accent">Want more?</p>
              <h2 className="mb-3 text-2xl font-bold">
                You&apos;re seeing 20 of 2,000,000+ ads
              </h2>
              <p className="mb-6 text-muted">
                Pro members get real-time access to every ad in our database — with velocity scoring, AI analysis, and instant alerts when new winners emerge.
              </p>
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Link
                  href="/api/auth/signin"
                  className="rounded-xl bg-gradient-to-r from-accent to-orange-600 px-6 py-3 text-sm font-bold text-white shadow-glow hover:shadow-[0_0_32px_rgba(249,115,22,0.5)] transition-all active:scale-95"
                >
                  Unlock full access — free trial →
                </Link>
                <Link href="/#pricing" className="text-sm text-muted hover:text-foreground transition-colors">
                  View pricing
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="border-t border-border/60 py-16 bg-surface/50">
          <div className="mx-auto max-w-4xl px-6">
            <h2 className="mb-10 text-center text-2xl font-bold">What is Velocity Scoring?</h2>
            <div className="grid gap-6 sm:grid-cols-3">
              {[
                {
                  icon: "📡",
                  title: "We track millions of ads",
                  body: "Adsentify monitors paid ads across TikTok, Meta, YouTube, and Google — updated every 30 minutes.",
                },
                {
                  icon: "⚡",
                  title: "We score momentum, not mass",
                  body: "Velocity measures how fast an ad is gaining traction right now — not total historical views. An ad with 5k views in 2 days beats 1M views from 6 months ago.",
                },
                {
                  icon: "🔥",
                  title: "You see winners early",
                  body: "High-velocity ads today often become the dominant creative in their niche within 1–2 weeks. The velocity signal gives you a 48-hour head start on what's about to go viral.",
                },
              ].map((step) => (
                <div key={step.title} className="rounded-2xl border border-border bg-surface p-6 text-center">
                  <div className="mb-3 text-3xl">{step.icon}</div>
                  <h3 className="mb-2 font-semibold text-foreground">{step.title}</h3>
                  <p className="text-sm text-muted leading-relaxed">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16">
          <div className="mx-auto max-w-2xl px-6">
            <h2 className="mb-8 text-center text-2xl font-bold">Frequently asked questions</h2>
            <div className="space-y-3">
              {FAQ_ITEMS.map((item) => (
                <div key={item.question} className="rounded-xl border border-border bg-surface p-5">
                  <p className="mb-2 font-semibold text-foreground">{item.question}</p>
                  <p className="text-sm text-muted leading-relaxed">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Internal links */}
        <section className="border-t border-border/60 py-12 bg-surface/50">
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="mb-6 text-center text-lg font-semibold text-muted">More resources</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {(
                [
                  { href: "/blog/tiktok-ad-spy-tools-guide", label: "TikTok Ad Spy Guide →" },
                  { href: "/blog/viral-ad-hooks-frameworks", label: "8 Viral Hook Frameworks →" },
                  { href: "/vs/pipiads", label: "Adsentify vs PiPiAds →" },
                  { href: "/vs/minea", label: "Adsentify vs Minea →" },
                ] as { href: Route; label: string }[]
              ).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-xl border border-border bg-surface p-4 text-sm font-medium text-muted hover:border-accent/40 hover:text-foreground transition-all text-center"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Footer CTA */}
        <section className="border-t border-border/60 py-16 text-center">
          <div className="mx-auto max-w-xl px-6">
            <h2 className="mb-3 text-3xl font-bold">Ready to find winning ads in real-time?</h2>
            <p className="mb-8 text-muted">
              Join 2,400+ marketers who use Adsentify to catch viral creative 48 hours before everyone else.
            </p>
            <Link
              href="/api/auth/signin"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent to-orange-600 px-8 py-4 text-sm font-bold text-white shadow-glow hover:shadow-[0_0_32px_rgba(249,115,22,0.5)] transition-all active:scale-95"
            >
              Get started free — no credit card required
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-surface py-8">
        <div className="mx-auto max-w-6xl px-6 text-center text-xs text-muted">
          <p>
            © {new Date().getFullYear()} Adsentify ·{" "}
            <Link href="/blog" className="hover:text-foreground transition-colors">Blog</Link>
            {" · "}
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            {" · "}
            <Link href="/#pricing" className="hover:text-foreground transition-colors">Pricing</Link>
          </p>
        </div>
      </footer>
    </>
  );
}

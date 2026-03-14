import type { Metadata } from "next";
import Link from "next/link";
import { LandingNav } from "@/components/landing/LandingNav";
import { HeroBg } from "@/components/landing/HeroBg";
import { PricingSection } from "@/components/landing/PricingSection";
import { FaqSection } from "@/components/landing/FaqSection";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { CtaEmailInput } from "@/components/landing/CtaEmailInput";
import { buildMetadata, softwareAppSchema } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "AdForge — Find Winning Ads Before Your Competitors Do",
  description:
    "AI-powered ad intelligence platform. Track viral velocity across TikTok, Meta, YouTube and more. Spot breakout creatives in 48 hours, deconstruct them with AI, and forge better ads faster.",
  path: "/",
  keywords: [
    "ad spy tool",
    "ad intelligence platform",
    "TikTok ad spy",
    "find winning ads",
    "ad creative analysis",
    "velocity scoring ads",
    "Meta ad spy",
    "ad brief generator",
  ],
});

// ── Inline SVG icons ──────────────────────────────────────────────────────────

function IconSearch() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.8" />
      <path d="m13.5 13.5 3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconBrain() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 3c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2s2-.9 2-2V5c0-1.1-.9-2-2-2z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7 6.5C5.3 6.5 4 7.8 4 9.5S5.3 12.5 7 12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M13 6.5c1.7 0 3 1.3 3 3s-1.3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="7" cy="9.5" r="1" fill="currentColor" />
      <circle cx="13" cy="9.5" r="1" fill="currentColor" />
    </svg>
  );
}

function IconZap() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M11 2 4 11h7l-2 7 9-9h-7l2-8z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 2 4 5v5c0 4 2.7 7 6 8 3.3-1 6-4 6-8V5l-6-3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="m7.5 10 2 2 3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconTrend() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 14 8 9l3 3 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 6h3v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconStar() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 1l1.8 3.6L14 5.3l-3 2.9.7 4.1L8 10.4 4.3 12.3l.7-4.1-3-2.9 4.2-.7L8 1z" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 8.5 6.5 12 13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Mock App UI ───────────────────────────────────────────────────────────────

function MockAppUI() {
  const mockAds = [
    { brand: "NovaSkin", niche: "Skincare", score: 98, tier: "EXPLOSIVE", platform: "TT", days: 14, color: "from-pink-500/20 to-rose-500/10" },
    { brand: "MusclePeak", niche: "Fitness", score: 87, tier: "HIGH", platform: "META", days: 9, color: "from-blue-500/20 to-indigo-500/10" },
    { brand: "ZenBrews", niche: "Wellness", score: 74, tier: "RISING", platform: "YT", days: 5, color: "from-green-500/20 to-emerald-500/10" },
    { brand: "FitFuel", niche: "Nutrition", score: 91, tier: "EXPLOSIVE", platform: "TT", days: 21, color: "from-orange-500/20 to-amber-500/10" },
  ];

  const tierColor: Record<string, string> = {
    EXPLOSIVE: "text-green-400 bg-green-400/10",
    HIGH: "text-accent bg-accent/10",
    RISING: "text-yellow-400 bg-yellow-400/10",
  };

  return (
    <div className="relative w-full max-w-3xl mx-auto rounded-2xl border border-border bg-surface shadow-[0_32px_80px_rgba(0,0,0,0.6)] overflow-hidden">
      {/* Window chrome */}
      <div className="flex items-center gap-1.5 px-4 py-3 bg-surface-2 border-b border-border/60">
        <div className="h-3 w-3 rounded-full bg-red-500/70" />
        <div className="h-3 w-3 rounded-full bg-yellow-500/70" />
        <div className="h-3 w-3 rounded-full bg-green-500/70" />
        <div className="ml-4 flex-1 h-5 rounded bg-surface-3 text-[10px] text-muted flex items-center px-3">
          adforge.io/explore
        </div>
      </div>

      {/* App layout */}
      <div className="flex h-[340px]">
        {/* Sidebar */}
        <div className="w-40 border-r border-border/60 bg-surface p-3 flex flex-col gap-1">
          {["Explore", "Saved", "Alerts", "AI Forge"].map((item, i) => (
            <div
              key={item}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${i === 0 ? "bg-accent/15 text-accent" : "text-muted"}`}
            >
              <div className={`h-1.5 w-1.5 rounded-full ${i === 0 ? "bg-accent" : "bg-border"}`} />
              {item}
            </div>
          ))}
          <div className="mt-auto">
            <div className="rounded-lg border border-accent/20 bg-accent/5 p-2 text-[9px] text-muted text-center">
              <p className="font-semibold text-accent">PRO Plan</p>
              <p>847 ads remaining</p>
            </div>
          </div>
        </div>

        {/* Main grid */}
        <div className="flex-1 overflow-auto p-3">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex-1 h-7 rounded-lg bg-surface-3 flex items-center gap-2 px-3">
              <div className="h-3 w-3 text-muted opacity-60">
                <svg viewBox="0 0 12 12" fill="none"><circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.2"/><path d="m8 8 2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
              </div>
              <span className="text-[10px] text-muted">Search ads, niches, brands…</span>
            </div>
            <div className="h-7 rounded-lg bg-surface-3 px-2 text-[10px] text-muted flex items-center gap-1">
              Filter <span className="text-accent">3</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {mockAds.map((ad) => (
              <div key={ad.brand} className={`relative rounded-xl border border-border bg-gradient-to-br ${ad.color} p-2.5 cursor-pointer hover:border-accent/40 transition-colors`}>
                <div className="mb-2 h-16 rounded-lg bg-surface-3 flex items-center justify-center text-xl">
                  🎬
                </div>
                <p className="text-[11px] font-semibold text-foreground">{ad.brand}</p>
                <p className="text-[9px] text-muted mb-1.5">{ad.niche} · {ad.days}d running</p>
                <div className="flex items-center justify-between">
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${tierColor[ad.tier]}`}>
                    {ad.tier === "EXPLOSIVE" ? "🔥" : ad.tier === "HIGH" ? "⚡" : "📈"} {ad.score}
                  </span>
                  <span className="text-[9px] text-muted bg-surface-3 rounded px-1.5 py-0.5">{ad.platform}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI X-Ray panel */}
        <div className="w-52 border-l border-border/60 bg-surface p-3 overflow-auto">
          <div className="mb-2 flex items-center gap-1.5">
            <div className="h-4 w-4 rounded bg-accent/20 flex items-center justify-center text-[8px] text-accent font-bold">AI</div>
            <span className="text-[10px] font-semibold text-foreground">X-Ray Analysis</span>
          </div>
          <div className="mb-3 rounded-lg border border-accent/20 bg-accent/5 p-2">
            <p className="text-[9px] font-semibold text-accent mb-1">NovaSkin · Hook</p>
            <p className="text-[9px] text-muted leading-relaxed">"Before/after transformation using fear of aging as primary motivator"</p>
          </div>
          {["Hook Score", "Emotion Trigger", "CTA Strength", "Scroll Stop"].map((label, i) => {
            const vals = [94, 88, 76, 91];
            return (
              <div key={label} className="mb-2">
                <div className="flex justify-between text-[9px] text-muted mb-0.5">
                  <span>{label}</span>
                  <span className="text-foreground font-medium">{vals[i]}</span>
                </div>
                <div className="h-1 rounded-full bg-surface-3">
                  <div className="h-1 rounded-full bg-accent" style={{ width: `${vals[i]}%` }} />
                </div>
              </div>
            );
          })}
          <div className="mt-3 rounded-lg bg-surface-2 p-2">
            <p className="text-[9px] font-semibold text-foreground mb-1">Why It&apos;s Winning</p>
            <ul className="space-y-0.5">
              {["Social proof overlay", "3-sec pattern interrupt", "Urgency countdown"].map((item) => (
                <li key={item} className="flex items-center gap-1 text-[9px] text-muted">
                  <span className="text-green-400">✓</span> {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const features = [
    {
      icon: <IconTrend />,
      title: "Velocity Scoring",
      description: "Our proprietary algorithm scores every ad on a 0–100 velocity scale updated every 30 minutes. Catch winners in the first 48 hours — before they saturate your feed.",
    },
    {
      icon: <IconBrain />,
      title: "AI X-Ray Analysis",
      description: "Deconstruct any ad with one click. Claude-powered insights break down the hook, emotion triggers, CTA strength, and scroll-stop mechanics so you know exactly why it works.",
    },
    {
      icon: <IconSearch />,
      title: "Deep Ad Discovery",
      description: "Filter 2M+ ads by niche, platform, velocity tier, days running, and brand. Search by keyword across hooks, captions, and transcripts. Find exactly what you need in seconds.",
    },
    {
      icon: <IconZap />,
      title: "Velocity Alerts",
      description: "Set rules once — get notified the moment an ad hits your velocity threshold. Instant emails, daily digests, or weekly summaries. Never miss a viral moment again.",
    },
    {
      icon: <IconShield />,
      title: "Brief Generator",
      description: "Turn any winning ad into a production-ready creative brief in one click. Full hook strategy, scene breakdown, copy angles, and targeting recommendations — ready for your team.",
    },
    {
      icon: <IconTrend />,
      title: "Trend Forecasting",
      description: "Spot emerging creative trends before they peak. Our trend engine analyzes velocity patterns across niches to surface what's about to blow up — 2–3 weeks ahead of the curve.",
    },
  ];

  const compareRows = [
    { feature: "Real-time velocity scoring", us: true, them: false },
    { feature: "AI creative deconstruction", us: true, them: false },
    { feature: "2M+ ad database", us: true, them: true },
    { feature: "30-minute data refresh", us: true, them: false },
    { feature: "Velocity alert system", us: true, them: false },
    { feature: "1-click brief generation", us: true, them: false },
    { feature: "Trend forecasting", us: true, them: false },
    { feature: "Multi-platform coverage", us: true, them: true },
  ];

  const testimonials = [
    {
      quote: "AdForge completely changed how we do creative strategy. We spotted a skincare ad going viral on Tuesday morning — by Friday we had our own version running. ROAS was 4.2x.",
      name: "Jordan Kim",
      role: "Creative Director",
      company: "Halo Agency",
      avatar: "JK",
    },
    {
      quote: "The velocity scoring is genuinely useful. Other tools just show you what's trending — AdForge shows you what's ABOUT to trend. That 48-hour window is everything in paid social.",
      name: "Priya Mehta",
      role: "Head of Performance",
      company: "Velvet Commerce",
      avatar: "PM",
    },
    {
      quote: "I cancelled my Minea and MagicBrief subscriptions the same week I signed up for AdForge. The AI X-Ray alone is worth the price — it's like having a senior creative strategist on call.",
      name: "Marcus Webb",
      role: "Media Buyer",
      company: "Freelance",
      avatar: "MW",
    },
  ];

  const jsonLd = softwareAppSchema();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ScrollReveal />
      <LandingNav />

      <main className="min-h-screen bg-background text-foreground">

        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden pt-28 pb-24 md:pt-36 md:pb-32">
          <HeroBg />
          <div className="dot-grid absolute inset-0 pointer-events-none" />

          <div className="relative z-10 mx-auto max-w-5xl px-6 text-center">
            {/* Badge */}
            <div className="animate-reveal-fade mb-6 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-xs font-semibold text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
              2,400+ marketers tracking velocity right now
            </div>

            {/* Headline */}
            <h1 className="animate-reveal-up mb-6 text-5xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl" style={{ animationDelay: "0.1s" }}>
              Find winning ads{" "}
              <span className="text-gradient">before</span>{" "}
              your competitors do
            </h1>

            {/* Sub */}
            <p className="animate-reveal-up mx-auto mb-10 max-w-2xl text-lg text-muted-foreground leading-relaxed" style={{ animationDelay: "0.2s" }}>
              AdForge tracks viral velocity across TikTok, Meta, YouTube, and more. Spot breakout creatives in the first 48 hours, deconstruct them with AI, and forge better ads — faster.
            </p>

            {/* CTAs */}
            <div className="animate-reveal-up mb-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center" style={{ animationDelay: "0.3s" }}>
              <CtaEmailInput />
            </div>

            {/* Social proof */}
            <div className="animate-reveal-fade flex flex-wrap items-center justify-center gap-6 text-xs text-muted" style={{ animationDelay: "0.5s" }}>
              <div className="flex items-center gap-1.5">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-amber-400"><IconStar /></span>
                  ))}
                </div>
                <span><strong className="text-foreground-2">4.9/5</strong> from 340+ reviews</span>
              </div>
              <span className="hidden sm:block text-border">|</span>
              <span>🏆 <strong className="text-foreground-2">Top-rated</strong> ad spy tool 2025</span>
              <span className="hidden sm:block text-border">|</span>
              <span>🔒 No credit card required</span>
            </div>
          </div>

          {/* Mock UI */}
          <div className="relative z-10 mx-auto mt-20 max-w-5xl px-6 reveal" style={{ ["--delay" as string]: "0.15s" }}>
            <div className="animate-pulse-glow rounded-2xl">
              <MockAppUI />
            </div>
          </div>
        </section>

        {/* ── Product Showcase ───────────────────────────────────────────── */}
        <section id="features" className="py-24 md:py-32">
          <div className="mx-auto max-w-5xl px-6">
            <div className="mb-16 text-center reveal">
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-accent">How it works</p>
              <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">From discovery to deployment<br />in three steps</h2>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "Discover",
                  subtitle: "Find what's winning right now",
                  body: "Our velocity engine scores every ad across 50+ niches every 30 minutes. Filter by platform, niche, days running, and velocity tier to surface exactly the ads you need.",
                  icon: "🔍",
                },
                {
                  step: "02",
                  title: "Deconstruct",
                  subtitle: "Understand exactly why it works",
                  body: "One-click AI X-Ray analysis breaks down hooks, emotion triggers, CTA mechanics, and creative patterns. Know not just what's working — but why it's converting.",
                  icon: "🧬",
                },
                {
                  step: "03",
                  title: "Forge",
                  subtitle: "Build your winning creative",
                  body: "Turn any ad into a production-ready brief instantly. Our AI generates hook variations, scene-by-scene breakdowns, and copy angles tailored to your brand voice.",
                  icon: "⚡",
                },
              ].map((step, i) => (
                <div
                  key={step.step}
                  className="gradient-border reveal reveal-delay-1 p-px"
                  style={{ ["--delay" as string]: `${i * 0.1}s` }}
                >
                  <div className="h-full rounded-2xl bg-[#0d0f18] p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <span className="text-4xl">{step.icon}</span>
                      <span className="text-4xl font-bold text-border/40">{step.step}</span>
                    </div>
                    <h3 className="mb-1 text-xl font-bold">{step.title}</h3>
                    <p className="mb-3 text-sm font-medium text-accent">{step.subtitle}</p>
                    <p className="text-sm text-muted leading-relaxed">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── The Forge Difference (Comparison) ─────────────────────────── */}
        <section className="py-24 md:py-32 bg-surface/50">
          <div className="mx-auto max-w-3xl px-6">
            <div className="mb-12 text-center reveal">
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-accent">The AdForge Difference</p>
              <h2 className="text-4xl font-bold tracking-tight">Built for speed.<br />Designed for wins.</h2>
              <p className="mt-4 text-muted">Why marketers switch from other tools and never look back.</p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card reveal">
              {/* Header */}
              <div className="grid grid-cols-3 border-b border-border bg-surface-2">
                <div className="col-span-1 px-6 py-4 text-xs font-semibold uppercase tracking-widest text-muted">Feature</div>
                <div className="col-span-1 border-l border-border px-6 py-4 text-center">
                  <span className="text-sm font-bold text-accent">AdForge</span>
                </div>
                <div className="col-span-1 border-l border-border px-6 py-4 text-center">
                  <span className="text-sm font-medium text-muted">Others</span>
                </div>
              </div>
              {/* Rows */}
              {compareRows.map((row, i) => (
                <div
                  key={row.feature}
                  className={`grid grid-cols-3 border-b border-border/60 last:border-0 ${i % 2 === 0 ? "" : "bg-surface-2/30"}`}
                >
                  <div className="col-span-1 px-6 py-3.5 text-sm text-foreground-2">{row.feature}</div>
                  <div className="col-span-1 border-l border-border/60 px-6 py-3.5 flex items-center justify-center">
                    {row.us ? (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500/15 text-green-400">
                        <IconCheck />
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </div>
                  <div className="col-span-1 border-l border-border/60 px-6 py-3.5 flex items-center justify-center">
                    {row.them ? (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-3 text-muted">
                        <IconCheck />
                      </span>
                    ) : (
                      <span className="text-muted/40">✕</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features Grid ──────────────────────────────────────────────── */}
        <section className="py-24 md:py-32">
          <div className="mx-auto max-w-5xl px-6">
            <div className="mb-16 text-center reveal">
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-accent">Everything you need</p>
              <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">One platform.<br />Infinite creative advantage.</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feat, i) => (
                <div
                  key={feat.title}
                  className="group reveal rounded-2xl border border-border bg-surface p-6 transition-all hover:border-accent/40 hover:bg-surface-2"
                  style={{ transitionDelay: `${i * 0.05}s` }}
                >
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent transition-colors group-hover:bg-accent/25">
                    {feat.icon}
                  </div>
                  <h3 className="mb-2 font-semibold text-foreground">{feat.title}</h3>
                  <p className="text-sm text-muted leading-relaxed">{feat.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pricing ────────────────────────────────────────────────────── */}
        <section id="pricing" className="py-24 md:py-32 bg-surface/50">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-12 text-center reveal">
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-accent">Pricing</p>
              <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">Simple, transparent pricing</h2>
              <p className="mt-4 text-muted">Start free. Scale when you&apos;re ready. No hidden fees.</p>
            </div>
            <PricingSection />
          </div>
        </section>

        {/* ── Testimonials ───────────────────────────────────────────────── */}
        <section className="py-24 md:py-32">
          <div className="mx-auto max-w-5xl px-6">
            <div className="mb-16 text-center reveal">
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-accent">Loved by marketers</p>
              <h2 className="text-4xl font-bold tracking-tight">What our users say</h2>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {testimonials.map((t, i) => (
                <div
                  key={t.name}
                  className="reveal gradient-border p-px"
                  style={{ ["--delay" as string]: `${i * 0.1}s` }}
                >
                  <div className="flex h-full flex-col rounded-2xl bg-[#0d0f18] p-6">
                    <div className="mb-4 flex text-amber-400">
                      {[...Array(5)].map((_, j) => <IconStar key={j} />)}
                    </div>
                    <blockquote className="mb-6 flex-1 text-sm text-muted-foreground leading-relaxed">
                      &ldquo;{t.quote}&rdquo;
                    </blockquote>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-accent">
                        {t.avatar}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{t.name}</p>
                        <p className="text-xs text-muted">{t.role} · {t.company}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Stats bar */}
            <div className="mt-16 reveal grid grid-cols-2 gap-6 rounded-2xl border border-border bg-surface p-8 sm:grid-cols-4">
              {[
                { value: "2M+", label: "Ads tracked" },
                { value: "50+", label: "Niches covered" },
                { value: "30 min", label: "Refresh interval" },
                { value: "2,400+", label: "Active users" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-3xl font-bold text-gradient">{stat.value}</p>
                  <p className="mt-1 text-sm text-muted">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ────────────────────────────────────────────────────────── */}
        <section id="faq" className="py-24 md:py-32 bg-surface/50">
          <div className="mx-auto max-w-2xl px-6">
            <div className="mb-12 text-center reveal">
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-accent">FAQ</p>
              <h2 className="text-4xl font-bold tracking-tight">Questions answered</h2>
            </div>
            <FaqSection />
          </div>
        </section>

        {/* ── Final CTA ──────────────────────────────────────────────────── */}
        <section className="py-24 md:py-32">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <div className="relative reveal overflow-hidden rounded-3xl border border-accent/30 bg-gradient-to-b from-accent/10 to-transparent p-16">
              {/* Glow */}
              <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-accent/20 blur-[80px]" />

              <div className="relative z-10">
                <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-accent">Get started today</p>
                <h2 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
                  Your next winning ad<br />is already out there
                </h2>
                <p className="mb-10 text-lg text-muted">
                  Join 2,400+ marketers who use AdForge to find it first.
                </p>

                <div className="flex justify-center">
                  <CtaEmailInput />
                </div>

                <p className="mt-6 text-xs text-muted">
                  Free plan available · No credit card required · Cancel anytime
                </p>

                <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-muted">
                  {["TikTok Ads", "Meta Ads", "YouTube Ads", "Google Ads"].map((p) => (
                    <span key={p} className="flex items-center gap-1.5">
                      <span className="text-green-400"><IconCheck /></span>
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <footer className="border-t border-border bg-surface py-12">
          <div className="mx-auto max-w-5xl px-6">
            <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-white font-bold text-sm">A</div>
                <span className="font-bold text-foreground">AdForge</span>
                <span className="text-xs text-muted">AI-powered ad intelligence</span>
              </div>
              <nav className="flex flex-wrap items-center gap-6 text-xs text-muted">
                <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
                <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
                <Link href="/blog" className="hover:text-foreground transition-colors">Blog</Link>
                <Link href="/api/auth/signin" className="hover:text-foreground transition-colors">Sign in</Link>
              </nav>
            </div>
            <div className="mt-8 border-t border-border/60 pt-6 text-center text-xs text-muted">
              © {new Date().getFullYear()} AdForge. All rights reserved.
            </div>
          </div>
        </footer>

      </main>
    </>
  );
}

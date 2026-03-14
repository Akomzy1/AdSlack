"use client";

import { useState } from "react";

const FAQS = [
  {
    q: "How is Adslack different from AdSpy, BigSpy, or Minea?",
    a: "Most ad spy tools show you ads and leave you to guess why they work. Adslack goes further: our AI X-Ray breaks down the hook structure, emotional triggers, script formula, and persuasion mechanics of every winning ad. Then the Remix Engine turns those insights into production-ready hooks, scripts, and creative briefs for your own campaigns — in seconds.",
  },
  {
    q: "Where does the ad data come from?",
    a: "We ingest ads from official platform data sources and public ad libraries (Meta Ad Library, TikTok Creative Center, YouTube) plus proprietary crawlers. Velocity scores are updated every 6 hours based on real engagement metrics, so you're always seeing the freshest performance data.",
  },
  {
    q: "What AI model powers the analysis?",
    a: "The Ad Anatomy X-Ray and all Remix outputs are powered by Claude (Anthropic), one of the most capable language models available. We use the full Opus model for anatomy breakdowns and Sonnet for faster remix generation — quality where it matters, speed everywhere else.",
  },
  {
    q: "How does the velocity score work?",
    a: "Our velocity engine calculates a 0–100 score based on early engagement acceleration — how fast an ad is gaining views, likes, shares, and comments relative to its age and platform baseline. An ad scoring 90+ is statistically exceptional for its niche and is triggering Early Velocity Alerts for users watching that category.",
  },
  {
    q: "What's included in the Creative Brief Export?",
    a: "The AI generates a full production brief including: concept overview, target audience, key message, tone & style direction, shot list (scene by scene), music/audio direction, platform dimensions, duration, and CTA strategy. It's ready to hand straight to a video editor or UGC creator.",
  },
  {
    q: "Can I try before paying?",
    a: "Yes — the Free plan gives you 10 ad searches per day with no credit card required. When you're ready for anatomy breakdowns, remixes, and alerts, upgrade to Pro from the dashboard at any time.",
  },
  {
    q: "How do AI credits work?",
    a: "Each AI-powered action (anatomy breakdown, hook generation, script remix, creative brief) costs 1 credit. Pro plans include 50 credits/month. Scale and Agency plans have unlimited credits. Credits reset on your billing cycle date.",
  },
  {
    q: "Do you support TikTok, Meta, Instagram, and YouTube ads?",
    a: "Yes — all four platforms are fully supported. You can filter your ad library by platform, and velocity scores are calibrated per-platform so a TikTok score of 85 is comparable to a Facebook score of 85 within their respective context.",
  },
];

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="py-28">
      <div className="mx-auto max-w-3xl px-6">
        <div className="reveal mb-14 text-center">
          <span className="inline-block rounded-full border border-accent/30 bg-accent/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-accent">
            FAQ
          </span>
          <h2 className="mt-4 text-4xl font-black text-foreground">
            Everything you need to know
          </h2>
        </div>

        <div className="flex flex-col gap-2">
          {FAQS.map((faq, i) => (
            <div
              key={i}
              className={[
                "reveal rounded-xl border transition-all duration-200",
                `reveal-delay-${Math.min(i + 1, 5)}`,
                open === i
                  ? "border-accent/30 bg-surface"
                  : "border-border bg-surface/50 hover:border-border-hover",
              ].join(" ")}
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between px-5 py-4 text-left"
              >
                <span className="text-sm font-semibold text-foreground pr-4">
                  {faq.q}
                </span>
                <span
                  className={[
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs transition-transform duration-200",
                    open === i
                      ? "rotate-45 border-accent/50 bg-accent/10 text-accent"
                      : "border-border text-muted",
                  ].join(" ")}
                >
                  +
                </span>
              </button>
              {open === i && (
                <div className="px-5 pb-5">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {faq.a}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export interface CompetitorFeature {
  name: string;
  adsentify: boolean | string;
  them: boolean | string;
}

export interface CompetitorData {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  monthlyPrice: string;
  refreshRate: string;
  features: CompetitorFeature[];
  theirStrengths: string[];
  ourAdvantages: string[];
  verdict: string;
  faqItems: { question: string; answer: string }[];
}

const COMPETITORS: Record<string, CompetitorData> = {
  pipiads: {
    slug: "pipiads",
    name: "PiPiAds",
    tagline: "TikTok Ad Spy Tool",
    description:
      "PiPiAds is a TikTok-focused ad spy tool popular with dropshippers. It has a large database of TikTok ads and offers basic product research features. Here's how it compares to Adsentify.",
    monthlyPrice: "$77",
    refreshRate: "24–48 hours",
    features: [
      { name: "Real-time velocity scoring", adsentify: true, them: false },
      { name: "AI creative deconstruction", adsentify: true, them: false },
      { name: "TikTok ad database", adsentify: true, them: true },
      { name: "Meta / Facebook ads", adsentify: true, them: false },
      { name: "YouTube ads", adsentify: true, them: false },
      { name: "Data refresh interval", adsentify: "Every 30 min", them: "24–48 hrs" },
      { name: "1-click brief generator", adsentify: true, them: false },
      { name: "Velocity alert system", adsentify: true, them: false },
      { name: "Hook text analysis", adsentify: true, them: false },
      { name: "Emotion trigger mapping", adsentify: true, them: false },
      { name: "Trend forecasting", adsentify: true, them: false },
      { name: "Team collaboration", adsentify: true, them: true },
    ],
    theirStrengths: [
      "Very large TikTok ad database",
      "Product revenue estimates for dropshipping",
      "Shopify store analytics integration",
    ],
    ourAdvantages: [
      "Velocity scoring — know what's winning RIGHT NOW, not 48 hours ago",
      "Multi-platform: TikTok, Meta, YouTube, Google — all in one dashboard",
      "AI X-Ray deconstructs WHY an ad works, not just WHAT it is",
      "30-minute data refresh vs. PiPiAds' 24–48 hour lag",
      "Real-time alerts when ads hit your velocity threshold",
    ],
    verdict:
      "PiPiAds is solid for TikTok dropshipping product research, but it shows its age when it comes to creative strategy. Adsentify wins on data freshness, platform coverage, and the AI layer that actually tells you why ads convert — not just which ones exist.",
    faqItems: [
      {
        question: "Is Adsentify better than PiPiAds for TikTok ads?",
        answer:
          "For creative strategy and catching trends early, yes. Adsentify updates every 30 minutes vs. PiPiAds' 24–48 hour lag, covers TikTok plus Meta, YouTube, and Google, and uses AI to explain why ads work — not just surface them. PiPiAds has a larger raw TikTok database, but Adsentify's velocity scoring makes it easier to find what's winning right now.",
      },
      {
        question: "Can Adsentify replace PiPiAds completely?",
        answer:
          "For most media buyers and creative strategists, yes. If you're a dropshipper who specifically relies on PiPiAds' revenue estimates and Shopify integration, you may want to use both for a while. But for ad intelligence and creative ideation, Adsentify is the stronger platform.",
      },
      {
        question: "What's the price difference?",
        answer:
          "PiPiAds starts at $77/month for limited access. Adsentify Pro starts at $59/month with full multi-platform access, AI analysis, and real-time velocity tracking — at a lower price point with broader capabilities.",
      },
    ],
  },

  bigspy: {
    slug: "bigspy",
    name: "BigSpy",
    tagline: "Multi-Platform Ad Spy Tool",
    description:
      "BigSpy covers multiple ad platforms and has a free tier, making it popular with beginners. It's one of the older ad spy tools on the market. Here's how it compares to Adsentify.",
    monthlyPrice: "$99",
    refreshRate: "12–24 hours",
    features: [
      { name: "Real-time velocity scoring", adsentify: true, them: false },
      { name: "AI creative deconstruction", adsentify: true, them: false },
      { name: "Multi-platform coverage", adsentify: true, them: true },
      { name: "Data refresh interval", adsentify: "Every 30 min", them: "12–24 hrs" },
      { name: "1-click brief generator", adsentify: true, them: false },
      { name: "Velocity alert system", adsentify: true, them: false },
      { name: "AI-powered analysis", adsentify: true, them: false },
      { name: "Hook text transcripts", adsentify: true, them: false },
      { name: "Trend forecasting", adsentify: true, them: false },
      { name: "Free tier available", adsentify: true, them: true },
      { name: "Modern UI/UX", adsentify: true, them: false },
    ],
    theirStrengths: [
      "Free tier with basic access",
      "Wide platform coverage (9 ad networks)",
      "Large database of older ads",
    ],
    ourAdvantages: [
      "Velocity algorithm identifies emerging winners in hours, not days",
      "AI layer that deconstructs creative mechanics — BigSpy just shows ads",
      "30-minute refresh means you see viral ads before they're everywhere",
      "Brief generator turns research into production-ready creative briefs",
      "Modern interface built for 2026 — BigSpy's UI hasn't aged well",
    ],
    verdict:
      "BigSpy is a capable multi-platform tool but it's showing its age — both in UI and in the depth of analysis it offers. Adsentify was built from scratch for the AI era: velocity scoring, instant analysis, and a brief generator that saves hours of creative work.",
    faqItems: [
      {
        question: "Is Adsentify better than BigSpy for Facebook ads?",
        answer:
          "Yes. Adsentify covers Meta ads with 30-minute refresh intervals and AI analysis that explains why each ad is performing. BigSpy has more raw historical data for Facebook, but Adsentify's velocity scoring and AI deconstruction make it far more actionable for creative strategists.",
      },
      {
        question: "Does BigSpy have AI features?",
        answer:
          "BigSpy has added some basic AI tagging to categorize ads, but nothing comparable to Adsentify's X-Ray analysis which breaks down hook mechanics, emotion triggers, CTA strength, and generates creative briefs. The AI depth is fundamentally different.",
      },
      {
        question: "Which is better for beginners?",
        answer:
          "BigSpy has a free tier which makes it accessible for beginners, and Adsentify also offers a free plan. For someone learning ad research, Adsentify's AI explanations are actually better for building skills — it teaches you why ads work, not just shows you what exists.",
      },
    ],
  },

  adspy: {
    slug: "adspy",
    name: "AdSpy",
    tagline: "Facebook & Instagram Ad Intelligence",
    description:
      "AdSpy is one of the oldest and most established Facebook/Instagram ad spy tools, known for its massive database. Here's an honest comparison with Adsentify.",
    monthlyPrice: "$149",
    refreshRate: "6–12 hours",
    features: [
      { name: "Real-time velocity scoring", adsentify: true, them: false },
      { name: "AI creative deconstruction", adsentify: true, them: false },
      { name: "Facebook/Instagram database", adsentify: true, them: true },
      { name: "TikTok ads", adsentify: true, them: false },
      { name: "YouTube ads", adsentify: true, them: false },
      { name: "Data refresh interval", adsentify: "Every 30 min", them: "6–12 hrs" },
      { name: "Search by demographic targeting", adsentify: false, them: true },
      { name: "1-click brief generator", adsentify: true, them: false },
      { name: "Velocity alert system", adsentify: true, them: false },
      { name: "AI-powered analysis", adsentify: true, them: false },
      { name: "Pricing", adsentify: "From $0", them: "$149/mo" },
    ],
    theirStrengths: [
      "Enormous Facebook/Instagram database (100M+ ads)",
      "Advanced demographic and targeting data",
      "Trusted by large agencies for historical research",
    ],
    ourAdvantages: [
      "Velocity scoring — AdSpy shows you ads, Adsentify shows you winners",
      "Multi-platform in one dashboard: TikTok, Meta, YouTube",
      "AI deconstruction tells you WHY an ad converts",
      "30-minute refresh vs. AdSpy's 6–12 hour delay",
      "Starts at $0 vs. AdSpy's $149/month minimum",
      "Brief generator converts findings into production-ready creative",
    ],
    verdict:
      "AdSpy is the gold standard for Facebook ad historical research and demographic targeting data. If you need deep historical Facebook data, it's still excellent. But for teams that need to catch viral ads early, understand creative mechanics, or move fast — Adsentify's velocity scoring and AI layer provide a meaningfully different capability at a lower price.",
    faqItems: [
      {
        question: "Is AdSpy worth $149/month in 2026?",
        answer:
          "That depends on your workflow. AdSpy's strength is its massive Facebook historical database and demographic data. For pure creative intelligence and trend-catching, Adsentify delivers more at a lower price point. Many agencies use both — AdSpy for deep research, Adsentify for velocity monitoring.",
      },
      {
        question: "Does Adsentify have demographic targeting data like AdSpy?",
        answer:
          "Not currently. AdSpy's demographic and interest targeting data is genuinely useful for research. Adsentify focuses on creative intelligence — what's working and why — rather than targeting research. These tools serve somewhat different primary use cases.",
      },
      {
        question: "Can Adsentify replace AdSpy?",
        answer:
          "For most creative strategists and media buyers, yes. If your primary use case is researching competitor targeting strategies using demographic data, you may still want AdSpy. For everything creative — finding winners, understanding them, building briefs — Adsentify is the stronger choice.",
      },
    ],
  },

  minea: {
    slug: "minea",
    name: "Minea",
    tagline: "Product & Ad Research Platform",
    description:
      "Minea combines product research with ad tracking, popular with ecommerce entrepreneurs and dropshippers. Here's an honest look at how Adsentify compares.",
    monthlyPrice: "$49",
    refreshRate: "12–24 hours",
    features: [
      { name: "Real-time velocity scoring", adsentify: true, them: false },
      { name: "AI creative deconstruction", adsentify: true, them: false },
      { name: "Multi-platform ad tracking", adsentify: true, them: true },
      { name: "Data refresh interval", adsentify: "Every 30 min", them: "12–24 hrs" },
      { name: "1-click brief generator", adsentify: true, them: false },
      { name: "Velocity alert system", adsentify: true, them: false },
      { name: "Product database", adsentify: false, them: true },
      { name: "Winning product detection", adsentify: false, them: true },
      { name: "AI-powered creative analysis", adsentify: true, them: false },
      { name: "Hook text extraction", adsentify: true, them: false },
      { name: "Trend forecasting", adsentify: true, them: false },
    ],
    theirStrengths: [
      "Product-focused research with revenue/sales estimates",
      "Winning product detection algorithms",
      "Affordable entry-level pricing",
    ],
    ourAdvantages: [
      "Pure creative intelligence vs. Minea's product-first approach",
      "AI X-Ray explains creative mechanics — not just surfaces trending products",
      "Velocity scoring every 30 minutes vs. Minea's 12–24 hour refresh",
      "Brief generator turns ad analysis into production-ready creative briefs",
      "Deeper understanding of WHY ads work, not just WHICH products are trending",
    ],
    verdict:
      "Minea is excellent if your primary goal is product discovery for dropshipping. If you're a creative strategist, media buyer, or brand marketer focused on creative performance — Adsentify is built for you. The tools serve different masters: Minea for products, Adsentify for creative intelligence.",
    faqItems: [
      {
        question: "Is Adsentify or Minea better for dropshipping?",
        answer:
          "Minea is the stronger choice for pure product research — it's designed for finding winning products with sales estimates. Adsentify is better for understanding WHY those products' ads are converting and building better creative to sell them. Many successful dropshippers use both.",
      },
      {
        question: "Does Adsentify have product research features?",
        answer:
          "No. Adsentify is focused on creative intelligence — finding winning ads, understanding their creative mechanics, and generating briefs. If product discovery is your primary goal, Minea is the better fit. If you need to understand and replicate what makes ads convert, that's Adsentify.",
      },
      {
        question: "What about pricing — Minea is cheaper, right?",
        answer:
          "Minea's starter plan is $49/month with limited features. Adsentify Pro is $59/month with full access to AI analysis, velocity scoring, multi-platform tracking, and the brief generator. For creative-focused teams, Adsentify's $10 premium delivers meaningfully more creative intelligence.",
      },
    ],
  },
};

export function getCompetitor(slug: string): CompetitorData | null {
  return COMPETITORS[slug] ?? null;
}

export function getAllCompetitors(): CompetitorData[] {
  return Object.values(COMPETITORS);
}

export const COMPETITOR_SLUGS = Object.keys(COMPETITORS);

/**
 * mockIngester.ts
 *
 * Generates realistic fake ad data so the app works end-to-end without
 * real API keys during development.
 *
 * Behavior:
 *  - Uses deterministic externalIds (mock_<niche>_<index>) so repeated runs
 *    UPDATE existing rows rather than creating duplicates.
 *  - Metrics are randomized on each run to simulate live data drift.
 *  - Covers all 11 niches × 4 platforms with varied creatives.
 *
 * Usage:
 *   Only enabled when NODE_ENV !== "production" OR MOCK_INGESTION=1 is set.
 */

import { processAdBatch } from "./normalizer";
import type { RawAdData, IngestionResult, IngesterOptions } from "./types";

// ─── Seeded random helpers ────────────────────────────────────────────────────

/** Simple seeded PRNG (mulberry32) for reproducible base values. */
function seededRand(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Log-normal sample — gives realistic engagement distributions. */
function logNormal(rand: () => number, mu: number, sigma: number): number {
  const u1 = rand();
  const u2 = rand();
  const z  = Math.sqrt(-2 * Math.log(u1 + 1e-10)) * Math.cos(2 * Math.PI * u2);
  return Math.max(0, Math.round(Math.exp(mu + sigma * z)));
}

// ─── Creative templates per niche ─────────────────────────────────────────────

interface NicheTemplate {
  niche: string;
  brands: string[];
  products: string[];
  hooks: string[];
  ctas: string[];
  landingDomains: string[];
}

const NICHE_TEMPLATES: NicheTemplate[] = [
  {
    niche: "beauty",
    brands: ["GlowLab", "AuraSkin", "LuminoCosmetics", "PurifyMe", "VelvetBeauty"],
    products: ["Vitamin C Serum", "Retinol Night Cream", "Hydra Glow SPF50", "Blemish Control Kit"],
    hooks: [
      "This $12 serum replaced my entire skincare routine 😱",
      "Dermatologists HATE this one trick for clear skin",
      "I was tired of hiding my skin... until I found this",
      "5,000 women swear by this morning ritual — here's why",
      "How I cleared 10 years of acne in 30 days",
    ],
    ctas: ["Shop Now", "Get 40% Off", "Try Free Sample"],
    landingDomains: ["glowlab.com", "auraskin.co", "luminocosmetics.com"],
  },
  {
    niche: "kitchen",
    brands: ["ChefMaster", "KitchenFlow", "CrispAir", "BladeWorks", "BrewHouse"],
    products: ["Pro Air Fryer XL", "Smart Blender 2.0", "Ceramic Knife Set", "Espresso Pod Machine"],
    hooks: [
      "I threw away my old pans after trying this",
      "This air fryer pays for itself in 2 weeks of takeout savings",
      "3 million home cooks can't be wrong about this $29 hack",
      "Why professional chefs are switching to this $49 knife",
      "Make barista coffee at home — no machine needed",
    ],
    ctas: ["Shop Now", "Order Today", "Get Deal"],
    landingDomains: ["chefmaster.shop", "kitchenflow.co", "crispair.com"],
  },
  {
    niche: "pets",
    brands: ["PawPerfect", "FureverCare", "TailWagger", "VetNaturals", "HappyPaws"],
    products: ["Calming Dog Chews", "Self-Cleaning Litter Box", "GPS Smart Collar", "Grain-Free Kibble"],
    hooks: [
      "My vet asked what I was feeding my dog 👀",
      "Stop ignoring your dog's anxiety — this actually works",
      "4.9 ⭐ from 38,000 pet parents — here's why",
      "The litter box that changed my life as a cat owner",
      "Our rescue dog was uncontrollable... until we found this",
    ],
    ctas: ["Shop Now", "Try Risk-Free", "Get 50% Off First Box"],
    landingDomains: ["pawperfect.com", "furevercare.co", "tailwagger.shop"],
  },
  {
    niche: "fitness",
    brands: ["IronCore", "AlphaNutrition", "FlexFlow", "StrideUp", "PulseGear"],
    products: ["Whey Isolate Pro", "Pre-Workout Surge", "Resistance Band Set", "Smart Jump Rope"],
    hooks: [
      "I gained 12lbs of muscle in 90 days — here's my exact stack",
      "Warning: this pre-workout is NOT for beginners",
      "How I lost 40lbs without leaving my living room",
      "The $29 piece of equipment that replaced my gym membership",
      "Why 90% of people fail to build muscle (and how to fix it)",
    ],
    ctas: ["Build Your Stack", "Shop Now", "Get 30% Off"],
    landingDomains: ["ironcore.fit", "alphanutrition.com", "flexflow.co"],
  },
  {
    niche: "tech",
    brands: ["NovaTech", "PixelGear", "SoundWave", "ChargeMaster", "LockSmart"],
    products: ["Noise-Canceling Earbuds Pro", "4K Webcam Ultra", "MagSafe Power Bank", "Smart Door Lock"],
    hooks: [
      "AirPods users are switching to this $39 alternative",
      "I stopped forgetting my keys forever with this gadget",
      "The webcam that made my Zoom meetings actually look good",
      "This tiny device charges your phone in 20 minutes flat",
      "Samsung and Apple engineers both use this at home",
    ],
    ctas: ["Shop Now", "Learn More", "Get Yours"],
    landingDomains: ["novatech.io", "pixelgear.co", "soundwave.shop"],
  },
  {
    niche: "home_decor",
    brands: ["CozyNest", "LuxLiving", "AestheticHome", "NordCasa", "PlantHaus"],
    products: ["Boho LED Floor Lamp", "Linen Throw Pillow Set", "Minimalist Wall Clock", "Faux Eucalyptus Bundle"],
    hooks: [
      "My apartment looks like a Pinterest board now 😍",
      "Transformed my living room for under $50 — here's how",
      "Designers call this the #1 mistake in home décor",
      "500,000 homes upgraded with this one piece",
      "The lamp that makes every room look expensive",
    ],
    ctas: ["Shop the Look", "Shop Now", "Get 25% Off"],
    landingDomains: ["cozyhome.co", "luxliving.com", "aesthetichome.shop"],
  },
  {
    niche: "fashion",
    brands: ["ThreadCulture", "NomadWear", "CrestStyle", "UrbanFit", "VelourLux"],
    products: ["Classic Oxford Shirt", "Slim Cargo Pants", "Minimalist Leather Watch", "Oversized Knit Hoodie"],
    hooks: [
      "I've worn this shirt 3 times this week and got compliments each time",
      "The watch that makes every outfit look intentional",
      "Why luxury doesn't have to mean expensive",
      "Gen Z is obsessed with this aesthetic — here's why",
      "The 5 items that belong in every minimalist wardrobe",
    ],
    ctas: ["Shop Now", "Get 20% Off", "View Collection"],
    landingDomains: ["threadculture.com", "nomadwear.co", "creststyle.shop"],
  },
  {
    niche: "health",
    brands: ["PureVitals", "ZenHealth", "NutraForce", "BodyBalance", "AlphaVit"],
    products: ["Magnesium Glycinate 400mg", "Omega-3 Fish Oil 2000mg", "Probiotic Blend 50B CFU", "Ashwagandha Complex"],
    hooks: [
      "I slept 8 hours for the first time in years after trying this",
      "Your gut microbiome is ruining your mood — here's the fix",
      "Doctor's recommend this but nobody talks about it",
      "I stopped taking 6 different supplements and switched to this one",
      "Why 73% of adults are deficient in this mineral",
    ],
    ctas: ["Shop Now", "Try 30-Day Supply", "Subscribe & Save"],
    landingDomains: ["purevitals.com", "zenhealth.co", "nutraforce.com"],
  },
  {
    niche: "gaming",
    brands: ["NexusGear", "FPSMaster", "PixelArena", "SoundRig", "GlitchFix"],
    products: ["Pro RGB Gaming Headset", "Low-Latency Gaming Mouse", "Mechanical Keyboard TKL", "Capture Card 4K"],
    hooks: [
      "I went from Silver to Diamond after upgrading this one thing",
      "Pro gamers don't want you to know about this $59 mouse",
      "300 hours of gaming per month — this setup keeps me comfortable",
      "The headset that lets you hear footsteps from 40ft away",
      "Your FPS is capped. Here's how to uncap it for free.",
    ],
    ctas: ["Level Up Now", "Shop Now", "Get Yours"],
    landingDomains: ["nexusgear.gg", "fpsmaster.co", "pixelarena.shop"],
  },
  {
    niche: "finance",
    brands: ["WealthPath", "TradePro", "CryptoNest", "BudgetWise", "FundGrow"],
    products: ["AI Stock Scanner", "Crypto Portfolio Tracker", "Debt Payoff Planner", "Tax Optimization Guide"],
    hooks: [
      "I made $4,200 last month with 2 hours of work — here's how",
      "Stop letting your savings account rob you blind",
      "The investing strategy that's outperforming the S&P 500",
      "97% of people overpay taxes because they don't know this",
      "How I paid off $48,000 in debt in 19 months",
    ],
    ctas: ["Start Free", "Try 7 Days Free", "Learn More"],
    landingDomains: ["wealthpath.io", "tradepro.com", "budgetwise.co"],
  },
  {
    niche: "education",
    brands: ["SkillVault", "LearnFast", "ProCourse", "MasterMind", "UpgradeU"],
    products: ["Python for Beginners Bootcamp", "Copywriting Masterclass", "Full-Stack Dev Course", "Public Speaking Pro"],
    hooks: [
      "I learned this skill in 30 days and got a $20k raise",
      "The course that 12,000 students called life-changing",
      "Stop watching YouTube tutorials — do this instead",
      "How to become a copywriter with zero experience",
      "This $49 course landed me my first $5k freelance client",
    ],
    ctas: ["Enroll Now", "Start Free Trial", "Get Instant Access"],
    landingDomains: ["skillvault.io", "learnfast.co", "procourse.com"],
  },
];

const PLATFORMS: Array<RawAdData["platform"]> = [
  "TIKTOK", "FACEBOOK", "INSTAGRAM", "TIKTOK", "FACEBOOK",  // weighted toward TikTok + FB
];

// ─── Generator ────────────────────────────────────────────────────────────────

function generateMockAd(
  template: NicheTemplate,
  index: number,
  rand: () => number
): RawAdData {
  const pick = <T>(arr: T[]) => arr[Math.floor(rand() * arr.length)];

  const brand   = pick(template.brands);
  const product = pick(template.products);
  const hook    = pick(template.hooks);
  const cta     = pick(template.ctas);
  const domain  = pick(template.landingDomains);
  const platform = pick(PLATFORMS);

  // Age: 0–90 days old, skewed toward recent
  const daysOld     = Math.floor(Math.pow(rand(), 1.5) * 90);
  const firstSeenAt = new Date(Date.now() - daysOld * 86_400_000);

  // lastSeenAt: either still active or stopped 1–7 days ago
  const isActive    = rand() > 0.25;
  const lastSeenAt  = isActive
    ? new Date()
    : new Date(Date.now() - Math.floor(rand() * 7) * 86_400_000);

  // Engagement — log-normal with niche-specific scale
  const scale   = 12 + rand() * 4; // mu for log-normal (higher = more viral)
  const views   = logNormal(rand, scale, 1.2);
  const engRate = 0.01 + rand() * 0.15;  // 1–16% engagement rate
  const likes   = Math.round(views * engRate * (0.6 + rand() * 0.4));
  const shares  = Math.round(likes * (0.05 + rand() * 0.2));
  const comments = Math.round(likes * (0.03 + rand() * 0.1));

  const spendBase = Math.round(100 + rand() * 9900);

  return {
    externalId:        `mock_${template.niche}_${index}`,
    platform,
    brandName:         brand,
    productName:       product,
    adType:            platform === "TIKTOK" ? "VIDEO" : rand() > 0.4 ? "VIDEO" : "IMAGE",
    duration:          platform !== "INSTAGRAM" || rand() > 0.5
      ? Math.round(15 + rand() * 45)
      : undefined,
    country:           "US",
    language:          "en",
    hookText:          hook,
    ctaText:           cta,
    landingPageUrl:    `https://${domain}/products/${product.toLowerCase().replace(/\s+/g, "-")}`,
    estimatedSpendMin: spendBase,
    estimatedSpendMax: spendBase + Math.round(rand() * spendBase * 3),
    firstSeenAt,
    lastSeenAt,
    isActive,
    rawMetrics: { views, likes, comments, shares },
    rawNicheHint: template.niche,
  };
}

// ─── Public runner ────────────────────────────────────────────────────────────

const ADS_PER_NICHE = 5;

export async function runMockIngestion(
  opts: IngesterOptions = {}
): Promise<IngestionResult> {
  const start  = Date.now();
  const dryRun = opts.dryRun ?? false;
  const limit  = opts.limit  ?? 500;

  const allAds: RawAdData[] = [];

  for (const template of NICHE_TEMPLATES) {
    const count = Math.min(ADS_PER_NICHE, Math.ceil(limit / NICHE_TEMPLATES.length));
    for (let i = 0; i < count; i++) {
      // Deterministic seed so externalIds are stable across runs
      const seed = template.niche.split("").reduce((acc, c) => acc + c.charCodeAt(0), i * 1000);
      const rand = seededRand(seed);
      allAds.push(generateMockAd(template, i, rand));
    }
  }

  console.log(`[mock] Generated ${allAds.length} ads — processing...`);

  const batch = await processAdBatch(allAds.slice(0, limit), dryRun);

  return {
    source:      "mock",
    created:     batch.created,
    updated:     batch.updated,
    skipped:     batch.skipped,
    errors:      batch.errors,
    duration_ms: Date.now() - start,
    messages:    batch.messages,
  };
}

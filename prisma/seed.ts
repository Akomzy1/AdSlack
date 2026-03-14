import {
  PrismaClient,
  Platform,
  AdType,
  HookType,
  CtaType,
  FunnelType,
  AdStatus,
  RemixType,
  UserRole,
} from "@prisma/client";

const db = new PrismaClient();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function randFloat(min: number, max: number, dp = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(dp));
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ─── Seed Data ───────────────────────────────────────────────────────────────

const ADS_SEED = [
  // ── E-commerce / Skincare ────────────────────────────────────────────────
  {
    platform: Platform.FACEBOOK,
    externalId: "fb_001_skincare_serum",
    brandName: "GlowLab",
    productName: "Vitamin C Brightening Serum",
    niche: "skincare",
    adType: AdType.VIDEO,
    duration: 30,
    country: "US",
    language: "en",
    hookText: "Why are dermatologists calling this the 'lazy girl's skincare secret'?",
    hookType: HookType.CURIOSITY_GAP,
    ctaText: "Shop Now – 40% Off",
    ctaType: CtaType.SHOP_NOW,
    thumbnailUrl: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400",
    landingPageUrl: "https://glowlab.com/serum",
    estimatedSpendMin: 5000,
    estimatedSpendMax: 15000,
    firstSeenAt: daysAgo(42),
    lastSeenAt: daysAgo(1),
    daysRunning: 41,
    isActive: true,
    status: AdStatus.CLASSIFIED,
  },
  {
    platform: Platform.INSTAGRAM,
    externalId: "ig_002_skincare_moisturizer",
    brandName: "DermaClear",
    productName: "Barrier Repair Moisturizer",
    niche: "skincare",
    adType: AdType.CAROUSEL,
    duration: null,
    country: "US",
    language: "en",
    hookText: "Your skin barrier is broken — here's how to fix it in 7 days",
    hookType: HookType.PAIN_POINT,
    ctaText: "Learn More",
    ctaType: CtaType.LEARN_MORE,
    thumbnailUrl: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400",
    landingPageUrl: "https://dermaclear.com/barrier",
    estimatedSpendMin: 2000,
    estimatedSpendMax: 8000,
    firstSeenAt: daysAgo(18),
    lastSeenAt: daysAgo(0),
    daysRunning: 18,
    isActive: true,
    status: AdStatus.ENRICHED,
  },

  // ── Health & Supplements ─────────────────────────────────────────────────
  {
    platform: Platform.TIKTOK,
    externalId: "tt_003_health_collagen",
    brandName: "VitalPure",
    productName: "Marine Collagen Powder",
    niche: "health",
    adType: AdType.VIDEO,
    duration: 45,
    country: "US",
    language: "en",
    hookText: "I took collagen every morning for 90 days — this happened to my skin",
    hookType: HookType.STORY,
    ctaText: "Try Free",
    ctaType: CtaType.TRY_FREE,
    thumbnailUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400",
    landingPageUrl: "https://vitalpure.com/collagen-trial",
    estimatedSpendMin: 8000,
    estimatedSpendMax: 25000,
    firstSeenAt: daysAgo(60),
    lastSeenAt: daysAgo(2),
    daysRunning: 58,
    isActive: true,
    status: AdStatus.CLASSIFIED,
  },
  {
    platform: Platform.FACEBOOK,
    externalId: "fb_004_health_sleep",
    brandName: "SleepWell",
    productName: "Magnesium Sleep Formula",
    niche: "health",
    adType: AdType.VIDEO,
    duration: 60,
    country: "US",
    language: "en",
    hookText: "Doctors don't want you to know this $12 sleep trick",
    hookType: HookType.BOLD_CLAIM,
    ctaText: "Get Offer",
    ctaType: CtaType.GET_OFFER,
    thumbnailUrl: "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=400",
    landingPageUrl: "https://sleepwell.com/magnesium",
    estimatedSpendMin: 15000,
    estimatedSpendMax: 50000,
    firstSeenAt: daysAgo(90),
    lastSeenAt: daysAgo(0),
    daysRunning: 90,
    isActive: true,
    status: AdStatus.CLASSIFIED,
  },

  // ── Fitness ──────────────────────────────────────────────────────────────
  {
    platform: Platform.TIKTOK,
    externalId: "tt_005_fitness_app",
    brandName: "FitFlow",
    productName: "AI Personal Trainer App",
    niche: "fitness",
    adType: AdType.VIDEO,
    duration: 28,
    country: "US",
    language: "en",
    hookText: "This AI built me a workout plan in 30 seconds — and it actually worked",
    hookType: HookType.SOCIAL_PROOF,
    ctaText: "Download",
    ctaType: CtaType.DOWNLOAD,
    thumbnailUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400",
    landingPageUrl: "https://fitflow.app/download",
    estimatedSpendMin: 3000,
    estimatedSpendMax: 10000,
    firstSeenAt: daysAgo(12),
    lastSeenAt: daysAgo(0),
    daysRunning: 12,
    isActive: true,
    status: AdStatus.ENRICHED,
  },
  {
    platform: Platform.INSTAGRAM,
    externalId: "ig_006_fitness_equipment",
    brandName: "IronEdge",
    productName: "Compact Home Gym System",
    niche: "fitness",
    adType: AdType.VIDEO,
    duration: 35,
    country: "US",
    language: "en",
    hookText: "Wait — a full gym in 6 square feet?",
    hookType: HookType.PATTERN_INTERRUPT,
    ctaText: "Shop Now",
    ctaType: CtaType.SHOP_NOW,
    thumbnailUrl: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400",
    landingPageUrl: "https://ironedge.com/home-gym",
    estimatedSpendMin: 10000,
    estimatedSpendMax: 30000,
    firstSeenAt: daysAgo(35),
    lastSeenAt: daysAgo(1),
    daysRunning: 34,
    isActive: true,
    status: AdStatus.CLASSIFIED,
  },

  // ── SaaS / Software ──────────────────────────────────────────────────────
  {
    platform: Platform.FACEBOOK,
    externalId: "fb_007_saas_accounting",
    brandName: "ClearBooks",
    productName: "AI Bookkeeping Software",
    niche: "saas",
    adType: AdType.VIDEO,
    duration: 60,
    country: "US",
    language: "en",
    hookText: "Small business owners: stop wasting 8 hours a month on bookkeeping",
    hookType: HookType.PAIN_POINT,
    ctaText: "Try Free",
    ctaType: CtaType.TRY_FREE,
    thumbnailUrl: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400",
    landingPageUrl: "https://clearbooks.com/trial",
    estimatedSpendMin: 20000,
    estimatedSpendMax: 75000,
    firstSeenAt: daysAgo(120),
    lastSeenAt: daysAgo(0),
    daysRunning: 120,
    isActive: true,
    status: AdStatus.CLASSIFIED,
  },
  {
    platform: Platform.YOUTUBE,
    externalId: "yt_008_saas_crm",
    brandName: "PipelineHQ",
    productName: "Sales CRM for Startups",
    niche: "saas",
    adType: AdType.VIDEO,
    duration: 90,
    country: "US",
    language: "en",
    hookText: "How one startup closed $2M in deals without a sales team",
    hookType: HookType.SOCIAL_PROOF,
    ctaText: "Sign Up",
    ctaType: CtaType.SIGN_UP,
    thumbnailUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400",
    landingPageUrl: "https://pipelinehq.com/signup",
    estimatedSpendMin: 30000,
    estimatedSpendMax: 100000,
    firstSeenAt: daysAgo(75),
    lastSeenAt: daysAgo(3),
    daysRunning: 72,
    isActive: true,
    status: AdStatus.CLASSIFIED,
  },

  // ── Fashion / Apparel ────────────────────────────────────────────────────
  {
    platform: Platform.TIKTOK,
    externalId: "tt_009_fashion_jeans",
    brandName: "StitchForm",
    productName: "Sculpting High-Rise Jeans",
    niche: "fashion",
    adType: AdType.VIDEO,
    duration: 22,
    country: "US",
    language: "en",
    hookText: "The jeans that went viral for a reason — watch until the end",
    hookType: HookType.CURIOSITY_GAP,
    ctaText: "Shop Now",
    ctaType: CtaType.SHOP_NOW,
    thumbnailUrl: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400",
    landingPageUrl: "https://stitchform.com/jeans",
    estimatedSpendMin: 4000,
    estimatedSpendMax: 12000,
    firstSeenAt: daysAgo(8),
    lastSeenAt: daysAgo(0),
    daysRunning: 8,
    isActive: true,
    status: AdStatus.ENRICHED,
  },
  {
    platform: Platform.INSTAGRAM,
    externalId: "ig_010_fashion_sustainable",
    brandName: "Verdure",
    productName: "Sustainable Basics Collection",
    niche: "fashion",
    adType: AdType.CAROUSEL,
    duration: null,
    country: "US",
    language: "en",
    hookText: "Fashion shouldn't cost the planet. Meet your new wardrobe staples.",
    hookType: HookType.BOLD_CLAIM,
    ctaText: "Shop Now",
    ctaType: CtaType.SHOP_NOW,
    thumbnailUrl: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400",
    landingPageUrl: "https://verdure.com/basics",
    estimatedSpendMin: 2500,
    estimatedSpendMax: 7500,
    firstSeenAt: daysAgo(22),
    lastSeenAt: daysAgo(2),
    daysRunning: 20,
    isActive: true,
    status: AdStatus.ENRICHED,
  },

  // ── Pet Products ─────────────────────────────────────────────────────────
  {
    platform: Platform.FACEBOOK,
    externalId: "fb_011_pets_food",
    brandName: "PawNourish",
    productName: "Grain-Free Dog Food",
    niche: "pets",
    adType: AdType.VIDEO,
    duration: 40,
    country: "US",
    language: "en",
    hookText: "Vets are shocked by what's actually in your dog's food",
    hookType: HookType.FEAR,
    ctaText: "Get Offer",
    ctaType: CtaType.GET_OFFER,
    thumbnailUrl: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400",
    landingPageUrl: "https://pawnourish.com/trial",
    estimatedSpendMin: 12000,
    estimatedSpendMax: 40000,
    firstSeenAt: daysAgo(55),
    lastSeenAt: daysAgo(1),
    daysRunning: 54,
    isActive: true,
    status: AdStatus.CLASSIFIED,
  },
  {
    platform: Platform.TIKTOK,
    externalId: "tt_012_pets_toy",
    brandName: "BarkBox",
    productName: "Interactive Puzzle Toy",
    niche: "pets",
    adType: AdType.VIDEO,
    duration: 18,
    country: "US",
    language: "en",
    hookText: "My dog lost his mind when I showed him this…",
    hookType: HookType.PATTERN_INTERRUPT,
    ctaText: "Shop Now",
    ctaType: CtaType.SHOP_NOW,
    thumbnailUrl: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400",
    landingPageUrl: "https://barkbox.com/puzzle-toy",
    estimatedSpendMin: 6000,
    estimatedSpendMax: 18000,
    firstSeenAt: daysAgo(4),
    lastSeenAt: daysAgo(0),
    daysRunning: 4,
    isActive: true,
    status: AdStatus.RAW,
  },

  // ── Home & Kitchen ───────────────────────────────────────────────────────
  {
    platform: Platform.FACEBOOK,
    externalId: "fb_013_home_blender",
    brandName: "NutriBlend",
    productName: "Professional Blender Pro",
    niche: "home",
    adType: AdType.VIDEO,
    duration: 50,
    country: "US",
    language: "en",
    hookText: "How I make restaurant-quality smoothies for $1.20 a day",
    hookType: HookType.TUTORIAL,
    ctaText: "Shop Now",
    ctaType: CtaType.SHOP_NOW,
    thumbnailUrl: "https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=400",
    landingPageUrl: "https://nutriblend.com/pro",
    estimatedSpendMin: 8000,
    estimatedSpendMax: 22000,
    firstSeenAt: daysAgo(48),
    lastSeenAt: daysAgo(2),
    daysRunning: 46,
    isActive: true,
    status: AdStatus.CLASSIFIED,
  },
  {
    platform: Platform.INSTAGRAM,
    externalId: "ig_014_home_organizer",
    brandName: "TidySpace",
    productName: "Stackable Drawer Organizers",
    niche: "home",
    adType: AdType.CAROUSEL,
    duration: null,
    country: "US",
    language: "en",
    hookText: "Before & after: this $29 organizer changed my entire kitchen",
    hookType: HookType.SOCIAL_PROOF,
    ctaText: "Shop Now",
    ctaType: CtaType.SHOP_NOW,
    thumbnailUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400",
    landingPageUrl: "https://tidyspace.com/organizers",
    estimatedSpendMin: 1500,
    estimatedSpendMax: 5000,
    firstSeenAt: daysAgo(15),
    lastSeenAt: daysAgo(0),
    daysRunning: 15,
    isActive: true,
    status: AdStatus.ENRICHED,
  },

  // ── Finance & Investing ──────────────────────────────────────────────────
  {
    platform: Platform.YOUTUBE,
    externalId: "yt_015_finance_app",
    brandName: "WealthPath",
    productName: "Automated Investing App",
    niche: "finance",
    adType: AdType.VIDEO,
    duration: 120,
    country: "US",
    language: "en",
    hookText: "I invested $50/month for 3 years — here's what my portfolio looks like",
    hookType: HookType.STORY,
    ctaText: "Sign Up",
    ctaType: CtaType.SIGN_UP,
    thumbnailUrl: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400",
    landingPageUrl: "https://wealthpath.com/signup",
    estimatedSpendMin: 25000,
    estimatedSpendMax: 80000,
    firstSeenAt: daysAgo(180),
    lastSeenAt: daysAgo(0),
    daysRunning: 180,
    isActive: true,
    status: AdStatus.CLASSIFIED,
  },
  {
    platform: Platform.FACEBOOK,
    externalId: "fb_016_finance_card",
    brandName: "ZeroFee",
    productName: "No-Fee Cash Back Credit Card",
    niche: "finance",
    adType: AdType.IMAGE,
    duration: null,
    country: "US",
    language: "en",
    hookText: "Your credit card is charging you hidden fees. Ours doesn't.",
    hookType: HookType.PAIN_POINT,
    ctaText: "Learn More",
    ctaType: CtaType.LEARN_MORE,
    thumbnailUrl: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400",
    landingPageUrl: "https://zerofee.com/card",
    estimatedSpendMin: 50000,
    estimatedSpendMax: 150000,
    firstSeenAt: daysAgo(200),
    lastSeenAt: daysAgo(0),
    daysRunning: 200,
    isActive: true,
    status: AdStatus.CLASSIFIED,
  },

  // ── Online Education ─────────────────────────────────────────────────────
  {
    platform: Platform.TIKTOK,
    externalId: "tt_017_education_coding",
    brandName: "CodeShift",
    productName: "30-Day Web Dev Bootcamp",
    niche: "education",
    adType: AdType.VIDEO,
    duration: 55,
    country: "US",
    language: "en",
    hookText: "I had zero coding experience. 6 months later I landed a $95k job.",
    hookType: HookType.SOCIAL_PROOF,
    ctaText: "Learn More",
    ctaType: CtaType.LEARN_MORE,
    thumbnailUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400",
    landingPageUrl: "https://codeshift.com/bootcamp",
    estimatedSpendMin: 7000,
    estimatedSpendMax: 20000,
    firstSeenAt: daysAgo(30),
    lastSeenAt: daysAgo(1),
    daysRunning: 29,
    isActive: true,
    status: AdStatus.CLASSIFIED,
  },
  {
    platform: Platform.YOUTUBE,
    externalId: "yt_018_education_spanish",
    brandName: "LinguaFlow",
    productName: "AI Language Learning Platform",
    niche: "education",
    adType: AdType.VIDEO,
    duration: 75,
    country: "US",
    language: "en",
    hookText: "The question that stumped every language teacher I asked",
    hookType: HookType.CURIOSITY_GAP,
    ctaText: "Try Free",
    ctaType: CtaType.TRY_FREE,
    thumbnailUrl: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=400",
    landingPageUrl: "https://linguaflow.com/trial",
    estimatedSpendMin: 18000,
    estimatedSpendMax: 60000,
    firstSeenAt: daysAgo(90),
    lastSeenAt: daysAgo(0),
    daysRunning: 90,
    isActive: true,
    status: AdStatus.CLASSIFIED,
  },

  // ── Travel ───────────────────────────────────────────────────────────────
  {
    platform: Platform.INSTAGRAM,
    externalId: "ig_019_travel_luggage",
    brandName: "PackRight",
    productName: "Smart Carry-On Luggage",
    niche: "travel",
    adType: AdType.VIDEO,
    duration: 25,
    country: "US",
    language: "en",
    hookText: "Airlines hate this bag (because it fits EVERYTHING)",
    hookType: HookType.PATTERN_INTERRUPT,
    ctaText: "Shop Now",
    ctaType: CtaType.SHOP_NOW,
    thumbnailUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400",
    landingPageUrl: "https://packright.com/carry-on",
    estimatedSpendMin: 9000,
    estimatedSpendMax: 28000,
    firstSeenAt: daysAgo(25),
    lastSeenAt: daysAgo(0),
    daysRunning: 25,
    isActive: true,
    status: AdStatus.ENRICHED,
  },
  {
    platform: Platform.FACEBOOK,
    externalId: "fb_020_travel_insurance",
    brandName: "SafeTrip",
    productName: "Comprehensive Travel Insurance",
    niche: "travel",
    adType: AdType.IMAGE,
    duration: null,
    country: "US",
    language: "en",
    hookText: "One in 6 travelers experiences a travel emergency. Are you covered?",
    hookType: HookType.FEAR,
    ctaText: "Get Offer",
    ctaType: CtaType.GET_OFFER,
    thumbnailUrl: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=400",
    landingPageUrl: "https://safetrip.com/quote",
    estimatedSpendMin: 35000,
    estimatedSpendMax: 90000,
    firstSeenAt: daysAgo(150),
    lastSeenAt: daysAgo(1),
    daysRunning: 149,
    isActive: true,
    status: AdStatus.CLASSIFIED,
  },
];

// ─── Anatomy data for classified ads ─────────────────────────────────────────

const ANATOMY_MAP: Record<string, {
  hookScore: number;
  emotionalTriggers: string[];
  funnelType: FunnelType;
  audioMood: string;
  colorPalette: { dominant: string[]; accent: string; mood: string };
  scriptStructure: { hook: string; problem: string; demo: string; proof: string; cta: string };
  targetPsychology: string;
}> = {
  fb_001_skincare_serum: {
    hookScore: 87,
    emotionalTriggers: ["curiosity", "aspiration", "trust"],
    funnelType: FunnelType.DIRECT_RESPONSE,
    audioMood: "upbeat_optimistic",
    colorPalette: { dominant: ["#f5e6d3", "#ffffff", "#2d2d2d"], accent: "#d4a96a", mood: "clean_luxury" },
    scriptStructure: { hook: "0–3s curiosity question", problem: "3–8s skin dullness pain", demo: "8–22s product application", proof: "22–27s before/after + testimonial", cta: "27–30s offer + urgency" },
    targetPsychology: "Women 25–45 aspiring to effortless skincare routines. Motivated by social proof from authority figures (dermatologists). Price-sensitive but willing to invest for proven results.",
  },
  tt_003_health_collagen: {
    hookScore: 91,
    emotionalTriggers: ["aspiration", "curiosity", "social_proof"],
    funnelType: FunnelType.CONTENT_FIRST,
    audioMood: "inspiring_motivational",
    colorPalette: { dominant: ["#1a1a2e", "#e94560", "#ffffff"], accent: "#e94560", mood: "bold_energetic" },
    scriptStructure: { hook: "0–5s transformation reveal", problem: "5–15s aging/skin concerns", demo: "15–30s daily routine UGC", proof: "30–40s results + community", cta: "40–45s trial offer" },
    targetPsychology: "Health-conscious women 30–55. TikTok-native audience responds to authentic UGC over polished ads. 90-day timeframe reduces commitment anxiety.",
  },
  fb_004_health_sleep: {
    hookScore: 78,
    emotionalTriggers: ["fear", "curiosity", "authority"],
    funnelType: FunnelType.DIRECT_RESPONSE,
    audioMood: "calm_reassuring",
    colorPalette: { dominant: ["#0d1b2a", "#1b4965", "#cae9ff"], accent: "#5fa8d3", mood: "calm_trusted" },
    scriptStructure: { hook: "0–5s authority claim", problem: "5–20s sleep deprivation consequences", demo: "20–45s mechanism explanation", proof: "45–55s testimonials", cta: "55–60s discount urgency" },
    targetPsychology: "Adults 35–65 suffering from chronic sleep issues. Authority framing ('doctors') builds credibility. Fear-based opening creates urgency while solution provides relief.",
  },
  fb_007_saas_accounting: {
    hookScore: 83,
    emotionalTriggers: ["pain_relief", "time_savings", "trust"],
    funnelType: FunnelType.LEAD_GEN,
    audioMood: "professional_confident",
    colorPalette: { dominant: ["#ffffff", "#f3f4f6", "#111827"], accent: "#3b82f6", mood: "clean_professional" },
    scriptStructure: { hook: "0–5s time waste pain point", problem: "5–20s bookkeeping frustration", demo: "20–45s software walkthrough", proof: "45–55s customer results", cta: "55–60s free trial CTA" },
    targetPsychology: "Small business owners and freelancers overwhelmed by financial admin. Time is the primary value prop, not price. Free trial lowers commitment barrier significantly.",
  },
  yt_008_saas_crm: {
    hookScore: 89,
    emotionalTriggers: ["aspiration", "social_proof", "curiosity"],
    funnelType: FunnelType.CONTENT_FIRST,
    audioMood: "inspirational_corporate",
    colorPalette: { dominant: ["#0f172a", "#334155", "#f8fafc"], accent: "#6366f1", mood: "ambitious_modern" },
    scriptStructure: { hook: "0–10s dramatic result reveal", problem: "10–30s traditional sales team costs", demo: "30–60s product walkthrough", proof: "60–80s case study stats", cta: "80–90s signup offer" },
    targetPsychology: "Founders and sales leaders 28–45 looking to scale revenue efficiently. Aspirational framing ($2M result) captures attention; detailed demo builds purchase confidence.",
  },
  yt_015_finance_app: {
    hookScore: 92,
    emotionalTriggers: ["aspiration", "trust", "social_proof", "curiosity"],
    funnelType: FunnelType.CONTENT_FIRST,
    audioMood: "calm_trustworthy",
    colorPalette: { dominant: ["#064e3b", "#d1fae5", "#111827"], accent: "#10b981", mood: "prosperity_grounded" },
    scriptStructure: { hook: "0–10s personal story hook", problem: "10–30s investing complexity barrier", demo: "30–80s app demonstration", proof: "80–110s portfolio growth reveal", cta: "110–120s signup urgency" },
    targetPsychology: "Young adults 22–38 who feel investing is intimidating. Story-first format builds emotional connection. $50/month entry point removes financial anxiety.",
  },
  fb_016_finance_card: {
    hookScore: 74,
    emotionalTriggers: ["anger", "fairness", "relief"],
    funnelType: FunnelType.DIRECT_RESPONSE,
    audioMood: "assertive_direct",
    colorPalette: { dominant: ["#0f172a", "#1e293b", "#f59e0b"], accent: "#f59e0b", mood: "premium_bold" },
    scriptStructure: { hook: "0s bold accusation statement", problem: "problem: hidden fee revelation", demo: "demo: card feature walkthrough", proof: "proof: savings calculator", cta: "cta: apply now + bonus" },
    targetPsychology: "Adults 25–55 frustrated with banking fees. Anger trigger at existing relationship drives switching intent. Clear savings messaging justifies the switch decision.",
  },
  fb_020_travel_insurance: {
    hookScore: 71,
    emotionalTriggers: ["fear", "protection", "peace_of_mind"],
    funnelType: FunnelType.LEAD_GEN,
    audioMood: "serious_reassuring",
    colorPalette: { dominant: ["#1e3a5f", "#ffffff", "#e8f4f8"], accent: "#2196f3", mood: "trustworthy_secure" },
    scriptStructure: { hook: "0s fear statistic", problem: "problem: uninsured emergency scenarios", demo: "demo: coverage explanation", proof: "proof: claim success stories", cta: "cta: instant quote" },
    targetPsychology: "Frequent travelers 35–65 who are risk-averse. Fear-based statistics create urgency. 'Instant quote' removes purchase friction and drives immediate action.",
  },
};

// ─── Main seed function ───────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding Adslack database...\n");

  // ── Seed demo users ────────────────────────────────────────────────────────
  console.log("👤 Creating demo users...");

  const users = await Promise.all([
    db.user.upsert({
      where: { email: "admin@adslack.com" },
      update: {},
      create: {
        email: "admin@adslack.com",
        name: "Alex Admin",
        role: UserRole.AGENCY,
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=admin",
      },
    }),
    db.user.upsert({
      where: { email: "pro@adslack.com" },
      update: {},
      create: {
        email: "pro@adslack.com",
        name: "Pat Pro",
        role: UserRole.PRO,
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=pro",
      },
    }),
    db.user.upsert({
      where: { email: "free@adslack.com" },
      update: {},
      create: {
        email: "free@adslack.com",
        name: "Fran Free",
        role: UserRole.FREE,
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=free",
      },
    }),
  ]);

  console.log(`   ✓ ${users.length} users created\n`);

  // ── Seed ads ───────────────────────────────────────────────────────────────
  console.log("📢 Creating 20 sample ads...");

  const createdAds: { id: string; externalId: string }[] = [];

  for (const adData of ADS_SEED) {
    const ad = await db.ad.upsert({
      where: { externalId: adData.externalId },
      update: {},
      create: adData,
    });
    createdAds.push({ id: ad.id, externalId: ad.externalId });
  }

  console.log(`   ✓ ${createdAds.length} ads created\n`);

  // ── Seed metrics ───────────────────────────────────────────────────────────
  console.log("📊 Creating ad metrics...");

  let metricsCount = 0;
  for (const { id: adId } of createdAds) {
    // Create 3 metric snapshots per ad (simulating historical data)
    const snapshots = [
      { daysBack: 7, multiplier: 0.4 },
      { daysBack: 3, multiplier: 0.7 },
      { daysBack: 0, multiplier: 1.0 },
    ];

    for (const { daysBack, multiplier } of snapshots) {
      const recordedAt = daysAgo(daysBack);
      await db.adMetrics.create({
        data: {
          adId,
          views: BigInt(Math.floor(randInt(10000, 5000000) * multiplier)),
          likes: BigInt(Math.floor(randInt(500, 200000) * multiplier)),
          comments: BigInt(Math.floor(randInt(50, 20000) * multiplier)),
          shares: BigInt(Math.floor(randInt(100, 50000) * multiplier)),
          earlyVelocityScore: randFloat(0.5, 4.8),
          recordedAt,
        },
      });
      metricsCount++;
    }
  }

  console.log(`   ✓ ${metricsCount} metric snapshots created\n`);

  // ── Seed anatomy for classified ads ───────────────────────────────────────
  console.log("🧠 Creating AI anatomy breakdowns...");

  let anatomyCount = 0;
  for (const { id: adId, externalId } of createdAds) {
    const anatomy = ANATOMY_MAP[externalId];
    if (!anatomy) continue;

    await db.adAnatomy.upsert({
      where: { adId },
      update: {},
      create: {
        adId,
        hookScore: anatomy.hookScore,
        emotionalTriggers: anatomy.emotionalTriggers,
        funnelType: anatomy.funnelType,
        audioMood: anatomy.audioMood,
        colorPalette: anatomy.colorPalette,
        scriptStructure: anatomy.scriptStructure,
        targetPsychology: anatomy.targetPsychology,
        aiModel: "claude-opus-4-6",
        generatedAt: new Date(),
      },
    });
    anatomyCount++;
  }

  console.log(`   ✓ ${anatomyCount} anatomy breakdowns created\n`);

  // ── Seed folders + saved ads for admin user ────────────────────────────────
  console.log("📁 Creating folders and saved ads...");

  const adminUser = users[0]!;
  const folders = await Promise.all([
    db.folder.upsert({
      where: { userId_name: { userId: adminUser.id, name: "Skincare Winning Ads" } },
      update: {},
      create: { userId: adminUser.id, name: "Skincare Winning Ads" },
    }),
    db.folder.upsert({
      where: { userId_name: { userId: adminUser.id, name: "SaaS Inspiration" } },
      update: {},
      create: { userId: adminUser.id, name: "SaaS Inspiration" },
    }),
    db.folder.upsert({
      where: { userId_name: { userId: adminUser.id, name: "High Spend > $50k" } },
      update: {},
      create: { userId: adminUser.id, name: "High Spend > $50k" },
    }),
  ]);

  // Save first 6 ads for admin user across folders
  const folderAssignments = [0, 0, 1, 1, 2, 2];
  for (let i = 0; i < 6; i++) {
    const adId = createdAds[i]?.id;
    const folderId = folders[folderAssignments[i] ?? 0]?.id;
    if (!adId || !folderId) continue;

    await db.savedAd.upsert({
      where: { userId_adId: { userId: adminUser.id, adId } },
      update: {},
      create: { userId: adminUser.id, adId, folderId },
    });
  }

  console.log(`   ✓ ${folders.length} folders + 6 saved ads created\n`);

  // ── Seed remixes ───────────────────────────────────────────────────────────
  console.log("🎨 Creating sample remixes...");

  const proUser = users[1]!;
  const remixTargets = createdAds.slice(0, 4);

  const remixData = [
    { type: RemixType.HOOKS, tokensUsed: 1240 },
    { type: RemixType.SCRIPT, tokensUsed: 3800 },
    { type: RemixType.ADCOPY, tokensUsed: 980 },
    { type: RemixType.BRIEF, tokensUsed: 2100 },
  ];

  for (let i = 0; i < remixTargets.length; i++) {
    const target = remixTargets[i];
    const remix = remixData[i];
    if (!target || !remix) continue;

    await db.remix.create({
      data: {
        userId: proUser.id,
        adId: target.id,
        remixType: remix.type,
        model: "claude-opus-4-6",
        tokensUsed: remix.tokensUsed,
        input: { brandVoice: "friendly, direct, evidence-based", product: "Demo Product", platform: "FACEBOOK" },
        output: { variations: ["Variation 1 placeholder", "Variation 2 placeholder", "Variation 3 placeholder"] },
      },
    });
  }

  console.log(`   ✓ ${remixTargets.length} remixes created\n`);

  // ── Seed alert rules ───────────────────────────────────────────────────────
  console.log("🔔 Creating alert rules...");

  await db.alertRule.createMany({
    data: [
      { userId: adminUser.id, name: "Skincare TikTok", niches: ["skincare"], platforms: ["TIKTOK"], velocityThreshold: 90, isActive: true },
      { userId: adminUser.id, name: "SaaS All Platforms", niches: ["saas"], platforms: [], velocityThreshold: 85, isActive: true },
      { userId: proUser.id, name: "Fitness Instagram", niches: ["fitness"], platforms: ["INSTAGRAM"], velocityThreshold: 90, isActive: true },
    ],
  });

  console.log("   ✓ 3 alert rules created\n");

  // ── Seed usage logs ────────────────────────────────────────────────────────
  console.log("📈 Creating usage logs...");

  const actions = [
    { action: "ad.search", metadata: { query: "skincare", platform: "TIKTOK", results: 42 } },
    { action: "anatomy.view", metadata: { adId: createdAds[0]?.id } },
    { action: "remix.script", metadata: { adId: createdAds[2]?.id, tokensUsed: 3800 } },
    { action: "remix.hooks", metadata: { adId: createdAds[0]?.id, tokensUsed: 1240 } },
    { action: "export.meta", metadata: { adId: createdAds[3]?.id, status: "draft_created" } },
  ];

  await db.usageLog.createMany({
    data: actions.map((a) => ({ userId: proUser.id, ...a })),
  });

  console.log("   ✓ 5 usage log entries created\n");

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log("✅ Seed complete!\n");
  console.log("   Summary:");
  console.log(`   • ${users.length} users`);
  console.log(`   • ${createdAds.length} ads across 10 niches`);
  console.log(`   • ${metricsCount} metric snapshots`);
  console.log(`   • ${anatomyCount} AI anatomy breakdowns`);
  console.log(`   • ${folders.length} folders + 6 saved ads`);
  console.log("   • 4 remixes");
  console.log("   • 3 alert rules");
  console.log("   • 5 usage log entries\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

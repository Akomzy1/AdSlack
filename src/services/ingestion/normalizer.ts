/**
 * normalizer.ts
 *
 * Shared normalization layer for the Adsentify ingestion pipeline.
 *
 * Responsibilities:
 *  1. Classify ads into niches via keyword matching
 *  2. Detect hook type and CTA type from ad copy
 *  3. Upsert ads into the database (dedup by externalId)
 *  4. Provide a batch processor that wraps per-ad upserts
 */

import type { CtaType, HookType } from "@prisma/client";
import type { RawAdData } from "./types";

// ─── Niche Classification ─────────────────────────────────────────────────────

export const SUPPORTED_NICHES = [
  "beauty",
  "kitchen",
  "pets",
  "fitness",
  "tech",
  "home_decor",
  "fashion",
  "health",
  "gaming",
  "finance",
  "education",
  "other",
] as const;

export type SupportedNiche = (typeof SUPPORTED_NICHES)[number];

const NICHE_KEYWORDS: Record<SupportedNiche, string[]> = {
  beauty: [
    "makeup", "skincare", "beauty", "cosmetics", "serum", "moisturizer",
    "foundation", "lipstick", "eyeshadow", "mascara", "blush", "concealer",
    "toner", "cleanser", "cream", "lotion", "sunscreen", "spf", "glow",
    "anti-aging", "wrinkle", "pore", "acne", "lash", "brow", "nail",
    "perfume", "fragrance", "retinol", "hyaluronic", "vitamin c",
  ],
  kitchen: [
    "kitchen", "cookware", "cooking", "recipe", "blender", "air fryer",
    "instant pot", "knife", "pan", "pot", "utensil", "food processor",
    "coffee", "espresso", "cutting board", "baking", "pastry", "chef",
    "wok", "spatula", "colander", "dinnerware",
  ],
  pets: [
    "pet", "dog", "cat", "puppy", "kitten", "animal", "collar", "leash",
    "treat", "grooming", "fur", "paw", "breed", "vet", "kibble", "feline",
    "canine", "fish tank", "bird", "hamster", "reptile",
  ],
  fitness: [
    "fitness", "workout", "gym", "exercise", "protein", "supplement",
    "yoga", "running", "weight loss", "muscle", "cardio", "resistance",
    "dumbbell", "treadmill", "pre-workout", "creatine", "shaker",
    "athletic", "sport", "marathon", "pilates", "kettlebell",
  ],
  tech: [
    "tech", "phone", "laptop", "gadget", "software", "app", "ai",
    "digital", "smart", "wireless", "bluetooth", "earbuds", "speaker",
    "charger", "monitor", "keyboard", "mouse", "webcam", "tablet",
    "streaming", "saas", "automation", "productivity",
  ],
  home_decor: [
    "home", "decor", "furniture", "lamp", "rug", "curtain", "pillow",
    "wall art", "interior", "bedroom", "living room", "couch", "sofa",
    "shelf", "organizer", "storage", "candle", "vase", "frame",
    "aesthetic", "minimalist",
  ],
  fashion: [
    "fashion", "clothing", "dress", "shirt", "shoes", "sneakers", "bag",
    "accessory", "style", "outfit", "wear", "jeans", "jacket", "coat",
    "hat", "sunglasses", "jewelry", "ring", "watch", "bracelet",
    "streetwear", "vintage", "sustainable fashion",
  ],
  health: [
    "health", "supplement", "vitamin", "wellness", "medicine", "pain",
    "sleep", "immune", "energy", "gut", "probiotic", "collagen", "omega",
    "zinc", "magnesium", "detox", "cleanse", "holistic", "natural",
    "inflammation", "hormone", "thyroid",
  ],
  gaming: [
    "gaming", "game", "gamer", "console", "pc gaming", "steam", "esports",
    "controller", "headset", "fps", "rpg", "mmo", "streamer", "twitch",
    "playstation", "xbox", "nintendo", "mobile game", "graphics card",
  ],
  finance: [
    "finance", "money", "invest", "crypto", "stock", "trading", "loan",
    "credit", "debt", "savings", "insurance", "mortgage", "tax", "budget",
    "financial freedom", "passive income", "forex", "wealth", "portfolio",
  ],
  education: [
    "course", "learn", "education", "skill", "certification", "degree",
    "training", "tutorial", "coaching", "book", "ebook", "masterclass",
    "bootcamp", "udemy", "teachable", "online class", "how to master",
    "workshop", "mentoring",
  ],
  other: [],
};

/**
 * Classify an ad into a niche using keyword matching across ad copy + brand name.
 * Returns the niche with the most keyword hits; falls back to "other".
 */
export function classifyNiche(
  text: string,
  nicheHint?: string
): SupportedNiche {
  const lower = text.toLowerCase();

  // Trust the source API's niche hint if it maps directly to one we support
  if (nicheHint) {
    const hintLower = nicheHint.toLowerCase().replace(/[\s-]/g, "_");
    const direct = SUPPORTED_NICHES.find(
      (n) => n === hintLower || hintLower.includes(n)
    );
    if (direct && direct !== "other") return direct;
  }

  let bestNiche: SupportedNiche = "other";
  let bestScore = 0;

  for (const niche of SUPPORTED_NICHES) {
    if (niche === "other") continue;
    const score = NICHE_KEYWORDS[niche].reduce(
      (acc, kw) => acc + (lower.includes(kw) ? 1 : 0),
      0
    );
    if (score > bestScore) {
      bestScore = score;
      bestNiche = niche;
    }
  }

  return bestNiche;
}

// ─── Hook Type Detection ──────────────────────────────────────────────────────

const HOOK_PATTERNS: Array<{ type: HookType; patterns: string[] }> = [
  {
    type: "OFFER",
    patterns: ["% off", "free ", "limited time", "sale", "save $", "discount",
      "flash sale", "today only", "bogo", "buy one get"],
  },
  {
    type: "CURIOSITY_GAP",
    patterns: ["you won't believe", "secret", "this changes everything",
      "didn't know", "hidden truth", "what they don't tell you",
      "the truth about", "shocked", "no one talks about"],
  },
  {
    type: "PAIN_POINT",
    patterns: ["tired of", "struggling with", "frustrated", "suffering",
      "sick of", "can't stand", "hate when", "why doesn't",
      "nobody talks about", "still dealing with"],
  },
  {
    type: "SOCIAL_PROOF",
    patterns: ["everyone is", "thousands of", "customers love", "rated #1",
      "best seller", "viral", "millions of", "joined by", "trusted by",
      "5 stars", "top rated"],
  },
  {
    type: "PATTERN_INTERRUPT",
    patterns: ["stop doing", "warning:", "wait before you", "don't use",
      "never again", "put down your", "before you buy", "i was wrong",
      "everything you know about"],
  },
  {
    type: "BOLD_CLAIM",
    patterns: ["#1", "best in the world", "100%", "guaranteed", "fastest",
      "most powerful", "revolutionary", "game changer", "life changing",
      "clinically proven"],
  },
  {
    type: "QUESTION",
    patterns: ["? ", "do you ", "have you ever", "what if ", "why do you",
      "how do you", "is your ", "are you still", "did you know"],
  },
  {
    type: "STORY",
    patterns: ["my story", "how i ", "i used to", "from ", "journey",
      "changed my life", "used to be", "i was ", "last year i",
      "3 years ago", "i struggled"],
  },
  {
    type: "TUTORIAL",
    patterns: ["how to", "step by step", "tutorial", "guide to",
      "in 5 minutes", "in 3 steps", "method", "trick to", "hack for"],
  },
  {
    type: "FEAR",
    patterns: ["danger", "risk", "harmful", "toxic", "before it's too late",
      "avoid", "don't ignore", "deadly", "side effects", "toxic"],
  },
];

/** Detect hook type from ad copy. Returns null if no pattern matches. */
export function detectHookType(text: string): HookType | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const { type, patterns } of HOOK_PATTERNS) {
    if (patterns.some((p) => lower.includes(p))) return type;
  }
  return null;
}

// ─── CTA Type Detection ───────────────────────────────────────────────────────

const CTA_PATTERNS: Array<{ type: CtaType; patterns: string[] }> = [
  { type: "TRY_FREE",   patterns: ["try free", "free trial", "start free", "try for free", "get started free"] },
  { type: "SHOP_NOW",   patterns: ["shop now", "buy now", "purchase", "order now", "get yours", "add to cart"] },
  { type: "GET_OFFER",  patterns: ["get offer", "claim offer", "get deal", "claim now", "get discount", "unlock offer"] },
  { type: "SIGN_UP",    patterns: ["sign up", "register", "create account", "join now", "subscribe now", "join free"] },
  { type: "DOWNLOAD",   patterns: ["download", "install", "get app", "download now", "download free", "get it free"] },
  { type: "BOOK_NOW",   patterns: ["book now", "schedule", "reserve", "appointment", "book a call", "book free"] },
  { type: "WATCH_MORE", patterns: ["watch more", "watch now", "see video", "view video"] },
  { type: "CONTACT_US", patterns: ["contact us", "call us", "message us", "reach out", "get in touch"] },
  { type: "LEARN_MORE", patterns: ["learn more", "find out", "discover more", "see more", "read more", "explore"] },
];

/** Detect CTA type from button label or ad copy. */
export function detectCtaType(text: string): CtaType | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const { type, patterns } of CTA_PATTERNS) {
    if (patterns.some((p) => lower.includes(p))) return type;
  }
  return "OTHER";
}

// ─── Retry helper ─────────────────────────────────────────────────────────────

/**
 * Retry an async operation with exponential back-off.
 * Non-retryable errors (4xx other than 429) are rethrown immediately.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 1000
): Promise<T> {
  let lastError: Error = new Error("Unknown error");

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Don't retry auth/client errors
      const isRateLimit = lastError.message.includes("429") ||
                          lastError.message.toLowerCase().includes("rate limit");
      const isServer    = lastError.message.includes("5");
      if (!isRateLimit && !isServer && attempt > 1) throw lastError;

      if (attempt < maxAttempts) {
        const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
        console.warn(
          `[ingestion] Attempt ${attempt}/${maxAttempts} failed: ${lastError.message} — retrying in ${delayMs}ms`
        );
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }
  throw lastError;
}

// ─── Database upsert ─────────────────────────────────────────────────────────

/**
 * Insert or update an ad in the database.
 *
 * - Match on externalId (platform-unique)
 * - New ad: creates Ad + first AdMetrics row
 * - Existing ad: updates lastSeenAt / isActive + appends new AdMetrics row
 *
 * Returns "created" | "updated" | "skipped"
 */
export async function upsertAd(
  raw: RawAdData,
  dryRun = false
): Promise<"created" | "updated" | "skipped"> {
  const searchText = [
    raw.brandName,
    raw.productName,
    raw.hookText,
    raw.landingPageUrl,
  ]
    .filter(Boolean)
    .join(" ");

  const niche     = classifyNiche(searchText, raw.rawNicheHint);
  const hookType  = raw.hookText ? detectHookType(raw.hookText) : null;
  const ctaType   = raw.ctaText  ? detectCtaType(raw.ctaText)   : null;

  const daysRunning = Math.max(
    0,
    Math.floor(
      (Date.now() - raw.firstSeenAt.getTime()) / (1000 * 60 * 60 * 24)
    )
  );

  if (dryRun) {
    console.log(
      `[normalizer/dry-run] ${raw.externalId} → niche=${niche} hook=${hookType ?? "none"} cta=${ctaType ?? "none"}`
    );
    return "skipped";
  }

  // Lazy import keeps this module testable without a DB connection
  const { db } = await import("@/lib/db");

  const existing = await db.ad.findUnique({
    where: { externalId: raw.externalId },
    select: { id: true },
  });

  if (existing) {
    // Update metadata + append new metrics snapshot
    await db.$transaction([
      db.ad.update({
        where: { id: existing.id },
        data: {
          lastSeenAt:       raw.lastSeenAt,
          isActive:         raw.isActive,
          daysRunning,
          estimatedSpendMin: raw.estimatedSpendMin ?? undefined,
          estimatedSpendMax: raw.estimatedSpendMax ?? undefined,
          thumbnailUrl:     raw.thumbnailUrl  ?? undefined,
          videoUrl:         raw.videoUrl      ?? undefined,
        },
      }),
      db.adMetrics.create({
        data: {
          adId:     existing.id,
          likes:    BigInt(raw.rawMetrics.likes),
          comments: BigInt(raw.rawMetrics.comments),
          shares:   BigInt(raw.rawMetrics.shares),
          views:    BigInt(raw.rawMetrics.views),
        },
      }),
    ]);
    return "updated";
  }

  // Brand-new ad
  await db.ad.create({
    data: {
      platform:          raw.platform,
      externalId:        raw.externalId,
      brandName:         raw.brandName,
      productName:       raw.productName,
      niche,
      adType:            raw.adType,
      duration:          raw.duration,
      country:           raw.country,
      language:          raw.language,
      hookText:          raw.hookText,
      hookType:          hookType ?? undefined,
      ctaText:           raw.ctaText,
      ctaType:           ctaType ?? undefined,
      thumbnailUrl:      raw.thumbnailUrl,
      videoUrl:          raw.videoUrl,
      landingPageUrl:    raw.landingPageUrl,
      estimatedSpendMin: raw.estimatedSpendMin,
      estimatedSpendMax: raw.estimatedSpendMax,
      firstSeenAt:       raw.firstSeenAt,
      lastSeenAt:        raw.lastSeenAt,
      daysRunning,
      isActive:          raw.isActive,
      status:            "RAW",
      metrics: {
        create: {
          likes:    BigInt(raw.rawMetrics.likes),
          comments: BigInt(raw.rawMetrics.comments),
          shares:   BigInt(raw.rawMetrics.shares),
          views:    BigInt(raw.rawMetrics.views),
        },
      },
    },
  });

  return "created";
}

// ─── Batch processor ──────────────────────────────────────────────────────────

export interface BatchResult {
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  messages: string[];
}

/** Run upsertAd for every item in the batch; collect results. */
export async function processAdBatch(
  ads: RawAdData[],
  dryRun = false
): Promise<BatchResult> {
  const result: BatchResult = { created: 0, updated: 0, skipped: 0, errors: 0, messages: [] };

  for (const ad of ads) {
    try {
      const outcome = await upsertAd(ad, dryRun);
      result[outcome]++;
    } catch (err) {
      result.errors++;
      const msg = `Failed to upsert ${ad.externalId}: ${err instanceof Error ? err.message : String(err)}`;
      result.messages.push(msg);
      console.error(`[normalizer] ${msg}`);
    }
  }

  return result;
}

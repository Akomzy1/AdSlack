/**
 * anatomyEngine.ts
 *
 * AI-powered ad anatomy analysis using Claude Opus 4.6.
 *
 * Given an Ad record, sends a structured prompt to Claude and returns
 * a rich breakdown: hook scoring, emotional triggers, script structure,
 * funnel type, target psychology, and more.
 *
 * Design:
 *  - Pure function (no Prisma I/O) — the route handler manages DB reads/writes
 *  - Strict JSON output enforced via system prompt + post-parse validation
 *  - Up to 3 retries (handled by the SDK's maxRetries) + 1 JSON-parse retry
 *  - Token counts returned for billing / usage tracking
 */

import Anthropic from "@anthropic-ai/sdk";
import { anthropic } from "@/lib/anthropic";
import type { FunnelType, HookType } from "@prisma/client";

// ─── Input/Output types ───────────────────────────────────────────────────────

export interface AdAnatomyInput {
  id: string;
  platform: string;
  brandName: string;
  productName: string | null;
  niche: string;
  adType: string;           // VIDEO | IMAGE | CAROUSEL
  duration: number | null;  // seconds
  hookText: string | null;
  ctaText: string | null;
  thumbnailUrl: string | null;
  landingPageUrl: string | null;
  estimatedSpendMin: number | null;
  estimatedSpendMax: number | null;
  daysRunning: number;
  velocityScore: number;
  velocityTier: string;
  latestMetrics: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
  } | null;
}

export interface ScriptStage {
  stage: string;
  description: string;
  duration?: string;   // e.g. "0:00–0:03" — video only
}

export interface ScriptBreakdownItem {
  timestamp: string;
  action: string;
  text: string;
}

export interface AnatomyResult {
  hookScore: number;                          // 0–100
  hookType: string;                           // human-readable, e.g. "Pain Point"
  hookTypeMapped: HookType | null;            // mapped to Prisma enum
  emotionalTriggers: string[];                // ["FOMO", "Aspiration", ...]
  scriptStructure: {
    formula: string;                          // "Hook → Problem → Demo → CTA"
    stages: ScriptStage[];
  };
  targetPsychology: string;
  colorPalette: {
    dominant: string[];
    accent: string;
    mood: string;
  } | null;
  audioMood: string;
  pacingNotes: string;
  funnelType: FunnelType;
  fullScriptBreakdown: ScriptBreakdownItem[] | null;  // video only
}

export interface AnatomyEngineResult {
  anatomy: AnatomyResult;
  tokensInput: number;
  tokensOutput: number;
  model: string;
}

// ─── Model ────────────────────────────────────────────────────────────────────

const ANATOMY_MODEL = "claude-opus-4-6";

// ─── Hook type mapper ─────────────────────────────────────────────────────────

const HOOK_TYPE_MAP: Record<string, HookType> = {
  "curiosity gap":     "CURIOSITY_GAP",
  "pain point":        "PAIN_POINT",
  "social proof":      "SOCIAL_PROOF",
  "pattern interrupt": "PATTERN_INTERRUPT",
  "bold claim":        "BOLD_CLAIM",
  "price anchor":      "OFFER",
  "story open":        "STORY",
  "pov":               "STORY",
  "humor":             "BOLD_CLAIM",
  "controversy":       "BOLD_CLAIM",
  "question":          "QUESTION",
  "tutorial":          "TUTORIAL",
  "fear":              "FEAR",
  "offer":             "OFFER",
};

function mapHookType(raw: string): HookType | null {
  return HOOK_TYPE_MAP[raw.toLowerCase()] ?? null;
}

// ─── Funnel type mapper ───────────────────────────────────────────────────────

const VALID_FUNNEL_TYPES = new Set<FunnelType>([
  "DIRECT_RESPONSE", "LEAD_GEN", "CONTENT_FIRST",
  "BRAND_AWARENESS", "RETARGETING", "PRODUCT_LAUNCH",
]);

function mapFunnelType(raw: string): FunnelType {
  const upper = raw.toUpperCase().replace(/[\s-]/g, "_") as FunnelType;
  return VALID_FUNNEL_TYPES.has(upper) ? upper : "DIRECT_RESPONSE";
}

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert performance marketer and creative strategist with deep expertise in direct-response advertising, consumer psychology, and viral content mechanics. You analyze ads with the precision of a senior creative director at a top performance marketing agency.

Your task: analyze the provided ad data and return a SINGLE JSON object. Output ONLY valid JSON — no markdown, no code blocks, no explanation text outside the JSON.

RESPONSE SCHEMA (all fields required):
{
  "hookScore": <integer 0–100>,
  "hookType": <one of: "Curiosity Gap" | "Pain Point" | "Social Proof" | "Pattern Interrupt" | "POV" | "Price Anchor" | "Story Open" | "Bold Claim" | "Humor" | "Controversy" | "Question" | "Tutorial" | "Fear" | "Offer">,
  "emotionalTriggers": <array of 2–4 strings from: "FOMO" | "Curiosity" | "Trust" | "Aspiration" | "Fear" | "Humor" | "Guilt" | "Pride" | "Urgency" | "Nostalgia" | "Desire" | "Validation" | "Greed" | "Belonging">,
  "scriptStructure": {
    "formula": <string — the ad's flow as a → chain, e.g. "Hook → Problem → Demo → Social Proof → CTA">,
    "stages": [
      {
        "stage": <stage name, e.g. "Hook">,
        "description": <1–2 sentence analysis of what this stage does and why>,
        "duration": <string only for VIDEO ads, e.g. "0:00–0:03"; omit for IMAGE/CAROUSEL>
      }
    ]
  },
  "targetPsychology": <string — 1–2 sentences profiling the ideal viewer's mindset, pain points, and motivations>,
  "colorPalette": <object or null — null only for text-only ads — { "dominant": [<color name or hex>], "accent": <color>, "mood": <single word e.g. "energetic" | "calm" | "luxurious" | "playful" | "clinical"> }>,
  "audioMood": <string — e.g. "Upbeat Pop", "Emotional Piano", "Trending Audio", "Voiceover Only", "Silence", "Hip-Hop Beat">,
  "pacingNotes": <string — observations on cut frequency, transitions, rhythm, visual tempo>,
  "funnelType": <one of: "DIRECT_RESPONSE" | "LEAD_GEN" | "CONTENT_FIRST" | "BRAND_AWARENESS" | "RETARGETING" | "PRODUCT_LAUNCH">,
  "fullScriptBreakdown": <array for VIDEO ads, null for IMAGE/CAROUSEL — [{ "timestamp": <e.g. "0:00">, "action": <brief visual/audio description>, "text": <on-screen text or voiceover line> }]>
}

HOOK SCORE RUBRIC:
90–100: Instantly stops scroll; creates irresistible curiosity, urgency, or relatability
75–89:  Strong hook with clear value proposition; retains most viewers
60–74:  Decent but predictable; loses some viewers in the first 3 seconds
40–59:  Generic opening; weak differentiation
0–39:   Poor hook; loses most viewers immediately

FUNNEL TYPE DEFINITIONS:
DIRECT_RESPONSE: Drives immediate purchase or conversion
LEAD_GEN: Captures email/contact info via opt-in
CONTENT_FIRST: Educates/entertains before selling (VSL, story-driven)
BRAND_AWARENESS: Pure awareness; no hard CTA
RETARGETING: Assumes prior brand exposure; addresses objections
PRODUCT_LAUNCH: New product introduction with urgency/exclusivity

EXAMPLE — TikTok VIDEO ad for a beauty brand:
Input: { "platform": "TIKTOK", "brandName": "GlowLab", "adType": "VIDEO", "duration": 30, "hookText": "I cleared 10 years of acne in 30 days", "ctaText": "Shop Now — 40% off", "niche": "beauty" }

Output:
{
  "hookScore": 91,
  "hookType": "Bold Claim",
  "emotionalTriggers": ["Aspiration", "FOMO", "Trust"],
  "scriptStructure": {
    "formula": "Bold Claim Hook → Before/After → Ingredient Demo → Social Proof → Urgency CTA",
    "stages": [
      { "stage": "Hook", "description": "Creator delivers a specific outcome claim directly to camera in 2 seconds, exploiting pattern interrupt against generic beauty content.", "duration": "0:00–0:02" },
      { "stage": "Problem Agitation", "description": "Fast-cut 'before' footage creates emotional identification with acne-sufferers before they can scroll away.", "duration": "0:02–0:08" },
      { "stage": "Solution Demo", "description": "Close-up product texture shot establishes quality cues and ingredient authority.", "duration": "0:08–0:18" },
      { "stage": "Social Proof", "description": "UGC-style before/after montage transfers trust from individual creator to broader customer base.", "duration": "0:18–0:26" },
      { "stage": "Urgency CTA", "description": "Time-limited discount creates loss aversion and removes purchase hesitation.", "duration": "0:26–0:30" }
    ]
  },
  "targetPsychology": "25–40 year olds who have tried multiple products without lasting results. Skeptical of brand claims but responsive to specific outcomes and peer validation — they need to see it working on someone like them before they believe.",
  "colorPalette": { "dominant": ["#f8e8d4", "#ffffff"], "accent": "#ff6b35", "mood": "clean" },
  "audioMood": "Trending Audio (soft upbeat)",
  "pacingNotes": "Fast-cut at ~2 seconds per clip during problem/solution phases; slows to 3–4 second holds on product close-ups and result reveals. Rhythm mirrors TikTok native content to avoid ad fatigue.",
  "funnelType": "DIRECT_RESPONSE",
  "fullScriptBreakdown": [
    { "timestamp": "0:00", "action": "Creator close-up, direct-to-camera", "text": "I cleared 10 years of acne in 30 days and I need to tell you how" },
    { "timestamp": "0:03", "action": "Before selfie montage, no audio", "text": "This was me 30 days ago 😢" },
    { "timestamp": "0:08", "action": "Product reveal, hand hold", "text": "This $24 serum is the only thing that actually worked" },
    { "timestamp": "0:15", "action": "Ingredient callout screen", "text": "10% Vitamin C + Niacinamide — dermatologist formula" },
    { "timestamp": "0:22", "action": "After transformation reveal", "text": "30 days later 🤯" },
    { "timestamp": "0:26", "action": "CTA card with countdown", "text": "40% off for 48 hours only — link in bio" }
  ]
}

EXAMPLE — Facebook IMAGE ad for a fitness brand:
Input: { "platform": "FACEBOOK", "brandName": "IronCore", "adType": "IMAGE", "hookText": "Warning: this pre-workout is NOT for beginners", "ctaText": "Build Your Stack", "niche": "fitness" }

Output:
{
  "hookScore": 78,
  "hookType": "Pattern Interrupt",
  "emotionalTriggers": ["Curiosity", "Pride", "Desire"],
  "scriptStructure": {
    "formula": "Warning Hook → Exclusivity Frame → Product Features → CTA",
    "stages": [
      { "stage": "Hook", "description": "Warning-style headline uses reverse psychology to attract experienced gym-goers who want to self-identify as 'not a beginner'." },
      { "stage": "Exclusivity Frame", "description": "Positions the product as elite — creates aspiration and filters out casual buyers, making serious buyers feel seen." },
      { "stage": "Product Features", "description": "Key ingredient callouts (caffeine dose, beta-alanine) give rational justification for an emotionally-driven purchase." },
      { "stage": "CTA", "description": "'Build Your Stack' uses gym culture language to deepen identity alignment." }
    ]
  },
  "targetPsychology": "Male gym-goers aged 18–35 who identify strongly with fitness culture and feel pride in their training intensity. They distrust mainstream supplements and respond to brands that match their self-image as dedicated athletes.",
  "colorPalette": { "dominant": ["#1a1a1a", "#ff3d00"], "accent": "#ffffff", "mood": "intense" },
  "audioMood": "None",
  "pacingNotes": "Static image — no pacing. Strong visual hierarchy draws eye from warning text → product image → CTA button. High-contrast color scheme creates visual urgency.",
  "funnelType": "DIRECT_RESPONSE",
  "fullScriptBreakdown": null
}

Now analyze the following ad and return ONLY the JSON object. No other text, no markdown.`;

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildUserPrompt(ad: AdAnatomyInput): string {
  const lines: string[] = [
    `Analyze this ${ad.platform} ${ad.adType} ad:`,
    "",
    `Brand:       ${ad.brandName}`,
    `Product:     ${ad.productName ?? "Unknown"}`,
    `Niche:       ${ad.niche}`,
    `Platform:    ${ad.platform}`,
    `Ad Type:     ${ad.adType}`,
  ];

  if (ad.duration) lines.push(`Duration:    ${ad.duration}s`);
  if (ad.hookText) lines.push(`Hook Text:   "${ad.hookText}"`);
  if (ad.ctaText)  lines.push(`CTA:         "${ad.ctaText}"`);
  if (ad.landingPageUrl) lines.push(`Landing URL: ${ad.landingPageUrl}`);

  if (ad.estimatedSpendMin || ad.estimatedSpendMax) {
    const lo = ad.estimatedSpendMin ? `$${ad.estimatedSpendMin.toLocaleString()}` : "?";
    const hi = ad.estimatedSpendMax ? `$${ad.estimatedSpendMax.toLocaleString()}` : "?";
    lines.push(`Est. Spend:  ${lo}–${hi}/mo`);
  }

  lines.push(`Days Running: ${ad.daysRunning}`);
  lines.push(`Velocity:    ${ad.velocityScore}/100 (${ad.velocityTier})`);

  if (ad.latestMetrics) {
    const m = ad.latestMetrics;
    lines.push(
      `Engagement:  ${m.views.toLocaleString()} views · ${m.likes.toLocaleString()} likes · ` +
      `${m.comments.toLocaleString()} comments · ${m.shares.toLocaleString()} shares`
    );
  }

  if (!ad.hookText) {
    lines.push("");
    lines.push("Note: No hook text available. Infer the hook strategy from brand, niche, and platform context.");
  }

  if (ad.adType === "IMAGE" || ad.adType === "CAROUSEL") {
    lines.push("");
    lines.push("Note: This is a static ad. Set fullScriptBreakdown to null. Omit 'duration' from all stage objects.");
  }

  return lines.join("\n");
}

// ─── JSON extraction ──────────────────────────────────────────────────────────

/**
 * Extract the first valid JSON object from a string.
 * Handles cases where Claude adds trailing text or whitespace.
 */
function extractJson(text: string): unknown {
  const trimmed = text.trim();

  // Happy path — clean JSON
  try {
    return JSON.parse(trimmed);
  } catch {
    // Try to find JSON boundaries
    const start = trimmed.indexOf("{");
    const end   = trimmed.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("No valid JSON object found in response");
  }
}

/** Validate and coerce the parsed JSON into an AnatomyResult. */
function parseAnatomyResult(raw: unknown): AnatomyResult {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Response is not a JSON object");
  }

  const obj = raw as Record<string, unknown>;

  // Required field checks
  for (const field of ["hookScore", "hookType", "emotionalTriggers", "scriptStructure",
                        "targetPsychology", "audioMood", "pacingNotes", "funnelType"]) {
    if (!(field in obj)) throw new Error(`Missing required field: ${field}`);
  }

  const hookTypeRaw = String(obj.hookType ?? "");
  const hookTypeMapped = mapHookType(hookTypeRaw);
  const funnelType = mapFunnelType(String(obj.funnelType ?? "DIRECT_RESPONSE"));

  return {
    hookScore:   Math.min(100, Math.max(0, Number(obj.hookScore) || 0)),
    hookType:    hookTypeRaw,
    hookTypeMapped,
    emotionalTriggers: Array.isArray(obj.emotionalTriggers)
      ? (obj.emotionalTriggers as string[]).slice(0, 4)
      : [],
    scriptStructure: (obj.scriptStructure as AnatomyResult["scriptStructure"]) ?? {
      formula: "",
      stages: [],
    },
    targetPsychology: String(obj.targetPsychology ?? ""),
    colorPalette:     (obj.colorPalette as AnatomyResult["colorPalette"]) ?? null,
    audioMood:        String(obj.audioMood ?? ""),
    pacingNotes:      String(obj.pacingNotes ?? ""),
    funnelType,
    fullScriptBreakdown: Array.isArray(obj.fullScriptBreakdown)
      ? (obj.fullScriptBreakdown as ScriptBreakdownItem[])
      : null,
  };
}

// ─── Core analyzer ────────────────────────────────────────────────────────────

/**
 * Generate an AI anatomy breakdown for an ad.
 *
 * The SDK handles retries (maxRetries: 3) for transient API errors.
 * We add one additional retry at the application level if JSON parsing fails.
 */
export async function generateAnatomy(
  ad: AdAnatomyInput
): Promise<AnatomyEngineResult> {
  const userPrompt = buildUserPrompt(ad);

  // Build message content — optionally include thumbnail as vision input
  const userContent: Anthropic.MessageParam["content"] = ad.thumbnailUrl &&
    ad.thumbnailUrl.startsWith("https://")
    ? [
        {
          type: "image" as const,
          source: {
            type: "url" as const,
            url: ad.thumbnailUrl,
          },
        },
        { type: "text" as const, text: userPrompt },
      ]
    : userPrompt;

  let lastError: Error | null = null;

  // One JSON-parse-level retry on top of SDK's HTTP retries
  for (let attempt = 1; attempt <= 2; attempt++) {
    let response: Anthropic.Message;

    try {
      response = await anthropic.messages.create({
        model:      ANATOMY_MODEL,
        max_tokens: 2048,
        thinking:   { type: "adaptive" },
        system:     SYSTEM_PROMPT,
        messages:   [{ role: "user", content: userContent }],
      });
    } catch (err) {
      if (err instanceof Anthropic.AuthenticationError) {
        throw new Error("ANTHROPIC_API_KEY is invalid or not set");
      }
      if (err instanceof Anthropic.RateLimitError) {
        throw new Error("Anthropic API rate limit exceeded — retry later");
      }
      throw err;
    }

    // Extract text from response (skip thinking blocks)
    const textBlock = response.content.find(
      (b): b is Anthropic.TextBlock => b.type === "text"
    );
    if (!textBlock) {
      lastError = new Error("Claude returned no text block");
      continue;
    }

    // Parse and validate JSON
    try {
      const parsed  = extractJson(textBlock.text);
      const anatomy = parseAnatomyResult(parsed);

      return {
        anatomy,
        tokensInput:  response.usage.input_tokens,
        tokensOutput: response.usage.output_tokens,
        model:        ANATOMY_MODEL,
      };
    } catch (parseErr) {
      lastError = parseErr instanceof Error ? parseErr : new Error(String(parseErr));
      console.warn(
        `[anatomyEngine] JSON parse failed (attempt ${attempt}):`,
        lastError.message,
        "\nRaw response:", textBlock.text.slice(0, 500)
      );
    }
  }

  throw lastError ?? new Error("Anatomy generation failed after retries");
}

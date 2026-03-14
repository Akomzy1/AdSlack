/**
 * remixEngine.ts
 *
 * Forge Remix — AI-powered creative variation generator.
 *
 * Four generation functions, each producing a different class of creative asset:
 *   - generateHooks()          → 8 hook variations across all major frameworks
 *   - generateScriptVariations() → 3 full scripts with different creative angles
 *   - generateAdCopy()         → 4 platform-optimised copy sets
 *   - generateCreativeBrief()  → 1 production-ready creative brief
 *
 * Design:
 *   - Pure functions — no Prisma I/O; route handlers manage DB reads/writes
 *   - Zod validation on all Claude responses
 *   - Up to 3 attempts per call (SDK maxRetries: 3 for HTTP + 1 JSON-parse retry)
 *   - Token counts returned for billing
 *   - Model: claude-sonnet-4-0 (claude-sonnet-4-20250514) — fast + cost-efficient for remix
 */

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { anthropic } from "@/lib/anthropic";
import {
  HOOKS_SYSTEM_PROMPT,
  SCRIPTS_SYSTEM_PROMPT,
  ADCOPY_SYSTEM_PROMPT,
  BRIEF_SYSTEM_PROMPT,
  UGC_SYSTEM_PROMPT,
} from "@/constants/remixPrompts";

// ─── Model ────────────────────────────────────────────────────────────────────

const REMIX_MODEL = "claude-sonnet-4-0"; // claude-sonnet-4-20250514

// ─── Input types ──────────────────────────────────────────────────────────────

export interface RemixAdInput {
  id: string;
  platform: string;         // "TIKTOK" | "FACEBOOK" | "INSTAGRAM" | "YOUTUBE"
  brandName: string;
  productName: string | null;
  niche: string;
  adType: string;           // "VIDEO" | "IMAGE" | "CAROUSEL"
  duration: number | null;  // seconds
  hookText: string | null;
  hookType: string | null;  // from Ad or Anatomy
  ctaText: string | null;
  daysRunning: number;
  velocityScore: number;
  velocityTier: string;
  estimatedSpendMin: number | null;
  estimatedSpendMax: number | null;
}

export interface RemixAnatomyInput {
  hookScore: number | null;
  emotionalTriggers: string[];
  scriptStructure: {
    formula: string;
    stages: Array<{ stage: string; description: string; duration?: string }>;
  } | null;
  targetPsychology: string | null;
  audioMood: string | null;
  pacingNotes: string | null;
  funnelType: string | null;
  fullScriptBreakdown: Array<{
    timestamp: string;
    action: string;
    text: string;
  }> | null;
}

// ─── Output types (Zod schemas + inferred TS types) ───────────────────────────

// Hooks -----------------------------------------------------------------------

const HookVariationSchema = z.object({
  type:      z.string(),
  hook:      z.string(),
  reasoning: z.string(),
});

const HooksOutputSchema = z.array(HookVariationSchema).min(1).max(8);

export type HookVariation   = z.infer<typeof HookVariationSchema>;
export type HooksOutput     = z.infer<typeof HooksOutputSchema>;

// Scripts ---------------------------------------------------------------------

const ScriptLineSchema = z.object({
  timestamp: z.string(),
  visual:    z.string(),
  audio:     z.string(),
});

const ScriptVariationSchema = z.object({
  angle:     z.string(),
  rationale: z.string(),
  script:    z.array(ScriptLineSchema).min(1),
});

const ScriptsOutputSchema = z.array(ScriptVariationSchema).min(1).max(3);

export type ScriptLine       = z.infer<typeof ScriptLineSchema>;
export type ScriptVariation  = z.infer<typeof ScriptVariationSchema>;
export type ScriptsOutput    = z.infer<typeof ScriptsOutputSchema>;

// Ad Copy ---------------------------------------------------------------------

const AdCopySetSchema = z.object({
  angle:       z.string(),
  headline:    z.string(),
  primaryText: z.string(),
  description: z.string(),
  ctaButton:   z.string(),
});

const AdCopyOutputSchema = z.array(AdCopySetSchema).min(1).max(4);

export type AdCopySet    = z.infer<typeof AdCopySetSchema>;
export type AdCopyOutput = z.infer<typeof AdCopyOutputSchema>;

// Creative Brief --------------------------------------------------------------

const CreativeBriefSchema = z.object({
  overview: z.string(),
  targetAudience: z.object({
    primary:                   z.string(),
    psychographic:             z.string(),
    contentConsumptionContext: z.string(),
  }),
  keyMessage:    z.string(),
  toneAndStyle:  z.string(),
  visualDirection: z.object({
    aesthetic:         z.string(),
    colorNotes:        z.string(),
    textOverlayStyle:  z.string(),
    avoidList:         z.array(z.string()),
  }),
  shotList: z.array(z.object({
    shot:        z.number(),
    type:        z.string(),
    description: z.string(),
    duration:    z.number(),
  })),
  musicDirection: z.object({
    mood:       z.string(),
    tempo:      z.string(),
    references: z.string(),
  }),
  dimensions: z.string(),
  duration:   z.number().nullable(),
  ctaStrategy: z.object({
    primaryCta:      z.string(),
    placement:       z.string(),
    urgencyMechanic: z.string().nullable(),
  }),
  references: z.array(z.string()),
});

export type CreativeBrief = z.infer<typeof CreativeBriefSchema>;

// UGC Scripts -----------------------------------------------------------------

const UGCSectionSchema = z.object({
  timestamp:   z.string(),
  type:        z.string(),
  spoken:      z.string(),
  direction:   z.string(),
  bRoll:       z.string().nullable(),
  textOverlay: z.string().nullable(),
});

const UGCCreatorNotesSchema = z.object({
  tone:              z.string(),
  pacing:            z.string(),
  authenticity_cues: z.array(z.string()),
  doNot:             z.array(z.string()),
  audioSuggestion:   z.string(),
});

const UGCScriptSchema = z.object({
  creatorType:       z.string(),
  angle:             z.string(),
  platform:          z.string(),
  estimatedDuration: z.string(),
  sections:          z.array(UGCSectionSchema).min(3),
  creatorNotes:      UGCCreatorNotesSchema,
});

const UGCOutputSchema = z.array(UGCScriptSchema).min(1).max(3);

export type UGCSection      = z.infer<typeof UGCSectionSchema>;
export type UGCCreatorNotes = z.infer<typeof UGCCreatorNotesSchema>;
export type UGCScript       = z.infer<typeof UGCScriptSchema>;
export type UGCOutput       = z.infer<typeof UGCOutputSchema>;

// ─── Shared engine result ─────────────────────────────────────────────────────

export interface RemixEngineResult<T> {
  output:       T;
  tokensInput:  number;
  tokensOutput: number;
  model:        string;
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

/**
 * Extract the first valid JSON value (object or array) from a string.
 * Handles cases where Claude prepends/appends explanation text.
 */
function extractJson(text: string): unknown {
  const trimmed = text.trim();

  // Happy path
  try {
    return JSON.parse(trimmed);
  } catch {
    // Look for array first, then object
    const arrayStart = trimmed.indexOf("[");
    const objStart   = trimmed.indexOf("{");
    const start = arrayStart !== -1 && (objStart === -1 || arrayStart < objStart)
      ? arrayStart : objStart;

    if (start === -1) throw new Error("No JSON found in response");

    const isArray = trimmed[start] === "[";
    const closing = isArray ? "]" : "}";
    const end = trimmed.lastIndexOf(closing);
    if (end <= start) throw new Error("Malformed JSON in response");

    return JSON.parse(trimmed.slice(start, end + 1));
  }
}

/**
 * Build a compact ad context string included in every user prompt.
 */
function buildAdContext(ad: RemixAdInput, anatomy: RemixAnatomyInput | null): string {
  const lines: string[] = [
    "=== AD DATA ===",
    `Platform:     ${ad.platform}`,
    `Brand:        ${ad.brandName}`,
    `Product:      ${ad.productName ?? "Unknown"}`,
    `Niche:        ${ad.niche}`,
    `Ad Type:      ${ad.adType}`,
  ];

  if (ad.duration)   lines.push(`Duration:     ${ad.duration}s`);
  if (ad.hookText)   lines.push(`Hook Text:    "${ad.hookText}"`);
  if (ad.hookType)   lines.push(`Hook Type:    ${ad.hookType}`);
  if (ad.ctaText)    lines.push(`CTA:          "${ad.ctaText}"`);

  if (ad.estimatedSpendMin || ad.estimatedSpendMax) {
    const lo = ad.estimatedSpendMin ? `$${ad.estimatedSpendMin.toLocaleString()}` : "?";
    const hi = ad.estimatedSpendMax ? `$${ad.estimatedSpendMax.toLocaleString()}` : "?";
    lines.push(`Est. Spend:   ${lo}–${hi}/mo`);
  }

  lines.push(`Days Running: ${ad.daysRunning}`);
  lines.push(`Velocity:     ${ad.velocityScore}/100 (${ad.velocityTier})`);

  if (anatomy) {
    lines.push("", "=== ANATOMY ANALYSIS ===");

    if (anatomy.hookScore !== null) lines.push(`Hook Score:   ${anatomy.hookScore}/100`);

    if (anatomy.emotionalTriggers.length > 0) {
      lines.push(`Triggers:     ${anatomy.emotionalTriggers.join(", ")}`);
    }

    if (anatomy.funnelType)      lines.push(`Funnel Type:  ${anatomy.funnelType}`);
    if (anatomy.targetPsychology) lines.push(`Psychology:   ${anatomy.targetPsychology}`);
    if (anatomy.audioMood)        lines.push(`Audio Mood:   ${anatomy.audioMood}`);
    if (anatomy.pacingNotes)      lines.push(`Pacing:       ${anatomy.pacingNotes}`);

    if (anatomy.scriptStructure) {
      lines.push(`Script Flow:  ${anatomy.scriptStructure.formula}`);
    }
  }

  return lines.join("\n");
}

/**
 * Call Claude with retry logic.
 * The SDK handles HTTP-level retries (maxRetries: 3).
 * This adds one JSON-parse-level retry on top.
 */
async function callClaude<T>(
  systemPrompt: string,
  userPrompt:   string,
  validate:     (raw: unknown) => T,
): Promise<RemixEngineResult<T>> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    let response: Anthropic.Message;

    try {
      response = await anthropic.messages.create({
        model:      REMIX_MODEL,
        max_tokens: 4096,
        system:     systemPrompt,
        messages:   [{ role: "user", content: userPrompt }],
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

    const textBlock = response.content.find(
      (b): b is Anthropic.TextBlock => b.type === "text"
    );
    if (!textBlock) {
      lastError = new Error("Claude returned no text block");
      continue;
    }

    try {
      const raw     = extractJson(textBlock.text);
      const output  = validate(raw);

      return {
        output,
        tokensInput:  response.usage.input_tokens,
        tokensOutput: response.usage.output_tokens,
        model:        REMIX_MODEL,
      };
    } catch (parseErr) {
      lastError = parseErr instanceof Error ? parseErr : new Error(String(parseErr));
      console.warn(
        `[remixEngine] Parse failed (attempt ${attempt}):`,
        lastError.message,
        "\nRaw (first 600 chars):", textBlock.text.slice(0, 600)
      );
    }
  }

  throw lastError ?? new Error("Remix generation failed after retries");
}

// ─── Generator functions ──────────────────────────────────────────────────────

/**
 * Generate 8 hook variations, one per framework.
 */
export async function generateHooks(
  ad:      RemixAdInput,
  anatomy: RemixAnatomyInput | null,
  count:   number = 8,
): Promise<RemixEngineResult<HooksOutput>> {
  const context = buildAdContext(ad, anatomy);
  const userPrompt = [
    context,
    "",
    `Generate ${count} hook variations for this ad using the 8 frameworks specified in the system prompt.`,
    "Reference the target psychology and emotional triggers from the anatomy when crafting each hook.",
    "Return ONLY the JSON array.",
  ].join("\n");

  return callClaude(
    HOOKS_SYSTEM_PROMPT,
    userPrompt,
    (raw) => HooksOutputSchema.parse(raw),
  );
}

/**
 * Generate 3 full script variations with different creative angles.
 */
export async function generateScriptVariations(
  ad:      RemixAdInput,
  anatomy: RemixAnatomyInput | null,
  count:   number = 3,
): Promise<RemixEngineResult<ScriptsOutput>> {
  const context = buildAdContext(ad, anatomy);

  const scriptContext: string[] = [];
  if (anatomy?.fullScriptBreakdown?.length) {
    scriptContext.push("", "=== ORIGINAL SCRIPT BREAKDOWN ===");
    for (const line of anatomy.fullScriptBreakdown) {
      scriptContext.push(`[${line.timestamp}] ${line.action} | "${line.text}"`);
    }
  }

  const userPrompt = [
    context,
    ...scriptContext,
    "",
    `Generate ${count} complete script variations. Each must use a fundamentally different creative angle.`,
    `Target duration: ${ad.duration ? `${ad.duration} seconds` : "30 seconds (assumed — no original duration available)"}.`,
    "Return ONLY the JSON array.",
  ].join("\n");

  return callClaude(
    SCRIPTS_SYSTEM_PROMPT,
    userPrompt,
    (raw) => ScriptsOutputSchema.parse(raw),
  );
}

/**
 * Generate 4 platform-optimised ad copy sets, each with a different persuasion angle.
 */
export async function generateAdCopy(
  ad:      RemixAdInput,
  anatomy: RemixAnatomyInput | null,
  count:   number = 4,
): Promise<RemixEngineResult<AdCopyOutput>> {
  const context = buildAdContext(ad, anatomy);
  const userPrompt = [
    context,
    "",
    `Generate ${count} ad copy sets, each using a different persuasion angle from the system prompt list.`,
    `Platform context: optimise copy voice for ${ad.platform} (${
      ad.platform === "TIKTOK"
        ? "casual, punchy, emoji-friendly captions"
        : "direct-response body copy with clear benefit statements"
    }).`,
    "Return ONLY the JSON array.",
  ].join("\n");

  return callClaude(
    ADCOPY_SYSTEM_PROMPT,
    userPrompt,
    (raw) => AdCopyOutputSchema.parse(raw),
  );
}

/**
 * Generate one production-ready creative brief.
 */
export async function generateCreativeBrief(
  ad:      RemixAdInput,
  anatomy: RemixAnatomyInput | null,
): Promise<RemixEngineResult<CreativeBrief>> {
  const context = buildAdContext(ad, anatomy);

  const scriptContext: string[] = [];
  if (anatomy?.fullScriptBreakdown?.length) {
    scriptContext.push("", "=== ORIGINAL SCRIPT BREAKDOWN ===");
    for (const line of anatomy.fullScriptBreakdown) {
      scriptContext.push(`[${line.timestamp}] ${line.action} | "${line.text}"`);
    }
  }

  const userPrompt = [
    context,
    ...scriptContext,
    "",
    "Produce a single comprehensive creative brief that enables a production team to recreate a similar-but-fresh ad.",
    "Be specific and actionable in every field — this brief replaces a creative kickoff meeting.",
    "Return ONLY the JSON object.",
  ].join("\n");

  return callClaude(
    BRIEF_SYSTEM_PROMPT,
    userPrompt,
    (raw) => CreativeBriefSchema.parse(raw),
  );
}

/**
 * Generate 3 UGC script variations with different creator personas and angles.
 */
export async function generateUGCScripts(
  ad:      RemixAdInput,
  anatomy: RemixAnatomyInput | null,
  count:   number = 3,
): Promise<RemixEngineResult<UGCOutput>> {
  const context = buildAdContext(ad, anatomy);

  const scriptContext: string[] = [];
  if (anatomy?.fullScriptBreakdown?.length) {
    scriptContext.push("", "=== ORIGINAL SCRIPT BREAKDOWN ===");
    for (const line of anatomy.fullScriptBreakdown) {
      scriptContext.push(`[${line.timestamp}] ${line.action} | "${line.text}"`);
    }
  }

  const targetDuration = ad.duration
    ? `${ad.duration} seconds`
    : "30 seconds (assumed — no original duration)";

  const userPrompt = [
    context,
    ...scriptContext,
    "",
    `Generate ${count} UGC script variations inspired by this winning ad.`,
    `Target duration per script: ${targetDuration}.`,
    `Platform: ${ad.platform}.`,
    "",
    "Each variation must have a completely different creator persona, creative angle, and emotional arc.",
    "Every spoken word must sound natural and unscripted — avoid any marketing language.",
    "Return ONLY the JSON array.",
  ].join("\n");

  return callClaude(
    UGC_SYSTEM_PROMPT,
    userPrompt,
    (raw) => UGCOutputSchema.parse(raw),
  );
}

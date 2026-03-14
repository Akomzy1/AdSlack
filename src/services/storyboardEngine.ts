/**
 * storyboardEngine.ts
 *
 * Forge Remix Phase 5 — AI Visual Storyboard Generator.
 *
 * Extends the Creative Brief with a frame-by-frame visual production plan
 * that a video editor or UGC creator can follow without reading paragraphs.
 *
 * Uses claude-opus-4-6 (more complex structured output + longer context than
 * the sonnet-based remix functions).
 */

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { anthropic } from "@/lib/anthropic";
import { STORYBOARD_SYSTEM_PROMPT } from "@/constants/remixPrompts";
import type { RemixAdInput, RemixAnatomyInput, RemixEngineResult } from "./remixEngine";

// ─── Model ────────────────────────────────────────────────────────────────────

const STORYBOARD_MODEL = "claude-opus-4-6";

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const StoryboardFrameSchema = z.object({
  frameNumber:  z.number().int().min(1),
  timestamp:    z.string(),
  duration:     z.string(),
  shotType:     z.string(),
  cameraAngle:  z.string(),
  action:       z.string(),
  dialogue:     z.string().nullable(),
  textOverlay:  z.string().nullable(),
  textPosition: z.string().nullable(),
  musicMood:    z.string(),
  transitionTo: z.string(),
  notes:        z.string(),
});

const ProductionNotesSchema = z.object({
  lighting:        z.string(),
  wardrobe:        z.string(),
  props:           z.array(z.string()),
  location:        z.string(),
  equipment:       z.string(),
  editingStyle:    z.string(),
  musicSuggestion: z.string(),
});

const StoryboardSchema = z.object({
  title:           z.string(),
  totalDuration:   z.string(),
  aspectRatio:     z.string(),
  frames:          z.array(StoryboardFrameSchema).min(4).max(12),
  productionNotes: ProductionNotesSchema,
});

export type StoryboardFrame    = z.infer<typeof StoryboardFrameSchema>;
export type ProductionNotes    = z.infer<typeof ProductionNotesSchema>;
export type StoryboardOutput   = z.infer<typeof StoryboardSchema>;

// ─── Helper: re-use buildAdContext logic inline ───────────────────────────────

function buildStoryboardContext(
  ad:      RemixAdInput,
  anatomy: RemixAnatomyInput | null,
  brief?:  Record<string, unknown>,
): string {
  const lines: string[] = [
    "=== AD DATA ===",
    `Platform:     ${ad.platform}`,
    `Brand:        ${ad.brandName}`,
    `Product:      ${ad.productName ?? "Unknown"}`,
    `Niche:        ${ad.niche}`,
    `Ad Type:      ${ad.adType}`,
  ];

  if (ad.duration)  lines.push(`Duration:     ${ad.duration}s`);
  if (ad.hookText)  lines.push(`Hook Text:    "${ad.hookText}"`);
  if (ad.hookType)  lines.push(`Hook Type:    ${ad.hookType}`);
  if (ad.ctaText)   lines.push(`CTA:          "${ad.ctaText}"`);
  lines.push(`Days Running: ${ad.daysRunning}`);
  lines.push(`Velocity:     ${ad.velocityScore}/100 (${ad.velocityTier})`);

  if (ad.estimatedSpendMin || ad.estimatedSpendMax) {
    const lo = ad.estimatedSpendMin ? `$${ad.estimatedSpendMin.toLocaleString()}` : "?";
    const hi = ad.estimatedSpendMax ? `$${ad.estimatedSpendMax.toLocaleString()}` : "?";
    lines.push(`Est. Spend:   ${lo}–${hi}/mo`);
  }

  if (anatomy) {
    lines.push("", "=== ANATOMY ANALYSIS ===");
    if (anatomy.hookScore !== null)             lines.push(`Hook Score:   ${anatomy.hookScore}/100`);
    if (anatomy.emotionalTriggers.length > 0)  lines.push(`Triggers:     ${anatomy.emotionalTriggers.join(", ")}`);
    if (anatomy.funnelType)                     lines.push(`Funnel Type:  ${anatomy.funnelType}`);
    if (anatomy.targetPsychology)               lines.push(`Psychology:   ${anatomy.targetPsychology}`);
    if (anatomy.audioMood)                      lines.push(`Audio Mood:   ${anatomy.audioMood}`);
    if (anatomy.pacingNotes)                    lines.push(`Pacing:       ${anatomy.pacingNotes}`);
    if (anatomy.scriptStructure)                lines.push(`Script Flow:  ${anatomy.scriptStructure.formula}`);

    if (anatomy.fullScriptBreakdown?.length) {
      lines.push("", "=== ORIGINAL SCRIPT BREAKDOWN ===");
      for (const line of anatomy.fullScriptBreakdown) {
        lines.push(`[${line.timestamp}] ${line.action} | "${line.text}"`);
      }
    }
  }

  if (brief) {
    lines.push("", "=== CREATIVE BRIEF (for reference) ===");
    if (typeof brief.overview === "string")   lines.push(`Overview: ${brief.overview}`);
    if (typeof brief.keyMessage === "string") lines.push(`Key Message: ${brief.keyMessage}`);
    if (typeof brief.toneAndStyle === "string") lines.push(`Tone: ${brief.toneAndStyle}`);
  }

  return lines.join("\n");
}

/**
 * Extract the first valid JSON object from a string.
 * Handles cases where Claude prepends/appends explanation text.
 */
function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const objStart = trimmed.indexOf("{");
    if (objStart === -1) throw new Error("No JSON object found in response");
    const end = trimmed.lastIndexOf("}");
    if (end <= objStart) throw new Error("Malformed JSON in response");
    return JSON.parse(trimmed.slice(objStart, end + 1));
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Generate a visual storyboard from ad data, anatomy, and optionally a
 * previously generated creative brief.
 */
export async function generateStoryboard(
  ad:      RemixAdInput,
  anatomy: RemixAnatomyInput | null,
  brief?:  Record<string, unknown>,
): Promise<RemixEngineResult<StoryboardOutput>> {
  const context = buildStoryboardContext(ad, anatomy, brief);

  const targetDuration = ad.duration
    ? `${ad.duration} seconds`
    : "30 seconds (assumed — no original duration available)";

  const aspectRatioHint =
    ad.platform === "YOUTUBE"  ? "16:9" :
    ad.platform === "FACEBOOK" ? "1:1 or 9:16" :
    "9:16";

  const userPrompt = [
    context,
    "",
    `Generate a complete frame-by-frame visual storyboard for a NEW ad inspired by this winning ad.`,
    `Target duration: ${targetDuration}.`,
    `Target aspect ratio: ${aspectRatioHint}.`,
    `Platform: ${ad.platform}.`,
    "",
    "Requirements:",
    "- 6–10 frames covering the full duration with no time gaps",
    "- Every frame must be hyper-specific — a video editor should be able to execute it exactly",
    "- Dialogue must be exact spoken words, not descriptions",
    "- Text overlays must be exact copy",
    "- Build toward a strong CTA in the final frames",
    "- Production notes must be immediately actionable",
    "",
    "Return ONLY the JSON object.",
  ].join("\n");

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    let response: Anthropic.Message;

    try {
      response = await anthropic.messages.create({
        model:      STORYBOARD_MODEL,
        max_tokens: 8192, // storyboards are verbose
        system:     STORYBOARD_SYSTEM_PROMPT,
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
      const raw    = extractJson(textBlock.text);
      const output = StoryboardSchema.parse(raw);

      return {
        output,
        tokensInput:  response.usage.input_tokens,
        tokensOutput: response.usage.output_tokens,
        model:        STORYBOARD_MODEL,
      };
    } catch (parseErr) {
      lastError = parseErr instanceof Error ? parseErr : new Error(String(parseErr));
      console.warn(
        `[storyboardEngine] Parse failed (attempt ${attempt}):`,
        lastError.message,
        "\nRaw (first 800 chars):", textBlock.text.slice(0, 800)
      );
    }
  }

  throw lastError ?? new Error("Storyboard generation failed after retries");
}

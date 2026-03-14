import Anthropic from "@anthropic-ai/sdk";

/**
 * Singleton Anthropic client — reused across hot-reload cycles in dev.
 * Reads ANTHROPIC_API_KEY from the environment automatically.
 */

const globalForAnthropic = globalThis as unknown as {
  anthropic: Anthropic | undefined;
};

export const anthropic =
  globalForAnthropic.anthropic ??
  new Anthropic({
    // apiKey defaults to process.env.ANTHROPIC_API_KEY
    maxRetries: 3,
    timeout:    120_000, // 2-minute timeout for complex analysis
  });

if (process.env.NODE_ENV !== "production") {
  globalForAnthropic.anthropic = anthropic;
}

import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import type { Analysis } from "@/lib/schemas";
import { GRAMMAR_MODEL, FAST_MODEL } from "@/lib/constants";
import { hasOpenAI } from "@/lib/openai";
import * as openai from "@/lib/openai";
import * as anthropic from "@/lib/anthropic";

// Grammar-correction facade with a LIVE fallback: try OpenAI (GPT-4o-mini)
// first, and if that request fails, retry on Anthropic (Haiku). When no OpenAI
// key is configured, it goes straight to Anthropic.

/** The provider grammar corrections are attempted on first. */
export function grammarProvider(): "openai" | "anthropic" {
  return hasOpenAI() ? "openai" : "anthropic";
}

/** The model id the primary provider will use for grammar calls. */
export function grammarModel(): string {
  return hasOpenAI() ? GRAMMAR_MODEL : FAST_MODEL;
}

// Runs `op` on OpenAI first (if configured); on any failure, logs it and retries
// the same op on Anthropic. `label` names the operation in the logs.
async function withFallback<T>(
  label: string,
  runOpenAI: () => Promise<T>,
  runAnthropic: () => Promise<T>,
): Promise<T> {
  if (hasOpenAI()) {
    try {
      console.log(`[grammar] ${label} → openai / ${GRAMMAR_MODEL}`);
      return await runOpenAI();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(
        `[grammar] ${label} openai failed (${msg}) → falling back to anthropic / ${FAST_MODEL}`,
      );
      return await runAnthropic();
    }
  }
  console.log(`[grammar] ${label} → anthropic / ${FAST_MODEL}`);
  return await runAnthropic();
}

export function correctText(originalText: string): Promise<string> {
  return withFallback(
    "correctText",
    () => openai.correctText(originalText),
    () => anthropic.correctText(originalText),
  );
}

export function distill(originalText: string): Promise<Analysis> {
  return withFallback(
    "distill",
    () => openai.distill(originalText),
    () => anthropic.distill(originalText),
  );
}

// Provider-agnostic error classification for the API route, since the two SDKs
// throw different error types.
export function isRateLimitError(err: unknown): boolean {
  return err instanceof OpenAI.RateLimitError || err instanceof Anthropic.RateLimitError;
}

export function isBadRequestError(err: unknown): err is Error {
  return err instanceof OpenAI.BadRequestError || err instanceof Anthropic.BadRequestError;
}

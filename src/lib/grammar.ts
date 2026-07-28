import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import type { Analysis } from "@/lib/schemas";
import { hasOpenAI } from "@/lib/openai";
import * as openai from "@/lib/openai";
import * as anthropic from "@/lib/anthropic";

// Grammar-correction facade. Uses OpenAI (GPT-4o-mini) when OPENAI_API_KEY is
// configured, otherwise falls back to Anthropic (Haiku). The choice is made per
// call so it always reflects the current environment.

/** Which provider grammar corrections currently route through. */
export function grammarProvider(): "openai" | "anthropic" {
  return hasOpenAI() ? "openai" : "anthropic";
}

export function correctText(originalText: string): Promise<string> {
  return hasOpenAI()
    ? openai.correctText(originalText)
    : anthropic.correctText(originalText);
}

export function distill(originalText: string): Promise<Analysis> {
  return hasOpenAI() ? openai.distill(originalText) : anthropic.distill(originalText);
}

// Provider-agnostic error classification for the API route, since the two SDKs
// throw different error types.
export function isRateLimitError(err: unknown): boolean {
  return err instanceof OpenAI.RateLimitError || err instanceof Anthropic.RateLimitError;
}

export function isBadRequestError(err: unknown): err is Error {
  return err instanceof OpenAI.BadRequestError || err instanceof Anthropic.BadRequestError;
}

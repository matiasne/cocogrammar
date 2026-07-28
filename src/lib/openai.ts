import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { GRAMMAR_MODEL } from "@/lib/constants";
import { AnalysisSchema, type Analysis } from "@/lib/schemas";

// Reads OPENAI_API_KEY from the environment.
export const openai = new OpenAI();

// Fast, focused call: just the corrected text. Kept small (plain text, low
// max_tokens, no structured schema) so it returns as quickly as possible.
const CORRECT_SYSTEM_PROMPT = `You are an expert writing teacher. Given a learner's
text, return ONLY a corrected version in the SAME language: fix all grammar and
spelling errors while preserving the learner's meaning, tone, and voice. Do not
translate, paraphrase heavily, or add new ideas. Do not explain — output only the
corrected text, nothing else.`;

export async function correctText(originalText: string): Promise<string> {
  const res = await openai.chat.completions.create({
    model: GRAMMAR_MODEL,
    max_completion_tokens: 1024,
    messages: [
      { role: "system", content: CORRECT_SYSTEM_PROMPT },
      { role: "user", content: originalText },
    ],
  });

  const text = res.choices[0]?.message?.content?.trim() ?? "";
  if (!text) throw new Error("Model returned no corrected text");
  return text;
}

// Heavier call: the full coaching analysis. Runs after the correction is shown.
const ANALYSIS_SYSTEM_PROMPT = `You are an expert, encouraging writing teacher.
Analyze the learner's text as writing coaching: estimate the CEFR level, note grammar
mistakes (with the exact offending excerpt, a correction, and a short learner-friendly
explanation), list spelling typos, summarize the grammar in a couple of sentences, and
call out concrete strengths. Be precise about excerpts — quote the learner's own
wording. Be generous but honest about strengths. If the text is already correct, return
empty mistake/typo lists.`;

export async function distill(originalText: string): Promise<Analysis> {
  const res = await openai.chat.completions.parse({
    model: GRAMMAR_MODEL,
    max_completion_tokens: 4096,
    messages: [
      { role: "system", content: ANALYSIS_SYSTEM_PROMPT },
      { role: "user", content: originalText },
    ],
    response_format: zodResponseFormat(AnalysisSchema, "analysis"),
  });

  const parsed = res.choices[0]?.message?.parsed;
  if (!parsed) {
    throw new Error("Model did not return structured output for the analysis");
  }
  return parsed;
}

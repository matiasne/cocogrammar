import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { MODEL, FAST_MODEL } from "@/lib/constants";
import {
  AnalysisSchema,
  CourseSchema,
  GradeSchema,
  type Analysis,
  type Course,
  type Grade,
} from "@/lib/schemas";

// Reads ANTHROPIC_API_KEY from the environment.
export const anthropic = new Anthropic();

// Per-sentence grammar correction + analysis run on OpenAI GPT-4o-mini when an
// OpenAI key is configured (see `@/lib/openai`), otherwise they fall back to the
// Anthropic implementations below (`correctText`, `distill`). The grammar facade
// in `@/lib/grammar` picks the provider. This file also owns the always-Anthropic
// paths: chapter grading and course generation.

// Fast, focused call: just the corrected text, in the same language.
const CORRECT_SYSTEM_PROMPT = `You are an expert writing teacher. Given a learner's
text, return ONLY a corrected version in the SAME language: fix all grammar and
spelling errors while preserving the learner's meaning, tone, and voice. Do not
translate, paraphrase heavily, or add new ideas. Do not explain — output only the
corrected text, nothing else.`;

export async function correctText(originalText: string): Promise<string> {
  const res = await anthropic.messages.create({
    model: FAST_MODEL,
    max_tokens: 1024,
    system: CORRECT_SYSTEM_PROMPT,
    messages: [{ role: "user", content: originalText }],
  });

  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
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
  const res = await anthropic.messages.parse({
    model: FAST_MODEL,
    max_tokens: 4096,
    system: ANALYSIS_SYSTEM_PROMPT,
    messages: [{ role: "user", content: originalText }],
    output_config: { format: zodOutputFormat(AnalysisSchema) },
  });

  if (!res.parsed_output) {
    throw new Error("Model did not return structured output for the analysis");
  }
  return res.parsed_output;
}

// Grades a learner's answer to a chapter challenge against the model answer.
const GRADE_SYSTEM_PROMPT = `You are grading a language learner's answer to a grammar
exercise. You are given the exercise prompt, the model (correct) answer, and the
learner's answer. Judge whether the learner's answer is essentially correct FOR THE
GRAMMAR POINT the exercise targets:
- Be lenient about case, punctuation, spacing, and harmless phrasing differences.
- Be strict about the actual grammar point (verb tense, agreement, article, etc.).
- "correct": the answer gets the grammar point right.
- "partial": close, but the targeted grammar point is not fully right.
- "wrong": the grammar point is missed.
Give one short feedback line that explains why, guiding the learner — do NOT just print
the model answer verbatim.`;

export async function gradeAnswer(
  prompt: string,
  modelAnswer: string,
  userAnswer: string,
): Promise<Grade> {
  const res = await anthropic.messages.parse({
    model: FAST_MODEL,
    max_tokens: 512,
    system: GRADE_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Exercise prompt:
"""
${prompt}
"""

Model answer:
"""
${modelAnswer}
"""

Learner's answer:
"""
${userAnswer}
"""

Grade the learner's answer.`,
      },
    ],
    output_config: { format: zodOutputFormat(GradeSchema) },
  });

  if (!res.parsed_output) {
    throw new Error("Model did not return structured output for the grade");
  }
  return res.parsed_output;
}

const COURSE_SYSTEM_PROMPT = `You are a curriculum designer for writing learners.
You are given a structured summary of ONE learner's recurring writing weaknesses,
drawn from many past submissions. Design a short, personalized course that targets
their most frequent and impactful weaknesses. Each module should focus on one weakness,
explain why it matters for THIS learner (referencing their real error patterns), and
include a handful of concrete practice exercises with model answers. Order modules by
impact. Keep it motivating and achievable.`;

export async function generateCourse(weaknessSummary: string): Promise<Course> {
  const res = await anthropic.messages.parse({
    model: MODEL,
    max_tokens: 8000,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "high",
      format: zodOutputFormat(CourseSchema),
    },
    system: COURSE_SYSTEM_PROMPT,
    messages: [{ role: "user", content: weaknessSummary }],
  });

  if (!res.parsed_output) {
    throw new Error("Model did not return structured output for course generation");
  }
  return res.parsed_output;
}

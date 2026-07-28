import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { MODEL, FAST_MODEL } from "@/lib/constants";
import {
  CourseSchema,
  GradeSchema,
  type Course,
  type Grade,
} from "@/lib/schemas";

// Reads ANTHROPIC_API_KEY from the environment.
export const anthropic = new Anthropic();

// NOTE: per-sentence grammar correction + analysis (`correctText`, `distill`)
// now run on OpenAI GPT-4o-mini — see `@/lib/openai`. This file keeps the
// Anthropic-only paths: chapter grading and course generation.

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

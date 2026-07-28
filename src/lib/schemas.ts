import { z } from "zod/v4";

// ---------------------------------------------------------------------------
// Correct + distill (the writing-analysis agent)
// ---------------------------------------------------------------------------

export const MISTAKE_CATEGORIES = [
  "grammar",
  "tense",
  "agreement",
  "word-order",
  "preposition",
  "article",
  "vocabulary",
  "punctuation",
  "other",
] as const;

export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

export const MistakeSchema = z.object({
  category: z.enum(MISTAKE_CATEGORIES),
  excerpt: z.string().describe("The exact fragment of the user's text that is wrong."),
  correction: z.string().describe("The corrected version of that fragment."),
  explanation: z.string().describe("A short, learner-friendly explanation of the error."),
});

export const TypoSchema = z.object({
  original: z.string(),
  corrected: z.string(),
});

export const AnalysisSchema = z.object({
  levelEstimate: z.enum(CEFR_LEVELS).describe("Estimated CEFR level of the writing."),
  grammarNotes: z.string().describe("A short prose summary of the writing's grammar."),
  mistakes: z.array(MistakeSchema).describe("Grammar mistakes found in the text."),
  typos: z.array(TypoSchema).describe("Spelling typos found in the text."),
  strengths: z.array(z.string()).describe("Things the user did well."),
});

// ---------------------------------------------------------------------------
// Personalized course (the second agent)
// ---------------------------------------------------------------------------

export const EXERCISE_TYPES = ["rewrite", "fill-blank", "correct", "explain"] as const;

export const ExerciseSchema = z.object({
  prompt: z.string().describe("The exercise question or instruction shown to the learner."),
  type: z.enum(EXERCISE_TYPES),
  answer: z.string().describe("The model answer, revealed after the learner attempts it."),
});

export const ChapterSchema = z.object({
  category: z
    .enum(MISTAKE_CATEGORIES)
    .describe(
      "The single mistake category this chapter targets. Must be one of the learner's actual error categories, since the data behind this category is removed when the chapter is completed.",
    ),
  title: z.string(),
  focusArea: z.string().describe("The weakness this chapter targets (e.g. 'past-tense verbs')."),
  why: z.string().describe("Why this matters for this specific learner, grounded in their errors."),
  exercises: z.array(ExerciseSchema),
});

export const CourseSchema = z.object({
  title: z.string(),
  summary: z.string(),
  level: z.enum(CEFR_LEVELS),
  // One chapter per targeted mistake category; do not repeat a category.
  chapters: z.array(ChapterSchema),
});

// ---------------------------------------------------------------------------
// Challenge grading (interactive chapter quiz)
// ---------------------------------------------------------------------------

export const GRADE_VERDICTS = ["correct", "partial", "wrong"] as const;

export const GradeSchema = z.object({
  verdict: z.enum(GRADE_VERDICTS),
  feedback: z
    .string()
    .describe("One short line telling the learner why their answer is right or wrong. Do NOT reveal the model answer verbatim."),
});

export type Grade = z.infer<typeof GradeSchema>;

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type Mistake = z.infer<typeof MistakeSchema>;
export type Typo = z.infer<typeof TypoSchema>;
export type Analysis = z.infer<typeof AnalysisSchema>;
export type Exercise = z.infer<typeof ExerciseSchema>;
export type Chapter = z.infer<typeof ChapterSchema>;
export type Course = z.infer<typeof CourseSchema>;
export type MistakeCategory = (typeof MISTAKE_CATEGORIES)[number];

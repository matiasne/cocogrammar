import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { db } from "@/db";
import { submissions, distillations } from "@/db/schema";
import { gradeAnswer } from "@/lib/anthropic";
import { embed, distillationSignature } from "@/lib/embeddings";
import { requireUser, unauthorized, UnauthorizedError } from "@/lib/auth";
import { MISTAKE_CATEGORIES, type Analysis } from "@/lib/schemas";

export const runtime = "nodejs";

const BodySchema = z.object({
  prompt: z.string().min(1),
  answer: z.string().min(1), // the model answer
  userAnswer: z.string().min(1),
  category: z.enum(MISTAKE_CATEGORIES),
});

export async function POST(req: Request) {
  let input: z.infer<typeof BodySchema>;
  try {
    input = BodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const user = await requireUser();
    const grade = await gradeAnswer(input.prompt, input.answer, input.userAnswer);

    // Record wrong/partial answers as new learning data so they feed the next
    // course — a missed challenge becomes a "slip" like a bad sentence does.
    // NOTE: this deliberately does NOT touch the sentence quota counter.
    if (grade.verdict !== "correct") {
      try {
        await recordMiss(user.id, input, grade.feedback);
      } catch (err) {
        // Bookkeeping only — never fail the quiz on this.
        console.error("failed to record challenge miss:", err);
      }
    }

    return NextResponse.json(grade);
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorized();
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "Rate limited, try again shortly" }, { status: 429 });
    }
    if (err instanceof Anthropic.BadRequestError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("grade route error:", err);
    return NextResponse.json({ error: "Failed to grade answer" }, { status: 500 });
  }
}

// Persist a missed challenge as a submission + distillation in the chapter's
// category, mirroring the correction flow so the course agent picks it up.
async function recordMiss(
  userId: string,
  input: z.infer<typeof BodySchema>,
  feedback: string,
): Promise<void> {
  const analysis: Analysis = {
    levelEstimate: "B1",
    grammarNotes: `Missed challenge (${input.category}): ${feedback}`,
    mistakes: [
      {
        category: input.category,
        excerpt: input.userAnswer,
        correction: input.answer,
        explanation: feedback,
      },
    ],
    typos: [],
    strengths: [],
  };

  const [submission] = await db
    .insert(submissions)
    .values({
      userId,
      originalText: input.userAnswer,
      correctedText: input.answer,
    })
    .returning({ id: submissions.id });

  const embedding = await embed(distillationSignature(analysis));
  await db.insert(distillations).values({
    submissionId: submission.id,
    userId,
    levelEstimate: analysis.levelEstimate,
    mistakes: analysis.mistakes,
    typos: analysis.typos,
    strengths: analysis.strengths,
    grammarNotes: analysis.grammarNotes,
    rawAnalysis: analysis,
    embedding,
  });
}

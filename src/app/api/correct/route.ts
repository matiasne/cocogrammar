import { sql, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { submissions, distillations, users } from "@/db/schema";
import {
  correctText,
  distill,
  isRateLimitError,
  isBadRequestError,
} from "@/lib/grammar";
import { embed, distillationSignature } from "@/lib/embeddings";
import { requireUser, unauthorized, UnauthorizedError } from "@/lib/auth";

export const runtime = "nodejs";

// Free tier: 10 sentence checks. Subscribers are unlimited.
const FREE_SENTENCE_LIMIT = 10;

const BodySchema = z.object({
  text: z.string().min(1, "Text is required"),
});

// Streams newline-delimited JSON so the corrected sentence shows first, then the
// analysis. Events:
//   {"type":"corrected","correctedText":...}
//   {"type":"analysis","analysis":...,"submissionId":...}
//   {"type":"error","error":...}
export async function POST(req: Request) {
  let input: z.infer<typeof BodySchema>;
  try {
    input = BodySchema.parse(await req.json());
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Auth + quota BEFORE the stream: the client checks `!res.ok` before reading
  // the body, so a 402 must be a plain response, not a stream event.
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorized();
    throw err;
  }

  if (!user.isSubscribed && user.sentencesUsed >= FREE_SENTENCE_LIMIT) {
    return Response.json(
      {
        error: "You've used all 10 free sentence checks. Subscribe for unlimited.",
        paywall: true,
      },
      { status: 402 },
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));

      try {
        // 1. Fast correction first.
        const correctedText = await correctText(input.text);
        send({ type: "corrected", correctedText });

        // 2. Heavier analysis next.
        const analysis = await distill(input.text);

        // 3. Persist everything (submission + distillation + embedding).
        const [submission] = await db
          .insert(submissions)
          .values({
            userId: user.id,
            originalText: input.text,
            correctedText,
          })
          .returning({ id: submissions.id });

        const embedding = await embed(distillationSignature(analysis));
        await db.insert(distillations).values({
          submissionId: submission.id,
          userId: user.id,
          levelEstimate: analysis.levelEstimate,
          mistakes: analysis.mistakes,
          typos: analysis.typos,
          strengths: analysis.strengths,
          grammarNotes: analysis.grammarNotes,
          rawAnalysis: analysis,
          embedding,
        });

        // Count this check against the free quota (atomic).
        await db
          .update(users)
          .set({ sentencesUsed: sql`${users.sentencesUsed} + 1` })
          .where(eq(users.id, user.id));

        send({ type: "analysis", analysis, submissionId: submission.id });
      } catch (err) {
        let message = "Something went wrong";
        if (isRateLimitError(err)) message = "Rate limited, try again shortly";
        else if (isBadRequestError(err)) message = err.message;
        else console.error("correct route error:", err);
        send({ type: "error", error: message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}

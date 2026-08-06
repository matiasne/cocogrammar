import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { distillations } from "@/db/schema";
import { requireUser, unauthorized, UnauthorizedError } from "@/lib/auth";

export const runtime = "nodejs";

// Records the learner's thumbs up/down on a correction's "Why it slipped"
// analysis. 'down' deprioritizes that submission's weaknesses when a course is
// generated (see buildWeaknessSummary in the course route).
const BodySchema = z.object({
  submissionId: z.string().uuid(),
  feedback: z.enum(["up", "down"]),
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

    // Scope the update to THIS user's distillation for that submission, so a
    // learner can only rate their own corrections.
    const updated = await db
      .update(distillations)
      .set({ feedback: input.feedback })
      .where(
        and(
          eq(distillations.submissionId, input.submissionId),
          eq(distillations.userId, user.id),
        ),
      )
      .returning({ id: distillations.id });

    if (updated.length === 0) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorized();
    console.error("feedback POST error:", err);
    return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { finishChapter } from "@/db/queries";
import { requireUser, unauthorized, UnauthorizedError } from "@/lib/auth";

export const runtime = "nodejs";

const BodySchema = z.object({
  chapterId: z.string().uuid(),
});

// Finishing a chapter deletes the chapter and the learning data (distillations
// + now-orphaned submissions) for that chapter's mistake category.
export async function POST(req: Request) {
  let input: z.infer<typeof BodySchema>;
  try {
    input = BodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const user = await requireUser();
    const { found, courseRemoved } = await finishChapter(user.id, input.chapterId);
    if (!found) {
      return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, courseRemoved });
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorized();
    console.error("finish chapter error:", err);
    return NextResponse.json({ error: "Failed to finish chapter" }, { status: 500 });
  }
}

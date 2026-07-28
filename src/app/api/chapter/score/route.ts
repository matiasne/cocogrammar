import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { chapters } from "@/db/schema";
import { requireUser, unauthorized, UnauthorizedError } from "@/lib/auth";

export const runtime = "nodejs";

const BodySchema = z.object({
  chapterId: z.string().uuid(),
  score: z.number().int().min(1).max(3),
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
    const updated = await db
      .update(chapters)
      .set({ score: input.score })
      .where(
        and(eq(chapters.id, input.chapterId), eq(chapters.userId, user.id)),
      )
      .returning({ id: chapters.id });

    if (updated.length === 0) {
      return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorized();
    console.error("score route error:", err);
    return NextResponse.json({ error: "Failed to save score" }, { status: 500 });
  }
}

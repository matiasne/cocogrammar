import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/db";
import { courses, chapters, users } from "@/db/schema";
import {
  getAllDistillations,
  getLatestCourse,
  clearLearningData,
} from "@/db/queries";
import { generateCourse } from "@/lib/anthropic";
import { cosineSearch } from "@/lib/embeddings";
import { requireUser, unauthorized, UnauthorizedError } from "@/lib/auth";
import type { Mistake } from "@/lib/schemas";

export const runtime = "nodejs";

// Free tier: 4 course generations. Subscribers are unlimited.
const FREE_COURSE_LIMIT = 4;

type ClusterRow = { grammarNotes: string; mistakes: unknown };

/**
 * Aggregate a user's distillations into a compact weakness summary for the
 * course agent. Uses pgvector similarity to surface the most representative
 * recurring-error cluster, plus a category-frequency breakdown.
 *
 * Submissions the learner thumbs-DOWNED (distillation.feedback === "down") are
 * kept but split into a LOW PRIORITY section, so the agent still sees them but
 * ranks their categories below the weaknesses the learner didn't push back on.
 */
function buildWeaknessSummary(
  distills: Awaited<ReturnType<typeof getAllDistillations>>,
  cluster: ClusterRow[],
): string {
  const levels: string[] = [];
  // Category frequency, tracked separately for normal vs thumbs-down submissions.
  const highCounts = new Map<string, number>();
  const lowCounts = new Map<string, number>();
  const exampleByCategory = new Map<string, Mistake>();

  for (const d of distills) {
    levels.push(d.levelEstimate);
    // A thumbs-down means the learner disagreed this was a real weakness worth
    // focusing on — count it toward the low-priority bucket instead.
    const counts = d.feedback === "down" ? lowCounts : highCounts;
    for (const m of d.mistakes) {
      counts.set(m.category, (counts.get(m.category) ?? 0) + 1);
      if (!exampleByCategory.has(m.category)) exampleByCategory.set(m.category, m);
    }
  }

  const formatCategories = (counts: Map<string, number>) =>
    [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => {
        const ex = exampleByCategory.get(category);
        const example = ex
          ? ` e.g. "${ex.excerpt}" → "${ex.correction}" (${ex.explanation})`
          : "";
        return `- ${category}: ${count} occurrence(s).${example}`;
      })
      .join("\n");

  const topCategories = formatCategories(highCounts);
  const lowPriorityCategories = formatCategories(lowCounts);

  // Only surface the cluster from submissions the learner didn't thumbs-down,
  // so the "representative recurring issue" isn't one they dismissed.
  const clusterText = cluster
    .map((c) => {
      const ms = (c.mistakes as Mistake[] | null) ?? [];
      const mistakeText = ms.map((m) => `${m.category}: ${m.explanation}`).join("; ");
      return `- ${c.grammarNotes}${mistakeText ? ` [${mistakeText}]` : ""}`;
    })
    .join("\n");

  const lowPrioritySection = lowPriorityCategories
    ? `\n\nLOW PRIORITY — the learner reacted "not helpful" (thumbs-down) to these corrections. Only address them if they overlap the high-priority weaknesses; otherwise give them little or no coverage:
${lowPriorityCategories}`
    : "";

  return `Learner weakness summary (${distills.length} past submissions).

Estimated levels over time (oldest→newest): ${[...levels].reverse().join(", ")}

HIGH PRIORITY — most frequent mistake categories (focus the course here):
${topCategories || "- (none recorded)"}

A cluster of the learner's most similar recurring writing issues:
${clusterText || "- (no cluster available)"}${lowPrioritySection}

Design a personalized course targeting the HIGH PRIORITY weaknesses first.`;
}

export async function POST() {
  try {
    const user = await requireUser();

    // Free-tier course cap, checked before the (expensive) Opus generation.
    if (!user.isSubscribed && user.coursesUsed >= FREE_COURSE_LIMIT) {
      return NextResponse.json(
        {
          error: "You've used all 4 free course generations. Subscribe for unlimited.",
          paywall: true,
        },
        { status: 402 },
      );
    }

    const distills = await getAllDistillations(user.id);
    if (distills.length === 0) {
      return NextResponse.json(
        { error: "No submissions yet — write and analyze some text first." },
        { status: 400 },
      );
    }

    // Use the most recent distillation's embedding as the query point to find
    // the cluster of the learner's most similar recurring issues.
    const queryEmbedding = distills[0].embedding as number[];
    const cluster = await cosineSearch(user.id, queryEmbedding, 5);

    const summary = buildWeaknessSummary(distills, cluster);
    const course = await generateCourse(summary);

    // One chapter per category — dedupe defensively so two chapters can't own
    // the same category's data.
    const seen = new Set<string>();
    const uniqueChapters = course.chapters.filter((ch) => {
      if (seen.has(ch.category)) return false;
      seen.add(ch.category);
      return true;
    });

    // Replace any prior course for this user (a fresh course supersedes it).
    const result = await db.transaction(async (tx) => {
      await tx.delete(courses).where(eq(courses.userId, user.id));

      const [courseRow] = await tx
        .insert(courses)
        .values({
          userId: user.id,
          title: course.title,
          summary: course.summary,
          level: course.level,
        })
        .returning();

      if (uniqueChapters.length > 0) {
        await tx.insert(chapters).values(
          uniqueChapters.map((ch, i) => ({
            courseId: courseRow.id,
            userId: user.id,
            category: ch.category,
            orderIndex: i,
            content: ch,
          })),
        );
      }

      // Count this generation against the free quota (atomic, in-txn).
      await tx
        .update(users)
        .set({ coursesUsed: sql`${users.coursesUsed} + 1` })
        .where(eq(users.id, user.id));

      return courseRow.id;
    });

    const saved = await getLatestCourse(user.id);
    return NextResponse.json({ course: saved, courseId: result });
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorized();
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "Rate limited, try again shortly" }, { status: 429 });
    }
    console.error("course POST error:", err);
    return NextResponse.json({ error: "Failed to generate course" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const user = await requireUser();
    const latest = await getLatestCourse(user.id);
    if (!latest) {
      return NextResponse.json({ error: "No course generated yet" }, { status: 404 });
    }
    return NextResponse.json({ course: latest });
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorized();
    console.error("course GET error:", err);
    return NextResponse.json({ error: "Failed to load course" }, { status: 500 });
  }
}

// Finishing a course wipes the user's learning data (submissions, distillations,
// and courses) — that history is no longer useful once the course is done.
export async function DELETE() {
  try {
    const user = await requireUser();
    await clearLearningData(user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorized();
    console.error("course DELETE error:", err);
    return NextResponse.json({ error: "Failed to clear data" }, { status: 500 });
  }
}

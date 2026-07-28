import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { submissions, distillations, courses, chapters } from "@/db/schema";
import type { Analysis, Chapter } from "@/lib/schemas";

export type HistoryItem = {
  submissionId: string;
  originalText: string;
  correctedText: string;
  createdAt: Date;
  analysis: Analysis;
};

/** Demo user's submissions joined with their distillation, newest first. */
export async function getHistory(
  userId: string,
  limit = 10,
  offset = 0,
): Promise<HistoryItem[]> {
  const rows = await db
    .select({
      submissionId: submissions.id,
      originalText: submissions.originalText,
      correctedText: submissions.correctedText,
      createdAt: submissions.createdAt,
      rawAnalysis: distillations.rawAnalysis,
    })
    .from(submissions)
    .innerJoin(distillations, eq(distillations.submissionId, submissions.id))
    .where(eq(submissions.userId, userId))
    .orderBy(desc(submissions.createdAt))
    .limit(limit)
    .offset(offset);

  return rows.map((r) => ({
    submissionId: r.submissionId,
    originalText: r.originalText,
    correctedText: r.correctedText,
    createdAt: r.createdAt,
    analysis: r.rawAnalysis as Analysis,
  }));
}

/** Total number of logged submissions for a user (for pagination). */
export async function countHistory(userId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(submissions)
    .innerJoin(distillations, eq(distillations.submissionId, submissions.id))
    .where(eq(submissions.userId, userId));
  return row?.count ?? 0;
}

/** All of a user's distillations (for the course agent). */
export async function getAllDistillations(userId: string) {
  return db
    .select()
    .from(distillations)
    .where(eq(distillations.userId, userId))
    .orderBy(desc(distillations.createdAt));
}

export type ChapterView = {
  id: string;
  category: string;
  orderIndex: number;
  content: Chapter;
  score: number | null;
};

export type CourseWithChapters = {
  courseId: string;
  title: string;
  summary: string;
  level: string;
  // Total chapters the course was generated with (fixed; does not shrink as
  // chapters are finished). Derived from the highest orderIndex still present.
  totalChapters: number;
  chapters: ChapterView[];
};

/** Latest persisted course for a user, with its (remaining) chapters, or null. */
export async function getLatestCourse(
  userId: string,
): Promise<CourseWithChapters | null> {
  const [course] = await db
    .select()
    .from(courses)
    .where(eq(courses.userId, userId))
    .orderBy(desc(courses.createdAt))
    .limit(1);

  if (!course) return null;

  const chapterRows = await db
    .select()
    .from(chapters)
    .where(eq(chapters.courseId, course.id))
    .orderBy(asc(chapters.orderIndex));

  const totalChapters = chapterRows.reduce(
    (max, c) => Math.max(max, c.orderIndex + 1),
    0,
  );

  return {
    courseId: course.id,
    title: course.title,
    summary: course.summary,
    level: course.level,
    totalChapters,
    chapters: chapterRows.map((c) => ({
      id: c.id,
      category: c.category,
      orderIndex: c.orderIndex,
      content: c.content,
      score: c.score,
    })),
  };
}

/**
 * Finish a chapter: delete the chapter row and all learning data (distillations
 * and now-orphaned submissions) for that chapter's mistake category. If the
 * parent course has no chapters left afterward, delete the course too.
 * Returns whether the course was also removed.
 */
export async function finishChapter(
  userId: string,
  chapterId: string,
): Promise<{ found: boolean; courseRemoved: boolean }> {
  return db.transaction(async (tx) => {
    const [chapter] = await tx
      .select()
      .from(chapters)
      .where(and(eq(chapters.id, chapterId), eq(chapters.userId, userId)))
      .limit(1);

    if (!chapter) return { found: false, courseRemoved: false };

    const category = chapter.category;

    // Distillations for this user whose mistakes contain the chapter's category.
    const matching = await tx
      .select({ id: distillations.id, submissionId: distillations.submissionId })
      .from(distillations)
      .where(
        and(
          eq(distillations.userId, userId),
          sql`${distillations.mistakes} @> ${JSON.stringify([{ category }])}::jsonb`,
        ),
      );

    const distillationIds = matching.map((m) => m.id);
    const candidateSubmissionIds = [...new Set(matching.map((m) => m.submissionId))];

    if (distillationIds.length > 0) {
      await tx.delete(distillations).where(inArray(distillations.id, distillationIds));
    }

    // Delete submissions that no longer have any distillation referencing them.
    for (const subId of candidateSubmissionIds) {
      const remaining = await tx
        .select({ id: distillations.id })
        .from(distillations)
        .where(eq(distillations.submissionId, subId))
        .limit(1);
      if (remaining.length === 0) {
        await tx.delete(submissions).where(eq(submissions.id, subId));
      }
    }

    // Remove the chapter itself.
    await tx.delete(chapters).where(eq(chapters.id, chapterId));

    // If the course is now empty, remove it.
    const siblings = await tx
      .select({ id: chapters.id })
      .from(chapters)
      .where(eq(chapters.courseId, chapter.courseId))
      .limit(1);

    let courseRemoved = false;
    if (siblings.length === 0) {
      await tx.delete(courses).where(eq(courses.id, chapter.courseId));
      courseRemoved = true;
    }

    return { found: true, courseRemoved };
  });
}

/**
 * Wipe all of a user's learning data — courses (and their chapters, via cascade),
 * distillations, and submissions. The user row itself is preserved.
 */
export async function clearLearningData(userId: string) {
  await db.transaction(async (tx) => {
    await tx.delete(courses).where(eq(courses.userId, userId));
    await tx.delete(distillations).where(eq(distillations.userId, userId));
    await tx.delete(submissions).where(eq(submissions.userId, userId));
  });
}

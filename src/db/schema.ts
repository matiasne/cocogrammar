import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  vector,
  index,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { EMBEDDING_DIM } from "@/lib/constants";
import type { Mistake, Typo, Chapter } from "@/lib/schemas";

// `id` equals the Supabase auth uid — we always insert it explicitly (see
// requireUser() in src/lib/auth.ts), so defaultRandom is effectively unused.
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  // Freemium billing state (MercadoPago preapproval / recurring subscription).
  isSubscribed: boolean("is_subscribed").notNull().default(false),
  mpPreapprovalId: text("mp_preapproval_id"),
  // Durable usage counters (free caps: 10 sentences, 4 courses). Durable rather
  // than derived from rows, which get deleted as chapters are finished.
  sentencesUsed: integer("sentences_used").notNull().default(0),
  coursesUsed: integer("courses_used").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const submissions = pgTable("submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  originalText: text("original_text").notNull(),
  correctedText: text("corrected_text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const distillations = pgTable("distillations", {
  id: uuid("id").primaryKey().defaultRandom(),
  submissionId: uuid("submission_id")
    .notNull()
    .references(() => submissions.id, { onDelete: "cascade" }),
  // Denormalized so the course agent can query all of a user's distillations directly.
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  levelEstimate: text("level_estimate").notNull(),
  mistakes: jsonb("mistakes").$type<Mistake[]>().notNull(),
  typos: jsonb("typos").$type<Typo[]>().notNull(),
  strengths: jsonb("strengths").$type<string[]>().notNull(),
  grammarNotes: text("grammar_notes").notNull(),
  rawAnalysis: jsonb("raw_analysis").notNull(),
  embedding: vector("embedding", { dimensions: EMBEDDING_DIM }).notNull(),
  // Learner's reaction to this correction's "Why it slipped" analysis, from the
  // thumbs up/down buttons. 'down' deprioritizes this submission's weaknesses
  // when the course agent builds a course; null means no reaction yet.
  feedback: text("feedback").$type<"up" | "down">(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("distillations_embedding_idx").using(
    "hnsw",
    table.embedding.op("vector_cosine_ops"),
  ),
]);

export const courses = pgTable("courses", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  level: text("level").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Each chapter targets one mistake category. Finishing a chapter deletes the
// chapter row and the learning data (distillations + orphaned submissions) for
// that category.
export const chapters = pgTable("chapters", {
  id: uuid("id").primaryKey().defaultRandom(),
  courseId: uuid("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  category: text("category").notNull(),
  orderIndex: integer("order_index").notNull(),
  content: jsonb("content").$type<Chapter>().notNull(),
  // 1–3 star score from the interactive challenges; null until completed.
  score: integer("score"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AppUser = typeof users.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
export type Distillation = typeof distillations.$inferSelect;
export type CourseRow = typeof courses.$inferSelect;
export type ChapterRow = typeof chapters.$inferSelect;

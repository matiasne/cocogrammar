"use client";

import { useImperativeHandle, useState, type Ref } from "react";
import type { Grade } from "@/lib/schemas";
import { Stars } from "@/components/Stars";
import { CocoaSnapLoader } from "@/components/CocoaSnapLoader";

type Exercise = { prompt: string; type: string; answer: string };

// Imperative handle so the parent can trigger "skip to score" from a button it
// renders above the card (alongside "Square X of Y").
export type ChallengesHandle = { finishNow: () => void };

export function ChapterChallenges({
  chapterId,
  category,
  exercises,
  initialScore,
  onScored,
  onContinueNext,
  onDeleteChapter,
  handleRef,
}: {
  chapterId: string;
  category: string;
  exercises: Exercise[];
  initialScore: number | null;
  onScored: (score: number) => void;
  // Provided by the parent only when there IS a next pending chapter.
  onContinueNext?: () => void;
  // Delete the whole chapter (from the complete view).
  onDeleteChapter?: () => void;
  handleRef?: Ref<ChallengesHandle>;
}) {
  const n = exercises.length;

  const [started, setStarted] = useState(initialScore === null);
  const [index, setIndex] = useState(0);
  // Per-challenge state so the user can move back and forth without losing it.
  const [answers, setAnswers] = useState<string[]>(() => Array(n).fill(""));
  const [grades, setGrades] = useState<(Grade | null)[]>(() => Array(n).fill(null));
  const [grading, setGrading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [done, setDone] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(initialScore);
  // Bumped on every navigation so the card re-animates (swipe).
  const [animKey, setAnimKey] = useState(0);

  const current = exercises[index];
  const userAnswer = answers[index];
  const grade = grades[index];

  const setUserAnswer = (v: string) =>
    setAnswers((a) => a.map((x, i) => (i === index ? v : x)));
  const setGrade = (g: Grade | null) =>
    setGrades((gs) => gs.map((x, i) => (i === index ? g : x)));

  function goTo(next: number) {
    if (next < 0 || next >= n || next === index) return;
    setIndex(next);
    setError(null);
    setAnimKey((k) => k + 1);
  }

  function computeStars(attempts: number): number {
    if (attempts <= n) return 3;
    if (attempts <= 2 * n) return 2;
    return 1;
  }

  async function check() {
    if (!userAnswer.trim() || grading) return;
    setGrading(true);
    setError(null);
    try {
      const res = await fetch("/api/chapter/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: current.prompt,
          answer: current.answer,
          userAnswer,
          category,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to grade");
      setGrade(data as Grade);
      setTotalAttempts((a) => a + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setGrading(false);
    }
  }

  function tryAgain() {
    setGrade(null);
  }

  async function advance() {
    if (index < n - 1) {
      goTo(index + 1);
      return;
    }
    await finishNow();
  }

  // Compute + persist the star score and jump to the done screen. Can be called
  // from any challenge via the "Finish chapter" button, or on the last one.
  async function finishNow() {
    const score = computeStars(totalAttempts);
    setFinalScore(score);
    setDone(true);
    try {
      await fetch("/api/chapter/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterId, score }),
      });
    } catch {
      // Non-fatal — the score still shows this session.
    }
    onScored(score);
  }

  function restart() {
    setStarted(true);
    setIndex(0);
    setAnswers(Array(n).fill(""));
    setGrades(Array(n).fill(null));
    setTotalAttempts(0);
    setDone(false);
    setError(null);
    setAnimKey((k) => k + 1);
  }

  // Expose "skip to score" so the parent's top button can trigger it.
  useImperativeHandle(handleRef, () => ({ finishNow }));

  // Already completed (loaded from DB) — show the result with a redo option.
  if (!started && finalScore !== null) {
    return (
      <div className="mt-6 rounded-2xl border border-cream/15 bg-cream/[0.04] p-6 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-cream/50">
          Challenges complete
        </p>
        <div className="mt-3 text-4xl">
          <Stars score={finalScore} />
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={restart}
            className="rounded-3xl border border-cream/28 px-6 py-2 text-[12px] font-light uppercase tracking-[0.12em] text-cream hover:border-lime/50 hover:text-lime"
          >
            Redo challenges
          </button>
          {onDeleteChapter && (
            <button
              onClick={onDeleteChapter}
              className="rounded-3xl border border-cream/28 px-6 py-2 text-[12px] font-light uppercase tracking-[0.12em] text-cream hover:border-lime/50 hover:text-lime"
            >
              Finish chapter
            </button>
          )}
          {onContinueNext && (
            <button
              onClick={onContinueNext}
              className="rounded-3xl bg-lime px-6 py-2.5 text-sm font-normal text-ink hover:bg-lime-bright"
            >
              Continue to next chapter →
            </button>
          )}
        </div>
      </div>
    );
  }

  // Finished this session.
  if (done && finalScore !== null) {
    return (
      <div className="mt-6 rounded-2xl border border-lime/30 bg-lime/[0.06] p-6 text-center">
        <p className="font-script text-3xl text-lime">nicely done</p>
        <div className="mt-2 text-4xl">
          <Stars score={finalScore} />
        </div>
        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-cream/50">
          {totalAttempts} attempt{totalAttempts === 1 ? "" : "s"} across {n} challenge
          {n === 1 ? "" : "s"}
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={restart}
            className="rounded-3xl border border-cream/28 px-6 py-2 text-[12px] font-light uppercase tracking-[0.12em] text-cream hover:border-lime/50 hover:text-lime"
          >
            Try again
          </button>
          {onDeleteChapter && (
            <button
              onClick={onDeleteChapter}
              className="rounded-3xl border border-cream/28 px-6 py-2 text-[12px] font-light uppercase tracking-[0.12em] text-cream hover:border-lime/50 hover:text-lime"
            >
              Finish chapter
            </button>
          )}
          {onContinueNext && (
            <button
              onClick={onContinueNext}
              className="rounded-3xl bg-lime px-6 py-2.5 text-sm font-normal text-ink hover:bg-lime-bright"
            >
              Continue to next chapter →
            </button>
          )}
        </div>
      </div>
    );
  }

  const isCorrect = grade?.verdict === "correct";
  const verdictColor =
    grade?.verdict === "correct"
      ? "text-lime"
      : grade?.verdict === "partial"
        ? "text-amber-300"
        : "text-red-300";

  return (
    <div className="mt-6 space-y-4 overflow-hidden">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => goTo(index - 1)}
            disabled={index === 0}
            aria-label="Previous challenge"
            className="rounded-full border border-cream/25 px-2.5 py-1 text-xs text-cream/70 hover:border-lime/50 hover:text-lime disabled:opacity-30 disabled:hover:border-cream/25 disabled:hover:text-cream/70"
          >
            ←
          </button>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-cream/50">
            Challenge {index + 1} of {n}
          </p>
          <button
            onClick={() => goTo(index + 1)}
            disabled={index === n - 1}
            aria-label="Next challenge"
            className="rounded-full border border-cream/25 px-2.5 py-1 text-xs text-cream/70 hover:border-lime/50 hover:text-lime disabled:opacity-30 disabled:hover:border-cream/25 disabled:hover:text-cream/70"
          >
            →
          </button>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-lime">
          {current.type}
        </span>
      </div>

      <div
        key={animKey}
        className="swipe-in rounded-2xl border border-cream/15 bg-cream/[0.04] p-6"
      >
        <p className="font-reading text-xl font-normal leading-relaxed text-cream">
          {current.prompt}
        </p>

        {/* One slot: input → loader → grade response */}
        {grading ? (
          <div className="mt-4 flex justify-center">
            <CocoaSnapLoader variant="correct" compact />
          </div>
        ) : grade ? (
          <div className="mt-4">
            <p className={`font-mono text-[11px] uppercase tracking-[0.14em] ${verdictColor}`}>
              {grade.verdict}
            </p>
            <p className="mt-1 font-reading text-base font-normal leading-relaxed text-cream/85">
              {grade.feedback}
            </p>
            <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-cream/40">
              Your answer: <span className="text-cream/70">{userAnswer}</span>
            </p>
          </div>
        ) : (
          <textarea
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            rows={2}
            placeholder="Your answer…"
            className="mt-4 w-full resize-none rounded-2xl border border-cream/20 bg-cream/5 p-3 font-reading text-base font-normal text-cream placeholder:text-cream/40 focus:border-lime/50 focus:outline-none"
          />
        )}

        {error && <p className="mt-3 text-sm font-light text-red-300">{error}</p>}

        <div className="mt-4 flex items-center justify-end gap-3">
          {!grade && (
            <button
              onClick={check}
              disabled={grading || !userAnswer.trim()}
              className="rounded-3xl bg-lime px-6 py-2.5 text-sm font-normal text-ink hover:bg-lime-bright disabled:cursor-not-allowed disabled:opacity-40"
            >
              {grading ? "Checking…" : "Check"}
            </button>
          )}
          {grade && !isCorrect && (
            <button
              onClick={tryAgain}
              className="rounded-3xl border border-cream/28 px-6 py-2.5 text-sm font-light text-cream hover:border-lime/50 hover:text-lime"
            >
              Try again
            </button>
          )}
          {isCorrect && (
            <button
              onClick={advance}
              className="rounded-3xl bg-lime px-6 py-2.5 text-sm font-normal text-ink hover:bg-lime-bright"
            >
              {index < n - 1 ? "Continue →" : "See score →"}
            </button>
          )}
        </div>
      </div>

    </div>
  );
}

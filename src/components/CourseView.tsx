"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CocoaCupLoader } from "@/components/CocoaCupLoader";
import {
  ChapterChallenges,
  type ChallengesHandle,
} from "@/components/ChapterChallenges";
import { Stars } from "@/components/Stars";
import { LoginModal } from "@/components/LoginModal";
import { ConfirmModal } from "@/components/ConfirmModal";

type ChapterView = {
  id: string;
  category: string;
  orderIndex: number;
  score: number | null;
  content: {
    title: string;
    focusArea: string;
    why: string;
    exercises: { prompt: string; type: string; answer: string }[];
  };
};

type CourseWithChapters = {
  courseId: string;
  title: string;
  summary: string;
  level: string;
  totalChapters: number;
  chapters: ChapterView[];
};

export function CourseView() {
  const [course, setCourse] = useState<CourseWithChapters | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set when the free course-generation quota is exhausted (402 paywall).
  const [paywalled, setPaywalled] = useState(false);
  // Set when a guest tries to build a course while logged out (401).
  const [authRequired, setAuthRequired] = useState(false);
  // Which chapter is open. Free navigation — the user can jump to any chapter
  // without finishing the previous one.
  // Which item is open: "overview" (the intro/resume + chapter links) or a
  // chapter id. Defaults to the overview when a course loads.
  const [selectedId, setSelectedId] = useState<string>("overview");
  // Whether the user has any logged sentences to build a course from.
  const [hasSubmissions, setHasSubmissions] = useState(false);
  // Deleting a chapter (from the complete view).
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // Chapter awaiting delete confirmation in the modal (null when closed).
  const [confirmChapter, setConfirmChapter] = useState<ChapterView | null>(null);
  // Lets the top "Finish chapter" button trigger the challenges' skip-to-score.
  const challengesRef = useRef<ChallengesHandle>(null);

  // Load an existing course + whether there are submissions to build from.
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/course");
      if (res.ok) {
        const data = await res.json();
        setCourse(data.course);
        setSelectedId("overview");
      }
    })();
    (async () => {
      const res = await fetch("/api/history");
      if (res.ok) {
        const data = await res.json();
        setHasSubmissions((data.history?.length ?? 0) > 0);
      }
    })();
  }, []);

  async function generate() {
    setLoading(true);
    setError(null);
    setPaywalled(false);
    setAuthRequired(false);
    try {
      const res = await fetch("/api/course", { method: "POST" });
      const data = await res.json();
      if (res.status === 401) {
        setAuthRequired(true);
        return;
      }
      if (res.status === 402 && data.paywall) {
        setPaywalled(true);
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Failed to generate course");
      // Reveal as soon as it's ready — the loader never has to reach 100%.
      setCourse(data.course);
      setSelectedId("overview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  // Delete a chapter: removes it and clears its category's writing data, so a
  // mastered weakness stops feeding future courses. Moves to the next chapter
  // (or Overview when none remain).
  // Actually finish the chapter: hits the API, removes it from the course, and
  // moves to the next chapter (or Overview when none remain). Called only after
  // the user confirms in the modal.
  async function performDelete(chapter: ChapterView) {
    setConfirmChapter(null);
    setDeletingId(chapter.id);
    setError(null);
    try {
      const res = await fetch("/api/chapter/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterId: chapter.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to finish chapter");

      setCourse((prev) => {
        if (!prev) return prev;
        const idx = prev.chapters.findIndex((c) => c.id === chapter.id);
        const remaining = prev.chapters.filter((c) => c.id !== chapter.id);
        if (remaining.length === 0) {
          setSelectedId("overview");
          return null;
        }
        const next = remaining[Math.min(idx, remaining.length - 1)];
        setSelectedId(next.id);
        return { ...prev, chapters: remaining };
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setDeletingId(null);
    }
  }

  // Update a chapter's score in memory so the header/sidebar/overview reflect it.
  function handleScored(chapterId: string, score: number) {
    setCourse((prev) =>
      prev
        ? {
            ...prev,
            chapters: prev.chapters.map((c) =>
              c.id === chapterId ? { ...c, score } : c,
            ),
          }
        : prev,
    );
  }

  // While a course is being created, show the full Cocoa loader. It reveals the
  // course the moment it's ready — it never needs to reach 100%.
  if (loading) {
    return <CocoaCupLoader />;
  }

  // Render the whole course into a print-friendly window and trigger the browser's
  // "Save as PDF". Reflects the course as it currently stands (finished chapters
  // are already cleared).
  function downloadPdf(c: CourseWithChapters) {
    const esc = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const chaptersHtml = c.chapters
      .map((ch, i) => {
        const exercises = ch.content.exercises
          .map(
            (ex) => `
              <li class="ex">
                <div class="ex-type">${esc(ex.type)}</div>
                <div class="ex-prompt">${esc(ex.prompt)}</div>
                <div class="ex-answer"><strong>Answer:</strong> ${esc(ex.answer)}</div>
              </li>`,
          )
          .join("");
        return `
          <section class="chapter">
            <div class="ch-head">
              <h2>Chapter ${i + 1}: ${esc(ch.content.title)}</h2>
              <div class="ch-focus">Focus: ${esc(ch.content.focusArea)} · ${esc(ch.category)}</div>
            </div>
            <p class="why">${esc(ch.content.why)}</p>
            <ul class="exercises">${exercises}</ul>
          </section>`;
      })
      .join("");

    const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${esc(c.title)}</title>
<style>
  @import url("https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;1,400&family=Jost:wght@300;400&display=swap");
  * { box-sizing: border-box; }
  body { font-family: Lora, Georgia, serif; color: #241611; margin: 40px; line-height: 1.55; }
  h1 { font-family: Jost, sans-serif; font-weight: 300; font-size: 34px; margin: 0 0 4px; }
  .level { font-family: Jost, sans-serif; font-size: 12px; letter-spacing: .1em; text-transform: uppercase; color: #8a5a34; }
  .summary { max-width: 640px; color: #3a2a20; margin: 12px 0 28px; }
  .chapter { break-inside: avoid; page-break-inside: avoid; border-top: 1px solid #e5d8c9; padding: 22px 0; }
  h2 { font-family: Jost, sans-serif; font-weight: 400; font-size: 22px; margin: 0 0 4px; }
  .ch-focus { font-family: Jost, sans-serif; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: #8a5a34; }
  .why { color: #3a2a20; margin: 10px 0 14px; }
  .exercises { list-style: none; padding: 0; margin: 0; }
  .ex { border: 1px solid #e5d8c9; border-radius: 8px; padding: 12px 14px; margin-bottom: 10px; break-inside: avoid; }
  .ex-type { font-family: Jost, sans-serif; font-size: 10px; letter-spacing: .1em; text-transform: uppercase; color: #8a5a34; margin-bottom: 4px; }
  .ex-answer { color: #4a3a2e; margin-top: 6px; }
</style>
</head>
<body>
  <h1>${esc(c.title)}</h1>
  <div class="level">${esc(c.level)}</div>
  <p class="summary">${esc(c.summary)}</p>
  ${chaptersHtml}
</body>
</html>`;

    const w = window.open("", "_blank");
    if (!w) {
      setError("Enable pop-ups to download the PDF.");
      return;
    }
    w.document.write(html);
    w.document.close();
    // Give fonts a moment to load, then open the print dialog.
    w.onload = () => {
      w.focus();
      w.print();
    };
  }

  return (
    <>
    <div className={`w-full`}>
      {/* Intro header — only before the user has their own course */}
      {!course && (
        <header>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-cream/50">
            Built from your corrections
          </p>
          <h1 className="mt-3 font-sans text-5xl font-extralight leading-tight text-cream md:text-6xl">
            Your tasting box
          </h1>
          <p className="mt-2 font-script text-3xl text-lime md:text-4xl">
            richest slips first
          </p>
        </header>
      )}

      {!course && hasSubmissions && (
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={generate}
            disabled={loading}
            className="rounded-3xl border border-cream/28 px-7 py-3 text-[13px] font-light uppercase tracking-[0.12em] text-cream hover:border-lime/50 hover:text-lime disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-cream/28 disabled:hover:text-cream"
          >
            Build my course
          </button>
        </div>
      )}

      {paywalled && (
        <div className="reveal rounded-2xl border border-lime/30 bg-lime/[0.06] p-6">
          <p className="font-script text-2xl text-lime">you&rsquo;ve built four courses</p>
          <p className="mt-2 font-reading text-base font-normal leading-relaxed text-cream/85">
            You&rsquo;ve used all 4 free course generations. Subscribe to create
            as many personalized courses as you like.
          </p>
          <Link
            href="/subscribe"
            className="mt-4 inline-block rounded-3xl bg-lime px-6 py-2.5 text-sm font-normal text-ink hover:bg-lime-bright hover:text-ink"
          >
            Upgrade for unlimited courses →
          </Link>
        </div>
      )}

      {error && !paywalled && !authRequired && (
        <p className="rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm font-light text-red-200">
          {error}
        </p>
      )}

      {course &&
        course.chapters.length > 0 &&
        (() => {
          // Free navigation: "overview" shows the intro; otherwise the open
          // chapter is whichever `selectedId` points at.
          const selectedChapter = course.chapters.find(
            (c) => c.id === selectedId,
          );
          const showOverview = selectedId === "overview" || !selectedChapter;
          const chapter = selectedChapter ?? course.chapters[0];
          // The next remaining chapter after the open one (for "Continue to
          // next chapter"); undefined if this is the last remaining chapter.
          const chapterPos = course.chapters.findIndex(
            (c) => c.id === chapter.id,
          );
          const nextChapter =
            chapterPos >= 0 ? course.chapters[chapterPos + 1] : undefined;
          const total = course.totalChapters;
          const current = chapter.orderIndex + 1;

          return (
            <div className="">
              {/* The sidebar is lg:fixed (out of flow), so reserve its footprint
                  (left-6 + w-[17rem] + gap ≈ 19.5rem) as left padding on lg so the
                  content column no longer sits under it. */}
              <div className="lg:pl-[19.5rem]">
                {/* Chapter progress — fixed to the top-left of the page */}
                <aside className="mb-6 rounded-2xl bg-cocoa-panel p-6 lg:fixed lg:left-6 lg:top-24 lg:mb-0 lg:max-h-[calc(100vh-7rem)] lg:w-[17rem] lg:overflow-y-auto">
                  <button
                    onClick={() => downloadPdf(course)}
                    className="mb-5 w-full rounded-3xl border border-lime/40 px-5 py-2.5 text-[12px] font-light uppercase tracking-[0.12em] text-lime hover:bg-lime/10"
                  >
                    Download PDF
                  </button>
                  <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-cream/50">
                    {course.chapters.length} square
                    {course.chapters.length === 1 ? "" : "s"} left
                  </p>
                  <ol className="space-y-1">
                    <li>
                      <button
                        type="button"
                        onClick={() => setSelectedId("overview")}
                        className={`flex w-full items-start gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm font-light ${
                          showOverview
                            ? "bg-lime/10 text-lime"
                            : "text-cream/55 hover:bg-cream/5 hover:text-cream"
                        }`}
                      >
                        <span className="mt-0.5 w-4 shrink-0 text-center text-lime">
                          {showOverview ? "▸" : "◆"}
                        </span>
                        <span>Overview</span>
                      </button>
                    </li>
                    {/* Only the remaining chapters — finished ones are removed
                        entirely (no struck-through slot) and the list renumbers. */}
                    {course.chapters.map((ch, idx) => {
                      const isCurrent = !showOverview && ch.id === chapter.id;
                      return (
                        <li key={ch.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedId(ch.id)}
                            className={`flex w-full items-start justify-between gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm font-light ${
                              isCurrent
                                ? "bg-lime/10 text-lime"
                                : "text-cream/55 hover:bg-cream/5 hover:text-cream"
                            }`}
                          >
                            <span className="flex items-start gap-2.5">
                              <span className="mt-0.5 w-4 shrink-0 text-center text-lime">
                                {isCurrent ? "▸" : idx + 1}
                              </span>
                              <span>{ch.content.title}</span>
                            </span>
                            {ch.score != null && (
                              <Stars
                                score={ch.score}
                                className="shrink-0 text-[11px]"
                              />
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                </aside>

                {showOverview ? (
                  /* Overview — course resume + links to every chapter */
                  <div className="mx-auto max-w-2xl space-y-6">
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <h2 className="text-3xl font-extralight text-cream">
                          {course.title}
                        </h2>
                        <span className="rounded-full border border-lime/40 px-2 py-0.5 text-[11px] font-light uppercase tracking-[0.1em] text-lime">
                          {course.level}
                        </span>
                      </div>
                      <p className="max-w-2xl font-reading text-base font-normal leading-relaxed text-cream/70">
                        {course.summary}
                      </p>
                    </div>

                    <div>
                      <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-cream/50">
                        Chapters
                      </p>
                      <ol className="flex flex-col gap-px overflow-hidden rounded-2xl bg-cream/10">
                        {/* Only the remaining chapters — finished ones are gone. */}
                        {course.chapters.map((ch, idx) => {
                          return (
                            <li key={ch.id}>
                              <button
                                type="button"
                                onClick={() => setSelectedId(ch.id)}
                                className="flex w-full items-center justify-between gap-3 bg-cocoa-panel px-5 py-4 text-left hover:bg-cocoa-panel/70"
                              >
                                <span className="flex items-center gap-3">
                                  <span className="w-5 text-center text-lime">
                                    {idx + 1}
                                  </span>
                                  <span className="font-reading text-lg font-normal text-cream">
                                    {ch.content.title}
                                  </span>
                                </span>
                                {ch.score != null ? (
                                  <Stars score={ch.score} />
                                ) : (
                                  <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-lime">
                                    Open →
                                  </span>
                                )}
                              </button>
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                  </div>
                ) : (
                  /* The open chapter — centered within the content column */
                  <div className="mx-auto max-w-2xl space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-cream/50">
                        Square {current} of {total}
                      </p>
                      <button
                        onClick={() => challengesRef.current?.finishNow()}
                        className="rounded-3xl border border-cream/40 px-5 py-2 text-[12px] font-light uppercase tracking-[0.12em] text-cream hover:border-lime/50 hover:text-lime"
                      >
                        Finish chapter
                      </button>
                    </div>
                    <section
                      key={chapter.id}
                      className="rounded-2xl bg-gradient-to-br from-[#3a1a13] to-[#2a1210] p-8"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-reading text-3xl font-normal leading-tight text-cream">
                            {chapter.content.title}
                          </h3>
                          <p className="mt-2 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-lime">
                            Focus: {chapter.content.focusArea}
                            <span className="rounded-full border border-cream/20 px-2 py-0.5 text-[10px] text-cream/60">
                              {chapter.category}
                            </span>
                          </p>
                        </div>
                        {chapter.score !== null && (
                          <Stars score={chapter.score} className="shrink-0 text-2xl" />
                        )}
                      </div>

                      <p className="mt-4 font-reading text-base font-normal leading-relaxed text-cream/75">
                        {chapter.content.why}
                      </p>

                      <ChapterChallenges
                        key={chapter.id}
                        handleRef={challengesRef}
                        chapterId={chapter.id}
                        category={chapter.category}
                        exercises={chapter.content.exercises}
                        initialScore={chapter.score}
                        onScored={(score) => handleScored(chapter.id, score)}
                        onContinueNext={
                          nextChapter
                            ? () => setSelectedId(nextChapter.id)
                            : undefined
                        }
                        onDeleteChapter={
                          deletingId === chapter.id
                            ? undefined
                            : () => setConfirmChapter(chapter)
                        }
                      />
                    </section>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

      {!course && !loading && hasSubmissions && (
        <p className="max-w-lg text-base font-light leading-relaxed text-cream/50">
          You&rsquo;ve logged some sentences. Hit{" "}
          <span className="text-cream">Build my course</span> to press them into
          a course pressed from your habits. Each chapter is one recurring slip
          — finish it to clear that writing and shrink the box.
        </p>
      )}

      {!course && !loading && !hasSubmissions && (
        <div className="flex flex-col items-center gap-6 py-16 text-center">
          <p className="max-w-lg text-base font-light leading-relaxed text-cream/50">
            No course yet. Write a few sentences on the Write page, then build a
            course pressed from your habits. Each chapter is one recurring slip
            — finish it to clear that writing and shrink the box.
          </p>
          <Link
            href="/"
            className="rounded-3xl bg-lime px-7 py-3 text-[13px] font-normal uppercase tracking-[0.12em] text-ink hover:bg-lime-bright"
          >
            Go to Write →
          </Link>
        </div>
      )}
    </div>

    <LoginModal
      open={authRequired}
      onClose={() => setAuthRequired(false)}
      title="log in to build your course"
      message="Create a free account so we can press your own writing into a personalized course."
    />

    <ConfirmModal
      open={confirmChapter !== null}
      onClose={() => setConfirmChapter(null)}
      onConfirm={() => confirmChapter && performDelete(confirmChapter)}
      busy={deletingId !== null}
      title="finish this chapter?"
      message={
        confirmChapter
          ? `This removes "${confirmChapter.content.title}" and clears the "${confirmChapter.category}" writing data it was built from.`
          : ""
      }
      confirmLabel="Finish chapter"
      cancelLabel="Keep it"
    />
    </>
  );
}

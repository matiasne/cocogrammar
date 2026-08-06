"use client";

import { useState } from "react";
import type { Analysis } from "@/lib/schemas";

// Bottom action row for the "Why it slipped" card: thumbs up / down (which also
// dismiss the card) plus a share button. `submissionId` is null for guests
// (their corrections aren't persisted), so rating is disabled in that case.
function FeedbackActions({
  analysis,
  submissionId,
  onDismiss,
}: {
  analysis: Analysis;
  submissionId: string | null;
  onDismiss?: () => void;
}) {
  const [sending, setSending] = useState<"up" | "down" | null>(null);
  const [shared, setShared] = useState(false);

  async function rate(feedback: "up" | "down") {
    if (sending) return;
    // Guests have nothing to attach feedback to — just close the card.
    if (submissionId) {
      setSending(feedback);
      try {
        await fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ submissionId, feedback }),
        });
      } catch {
        // Best-effort: a failed feedback save shouldn't block dismissing the card.
      }
    }
    onDismiss?.();
  }

  async function share() {
    const slips = analysis.mistakes
      .map((m) => `• ${m.excerpt} → ${m.correction}`)
      .join("\n");
    const text = `My CocoGrammar check (Level ${analysis.levelEstimate})\n${slips}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Why it slipped", text });
      } else {
        await navigator.clipboard.writeText(text);
        setShared(true);
        setTimeout(() => setShared(false), 1800);
      }
    } catch {
      // User cancelled the share sheet, or clipboard denied — nothing to do.
    }
  }

  const iconBtn =
    "flex h-9 w-9 items-center justify-center rounded-full border border-cream/15 text-cream/60 transition hover:border-lime/50 hover:text-lime disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="flex items-center gap-2 border-t border-cream/10 pt-4">
      <button
        type="button"
        onClick={() => rate("up")}
        disabled={sending !== null}
        aria-label="Helpful"
        title="Helpful"
        className={iconBtn}
      >
        {/* thumbs up */}
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M7 10v11" />
          <path d="M7 10l4-7a2 2 0 0 1 2.7 2.5L12 10h5.5a2 2 0 0 1 2 2.4l-1.3 6.5a2 2 0 0 1-2 1.6H7" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => rate("down")}
        disabled={sending !== null}
        aria-label="Not helpful"
        title="Not helpful — deprioritize this in my course"
        className={iconBtn}
      >
        {/* thumbs down */}
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M17 14V3" />
          <path d="M17 14l-4 7a2 2 0 0 1-2.7-2.5L12 14H6.5a2 2 0 0 1-2-2.4l1.3-6.5a2 2 0 0 1 2-1.6H17" />
        </svg>
      </button>

      <span className="flex-1" />

      <button
        type="button"
        onClick={share}
        aria-label={shared ? "Copied" : "Share"}
        title={shared ? "Copied to clipboard" : "Share"}
        className={iconBtn}
      >
        {/* share */}
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
        </svg>
      </button>
    </div>
  );
}

export function FeedbackPanel({
  analysis,
  submissionId = null,
  onDismiss,
  showActions = false,
}: {
  analysis: Analysis;
  // Present only in the live "Why it slipped" card; omitted in read-only
  // contexts (e.g. history) where the action row shouldn't show.
  submissionId?: string | null;
  onDismiss?: () => void;
  showActions?: boolean;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="rounded-full border border-lime/40 px-3 py-1 text-xs font-light uppercase tracking-[0.12em] text-lime">
          Level {analysis.levelEstimate}
        </span>
      </div>

      {analysis.grammarNotes && (
        <p className="font-reading text-sm font-normal leading-relaxed text-cream/70">
          {analysis.grammarNotes}
        </p>
      )}

      <section>
        <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-cream/50">
          Slips ({analysis.mistakes.length})
        </p>
        {analysis.mistakes.length === 0 ? (
          <p className="text-sm font-light text-cream/50">No grammar slips found. 🍫</p>
        ) : (
          <div className="flex flex-col gap-px overflow-hidden rounded-xl bg-cream/10">
            {analysis.mistakes.map((m, i) => (
              <div key={i} className="bg-cocoa-panel p-4">
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime">
                    {m.category}
                  </span>
                </div>
                <p className="font-reading text-lg font-normal leading-relaxed text-cream">
                  <span className="text-cream/35 line-through decoration-lime/70">
                    {m.excerpt}
                  </span>{" "}
                  <span className="text-lime">{m.correction}</span>
                </p>
                <p className="mt-1.5 font-reading text-sm font-normal text-cream/60">
                  {m.explanation}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {analysis.typos.length > 0 && (
        <section>
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-cream/50">
            Typos ({analysis.typos.length})
          </p>
          <ul className="flex flex-wrap gap-2">
            {analysis.typos.map((t, i) => (
              <li
                key={i}
                className="rounded-full border border-cream/15 px-3 py-1 text-sm font-light"
              >
                <span className="text-cream/40 line-through decoration-lime/60">
                  {t.original}
                </span>
                <span className="mx-1.5 text-cream/40">→</span>
                <span className="text-lime">{t.corrected}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-cream/50">
          What you did well
        </p>
        {analysis.strengths.length === 0 ? (
          <p className="text-sm font-light text-cream/40">—</p>
        ) : (
          <ul className="space-y-1.5 text-sm font-light text-cream/75">
            {analysis.strengths.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-lime">·</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {showActions && (
        <FeedbackActions
          analysis={analysis}
          submissionId={submissionId}
          onDismiss={onDismiss}
        />
      )}
    </div>
  );
}

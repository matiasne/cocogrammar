"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Analysis } from "@/lib/schemas";
import { FeedbackPanel } from "@/components/FeedbackPanel";
import { CocoaSnapLoader } from "@/components/CocoaSnapLoader";

const DEBOUNCE_MS = 6000;

// Shared typography/padding for the visible text layer and the invisible
// textarea, so the rendered glyphs and the real caret line up exactly.
const SURFACE_TYPO =
  "font-sans text-4xl font-extralight leading-relaxed tracking-normal";
const SURFACE_PAD = "p-2";

export function WriterPane({
  onTypingChange,
  onCorrectedChange,
}: {
  onTypingChange?: (hasText: boolean) => void;
  onCorrectedChange?: (hasCorrection: boolean) => void;
}) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set when the free sentence quota is exhausted (402 paywall).
  const [paywalled, setPaywalled] = useState(false);
  const [correctedText, setCorrectedText] = useState<string | null>(null);
  // Holds the corrected text as soon as it arrives; it's promoted to
  // `correctedText` (and shown) only once the loader animation completes to 100%.
  const [pendingCorrected, setPendingCorrected] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [pendingAnalysis, setPendingAnalysis] = useState<Analysis | null>(null);
  const [copied, setCopied] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastCheckedRef = useRef<string>("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Mirrors "results are showing" so the global keydown handler (deps: []) can
  // check it without a stale closure. Kept in sync below.
  const lockedRef = useRef(false);

  // Autofocus the invisible field on mount so the caret is live immediately.
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Let the parent react to whether the user has started writing.
  useEffect(() => {
    onTypingChange?.(text.trim().length > 0);
  }, [text, onTypingChange]);

  // Let the parent react to whether a corrected version is showing.
  useEffect(() => {
    onCorrectedChange?.(correctedText !== null);
  }, [correctedText, onCorrectedChange]);

  // Route any keystroke on the page into the writing surface, even when it
  // isn't focused — so the user can just start typing anywhere.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const ta = textareaRef.current;
      if (!ta) return;

      // Input is locked while results are showing — ignore stray keystrokes.
      if (lockedRef.current) return;

      // Already typing in the surface (or another input/editable) — leave it.
      const active = document.activeElement;
      if (active === ta) return;
      if (
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        (active instanceof HTMLElement && active.isContentEditable)
      ) {
        return;
      }

      // Ignore shortcuts so browser/OS shortcuts keep working.
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const isPrintable = e.key.length === 1;
      const isBackspace = e.key === "Backspace";
      const isEnter = e.key === "Enter";
      if (!isPrintable && !isBackspace && !isEnter) return;

      // Focus the surface and apply the keystroke ourselves, so the very first
      // character isn't dropped (focus-during-keydown delivery is unreliable).
      e.preventDefault();
      ta.focus();
      if (isPrintable) {
        setText((t) => t + e.key);
      } else if (isEnter) {
        setText((t) => t + "\n");
      } else if (isBackspace) {
        setText((t) => t.slice(0, -1));
      }
      // Keep the caret at the end after React re-renders.
      requestAnimationFrame(() => {
        const end = ta.value.length;
        ta.setSelectionRange(end, end);
      });
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const runCheck = useCallback(async (value: string) => {
    // Supersede any in-flight request.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    setPaywalled(false);
    setCorrectedText(null);
    setPendingCorrected(null);
    setAnalysis(null);
    setPendingAnalysis(null);

    try {
      const res = await fetch("/api/correct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: value }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 402 && data.paywall) {
          setPaywalled(true);
          return;
        }
        throw new Error(data.error ?? "Request failed");
      }

      // Read the NDJSON stream: corrected text arrives first, analysis after.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        buffer += decoder.decode(chunk, { stream: true });

        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line) continue;

          const event = JSON.parse(line);
          if (event.type === "corrected") {
            // Stash it — the loader finishes to 100% before we reveal it.
            setPendingCorrected(event.correctedText);
          } else if (event.type === "analysis") {
            // Stash it — the compact loader finishes to 100% before we reveal it.
            setPendingAnalysis(event.analysis);
          } else if (event.type === "error") {
            throw new Error(event.error);
          }
        }
      }
    } catch (e) {
      // A superseded request is expected — ignore its abort.
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      if (abortRef.current === controller) {
        setLoading(false);
        abortRef.current = null;
      }
    }
  }, []);

  // Single guarded entry point for a check — cancels any pending debounce,
  // skips text that was already checked, and runs at most one request.
  const triggerCheck = useCallback(
    (value: string) => {
      const v = value.trim();
      if (!v || v === lastCheckedRef.current) return;
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      lastCheckedRef.current = v;
      void runCheck(v);
    },
    [runCheck],
  );

  // Debounced live auto-check: fire a short pause after the user stops typing.
  useEffect(() => {
    const value = text.trim();
    if (!value || value === lastCheckedRef.current) return;

    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      triggerCheck(value);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [text, triggerCheck]);

  // Abort any in-flight request on unmount.
  useEffect(() => () => abortRef.current?.abort(), []);

  const copyCorrected = useCallback(async () => {
    if (!correctedText) return;
    try {
      await navigator.clipboard.writeText(correctedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked (e.g. insecure context) — ignore silently.
    }
  }, [correctedText]);

  const hasResult = correctedText !== null || analysis !== null;
  lockedRef.current = hasResult;

  // Start a fresh sentence: clear the result + input and refocus the surface.
  const reset = useCallback(() => {
    abortRef.current?.abort();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    lastCheckedRef.current = "";
    setText("");
    setCorrectedText(null);
    setAnalysis(null);
    setError(null);
    setCopied(false);
    // Refocus after the input unlocks on the next render.
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, []);

  // Re-edit the same sentence: keep the text, clear the results, unlock the
  // input and place the cursor in the sentence. Allows a fresh check on edit.
  const editSentence = useCallback(() => {
    abortRef.current?.abort();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // Reset the dedupe so re-checking the (possibly unchanged) text is allowed.
    lastCheckedRef.current = "";
    setCorrectedText(null);
    setPendingCorrected(null);
    setAnalysis(null);
    setPendingAnalysis(null);
    setError(null);
    setCopied(false);
    // Focus the surface and drop the caret at the end of the sentence.
    requestAnimationFrame(() => {
      const ta = textareaRef.current;
      if (ta) {
        ta.focus();
        const end = ta.value.length;
        ta.setSelectionRange(end, end);
      }
    });
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      {/* Invisible writing surface with a floating caret. Clicking a processed
          sentence re-opens it for editing (clears the results). */}
      <div
        className="relative min-h-[8rem] cursor-text"
        title={hasResult ? "Click to edit this sentence" : undefined}
        onClick={hasResult ? editSentence : () => textareaRef.current?.focus()}
      >
        {/* Visible layer: rendered text + blinking caret */}
        <div
          aria-hidden
          className={`pointer-events-none whitespace-pre-wrap break-words text-cream ${SURFACE_TYPO} ${SURFACE_PAD}`}
        >
          {text.length === 0 ? (
            <>
              {/* Empty: caret sits to the LEFT of the placeholder */}
              {!hasResult && <span className="caret-blink text-lime">▏</span>}
              <span className="text-cream/35">Write a sentence…</span>
            </>
          ) : (
            <>
              {text}
              {/* Caret trails the last character while typing */}
              {!hasResult && <span className="caret-blink text-lime">▏</span>}
            </>
          )}
        </div>

        {/* Interaction layer: real textarea, visually invisible (locked while results show) */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          readOnly={hasResult}
          rows={1}
          spellCheck={false}
          className={`absolute inset-0 h-full w-full resize-none border-0 bg-transparent text-transparent caret-transparent outline-none ${SURFACE_TYPO} ${SURFACE_PAD}`}
        />

        {/* Chocolate loader — fixed overlay over the input, rising up from the bottom.
            Finishes to 100% once the corrected text arrives, then reveals it. */}
        {loading && !correctedText && (
          <div className="overlay-fade fixed inset-0 z-40 flex items-center justify-center overflow-visible bg-cocoa/70 backdrop-blur-sm">
            <div className="rise-in">
              <CocoaSnapLoader
                variant="correct"
                finish={pendingCorrected !== null}
                onDone={() => setCorrectedText(pendingCorrected)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Correct now, or start over once results are showing */}
      <div className="flex justify-center">
        {hasResult ? (
          <button
            onClick={reset}
            className="rounded-3xl bg-lime px-7 py-2.5 text-sm font-normal text-ink hover:bg-lime-bright"
          >
            Write another sentence →
          </button>
        ) : (
          <button
            onClick={() => triggerCheck(text)}
            disabled={loading || text.trim().length === 0}
            className="rounded-3xl bg-lime px-7 py-2.5 text-sm font-normal text-ink hover:bg-lime-bright disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? "Correcting…" : "correct grammar"}
          </button>
        )}
      </div>

      {/* Results below */}
      <div className="space-y-6">
        {correctedText !== null && (
          <section className="reveal">
            <div className="flex items-center justify-between gap-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime">
                Corrected version
              </p>
              <button
                onClick={copyCorrected}
                className="rounded-full border border-cream/25 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-cream/70 hover:border-lime/50 hover:text-lime"
              >
                {copied ? "Copied ✓" : "Copy"}
              </button>
            </div>
            <p
              onClick={copyCorrected}
              title="Click to copy"
              className="mt-3 cursor-pointer whitespace-pre-wrap font-reading text-2xl font-normal leading-relaxed text-cream transition-colors hover:text-cream/80"
            >
              {correctedText}
            </p>
            {copied && (
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-lime/80">
                Copied to clipboard
              </p>
            )}
          </section>
        )}

        {paywalled && !loading && (
          <div className="reveal rounded-2xl border border-lime/30 bg-lime/[0.06] p-6">
            <p className="font-script text-2xl text-lime">that&rsquo;s the last free one</p>
            <p className="mt-2 font-reading text-base font-normal leading-relaxed text-cream/85">
              You&rsquo;ve used all 10 free sentence checks. Subscribe for unlimited
              corrections and courses.
            </p>
            <Link
              href="/subscribe"
              className="mt-4 inline-block rounded-3xl bg-lime px-6 py-2.5 text-sm font-normal text-ink hover:bg-lime-bright hover:text-ink"
            >
              Upgrade to keep correcting →
            </Link>
          </div>
        )}

        {error && !loading && !paywalled && (
          <p className="text-sm font-light text-red-300">{error}</p>
        )}

        {!loading && !hasResult && !error && !paywalled && (
          <p className="text-sm font-light text-cream/40">
            Pause after a sentence and your correction appears here.
          </p>
        )}
      </div>

      {/* "Why it slipped" — fixed card pinned to the top-right corner */}
      {correctedText !== null && (
        <aside className="reveal fixed right-6 top-6 z-20 hidden max-h-[calc(100vh-3rem)] w-[22rem] overflow-y-auto rounded-2xl border border-cream/10 bg-cocoa-panel/95 p-6 shadow-2xl backdrop-blur lg:block">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-cream/50">
            Why it slipped
          </p>
          {analysis ? (
            <div className="reveal">
              <FeedbackPanel analysis={analysis} />
            </div>
          ) : (
            <CocoaSnapLoader
              variant="correct"
              compact
              finish={pendingAnalysis !== null}
              onDone={() => setAnalysis(pendingAnalysis)}
            />
          )}
        </aside>
      )}

      {/* On small screens, show the feedback inline below (no fixed sidebar) */}
      {correctedText !== null && (
        <section className="reveal lg:hidden">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-cream/50">
            Why it slipped
          </p>
          {analysis ? (
            <FeedbackPanel analysis={analysis} />
          ) : (
            <CocoaSnapLoader
              variant="correct"
              compact
              finish={pendingAnalysis !== null}
              onDone={() => setAnalysis(pendingAnalysis)}
            />
          )}
        </section>
      )}
    </div>
  );
}

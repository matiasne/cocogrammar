"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "cocogrammar_welcomed";

// Three-step onboarding, shown once on the user's first visit.
const steps = [
  {
    emoji: "🪨",
    title: "Don't trip over the same rock twice",
    body: "Every mistake you make while writing becomes a lesson. No scolding here — just learning.",
  },
  {
    emoji: "✍️",
    title: "Use us daily for your corrections",
    body: "Write a sentence and get it corrected instantly. Every correction feeds the personalized courses waiting for you — the more you write, the richer they get.",
  },
  {
    emoji: "☕",
    title: "Then, brew a cup of chocolate and learn from your mistakes",
    body: "When you have some time, we press your slips into a personalized course — built entirely from your own habits.",
  },
];

export function WelcomeModal() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setOpen(true);
    } catch {
      // localStorage unavailable (private mode, etc.) — just skip the modal.
    }
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Ignore write failures — worst case the modal reappears next visit.
    }
    setOpen(false);
  }

  const isLast = current === steps.length - 1;

  function next() {
    if (isLast) dismiss();
    else setCurrent((c) => c + 1);
  }

  function back() {
    setCurrent((c) => Math.max(0, c - 1));
  }

  if (!open) return null;

  const step = steps[current];

  return (
    <div
      className="overlay-fade fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-cocoa/80 p-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
      onClick={dismiss}
    >
      <div
        className="rise-in relative my-auto w-full max-w-lg rounded-2xl border border-cream/10 bg-cocoa-panel p-8 shadow-2xl md:p-10"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close"
          className="absolute right-4 top-4 text-2xl leading-none text-cream/40 transition-colors hover:text-cream"
        >
          &times;
        </button>

        <p className="font-script text-4xl text-lime md:text-5xl">welcome</p>
        <h2
          id="welcome-title"
          className="mt-1 font-sans text-3xl font-extralight tracking-wide text-cream md:text-4xl"
        >
          How CocoGrammar works
        </h2>

        {/* Active step */}
        <div key={current} className="reveal mt-8 flex gap-4">
          <span
            aria-hidden
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-cream/10 bg-cocoa-deep text-2xl"
          >
            {step.emoji}
          </span>
          <div>
            <h3 className="font-sans text-xl font-light text-cream">{step.title}</h3>
            <p className="mt-2 text-[15px] font-light leading-relaxed text-cream/70">
              {step.body}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-9 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={back}
            disabled={current === 0}
            className="font-sans text-sm font-light text-cream/60 transition-colors hover:text-cream disabled:pointer-events-none disabled:opacity-0"
          >
            Back
          </button>

          <div className="flex items-center gap-4">
            {/* Progress bubbles: read/active dots sit flush and fuse into one
                pill; upcoming dots keep a gap and stay separate. */}
            <div
              className="flex items-center"
              role="progressbar"
              aria-valuemin={1}
              aria-valuemax={steps.length}
              aria-valuenow={current + 1}
              aria-label={`Step ${current + 1} of ${steps.length}`}
            >
              {steps.map((_, i) => {
                const filled = i <= current;
                const prevFilled = i > 0 && i - 1 <= current;
                const nextFilled = i + 1 <= current;
                // A read dot fuses with a read neighbour: no gap toward it, and
                // its facing corner goes square so the run reads as one pill.
                // Only the ends of a run (or a lone dot) keep rounded caps.
                const roundLeft = !prevFilled;
                const roundRight = !nextFilled;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCurrent(i)}
                    aria-label={`Go to step ${i + 1}`}
                    className={`h-2.5 w-2.5 transition-all duration-300 ease-out hover:opacity-90 ${
                      // Close the gap when this dot butts against a read dot.
                      prevFilled ? "ml-0" : "ml-1.5"
                    } ${filled ? "bg-lime" : "bg-cream/20"} ${
                      roundLeft ? "rounded-l-full" : "rounded-l-none"
                    } ${roundRight ? "rounded-r-full" : "rounded-r-none"}`}
                  />
                );
              })}
            </div>

            <button
              type="button"
              onClick={next}
              className="rounded-full bg-lime px-7 py-3 font-sans text-base font-medium tracking-wide text-ink transition-colors hover:bg-lime-bright"
            >
              {isLast ? "Start writing" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { WriterPane } from "@/components/WriterPane";

// The interactive Write surface. Client-only; auth is enforced by the server
// component that renders it (src/app/page.tsx).
export function WriterHome() {
  const [hasTyped, setHasTyped] = useState(false);
  const [hasCorrection, setHasCorrection] = useState(false);

  return (
    <div className="space-y-10">
      {/* Fixed-height wrapper so dimming/shrinking the title doesn't move the
          input — and it shrinks once a correction appears, lifting the input up. */}
      <div
        className={`flex items-center justify-center transition-all duration-500 ${
          hasCorrection
            ? "-mt-4 min-h-[2rem] md:-mt-8 md:min-h-[2.5rem]"
            : "min-h-[18rem] md:min-h-[24rem]"
        }`}
      >
        <header
          className={`relative text-center transition-all duration-500 ${
            hasCorrection
              ? "scale-[0.65] opacity-20"
              : hasTyped
                ? "scale-90 opacity-40"
                : "scale-100 opacity-100"
          }`}
        >
          <p className="font-script text-4xl text-lime md:text-5xl">learn sweetly</p>
          <h1 className="mt-2 font-sans text-6xl font-extralight leading-[0.9] tracking-wide text-cream md:text-8xl">
            WRITE
            <span className="mx-3 text-transparent [-webkit-text-stroke:1px_rgba(245,236,226,.55)]">
              BADLY
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-2xl font-light text-cream/70 md:text-3xl">
            Every slip you make becomes a lesson. Write a sentence, get it corrected, and{" "}
            <Link
              href="/course"
              className="font-script text-4xl text-lime underline-offset-4 hover:text-lime-bright hover:underline md:text-5xl"
            >
              we&rsquo;ll press your mistakes into a course — about your own habits.
            </Link>
          </p>
        </header>
      </div>

      <WriterPane
        onTypingChange={setHasTyped}
        onCorrectedChange={setHasCorrection}
      />
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

// Faithful React port of `Cocoa Snap Loader.dc.html`. A solid chocolate slab
// (4×2 = 8 blocks) snaps apart block-by-block, each drifting off with a caramel
// sheen and revealing a lesson topic — "eight blocks, eight lessons". Since
// course generation takes an unknown time, the snap sequence loops until the
// parent unmounts the loader.

const COURSE_TOPICS = [
  "Past simple",
  "Irregulars",
  "Uncountables",
  "Articles",
  "Prepositions",
  "Agreement",
  "Word order",
  "Questions",
];

// Copy for the correction flow (clicking "correct grammar").
const CORRECT_TOPICS = [
  "Spelling",
  "Tense",
  "Articles",
  "Agreement",
  "Word order",
  "Prepositions",
  "Punctuation",
  "Polish",
];

// Where each block drifts once it snaps off the slab: [x em, y em, rotate deg].
const DRIFT: [number, number, number][] = [
  [-2.1, -1.5, -7],
  [-0.7, -2.2, 4],
  [0.8, -2.0, -5],
  [2.3, -1.4, 8],
  [-2.4, 1.6, 6],
  [-0.8, 2.3, -4],
  [0.9, 2.1, 5],
  [2.5, 1.5, -8],
];

// Full snap completes in ~3.5s — slow enough to feel unhurried, but still
// quick enough to reach 100% (and hold there) during a typical wait.
const DURATION_SECONDS = 3.5;
const SPREAD = 1;

export function CocoaSnapLoader({
  variant = "course",
  compact = false,
  finish = false,
  onDone,
}: {
  variant?: "course" | "correct";
  compact?: boolean;
  // When true, the loader jumps to 100% and, after a brief hold, calls onDone.
  finish?: boolean;
  onDone?: () => void;
}) {
  const TOPICS = variant === "correct" ? CORRECT_TOPICS : COURSE_TOPICS;

  const [snapped, setSnapped] = useState(0);
  const [kick, setKick] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  // Keep the latest onDone without making the finish effect depend on its
  // identity — an inline `onDone={() => …}` changes every render, and if the
  // effect re-ran it would clear its own 900ms hand-off timer before it fired,
  // leaving the loader stuck at 100% forever.
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  // Ensures the hand-off runs exactly once.
  const doneFiredRef = useRef(false);

  useEffect(() => {
    const n = TOPICS.length;
    // All blocks snap within DURATION_SECONDS so the loader reliably reaches
    // 100% during a normal wait, then holds there until the parent unmounts it.
    const step = (DURATION_SECONDS * 1000) / n;

    // Snap the blocks off one by one, then hold at the fully-snapped (100%)
    // state until the parent unmounts the loader. It does NOT loop — if the
    // response takes longer than one cycle, it stays "done" rather than
    // resetting to 0%, which would read as a confusing restart.
    for (let i = 0; i < n; i++) {
      timers.current.push(
        setTimeout(
          () => {
            setSnapped(i + 1);
            setKick(true);
            timers.current.push(setTimeout(() => setKick(false), 220));
          },
          step * (i + 1),
        ),
      );
    }

    return () => timers.current.forEach(clearTimeout);
  }, []);

  // When the real work finishes: snap to 100%, hold briefly, then hand off ONCE.
  // Depends only on `finish` (not onDone), and guards the hand-off with a ref, so
  // parent re-renders can't restart or cancel the 900ms hold.
  useEffect(() => {
    if (!finish || doneFiredRef.current) return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setSnapped(TOPICS.length);
    setKick(true);
    const kt = setTimeout(() => setKick(false), 220);
    const t = setTimeout(() => {
      doneFiredRef.current = true;
      onDoneRef.current?.();
    }, 900);
    timers.current.push(kt, t);
    // No cleanup that clears `t`: the hold must complete even across re-renders.
    // The stepping effect's unmount cleanup clears all timers, including these.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finish]);

  const n = TOPICS.length;
  // Once the real work is done we're conceptually at 100%, even if a snap timer
  // hasn't ticked yet. Deriving the bar from `finish` (not only `snapped`)
  // guarantees the loader visibly reaches 100% — the earlier version could mount
  // with finish already true and, on the initial paint, still show < 100%.
  const displaySnapped = finish ? n : snapped;
  const pct = Math.round((displaySnapped / n) * 100);
  const trayOpacity = displaySnapped === 0 ? 1 : 0;

  const doneCaption =
    variant === "correct"
      ? "your sentence, unwrapped"
      : "eight blocks, eight lessons";
  const caption =
    displaySnapped === 0
      ? "one solid bar"
      : displaySnapped < n / 2
        ? "breaking it up"
        : displaySnapped < n
          ? "almost apart"
          : doneCaption;
  const statusLabel =
    displaySnapped < n
      ? `SNAPPING ${displaySnapped} OF ${n} BLOCKS`
      : variant === "correct"
        ? "CORRECTION READY"
        : "COURSE READY";

  return (
    <div
      className={`relative flex flex-col items-center justify-center overflow-visible ${
        compact ? "px-2 py-4" : "min-h-[70vh] px-6 py-14"
      }`}
    >
      {/* soft glow + faint outer ring (hidden when compact) */}
      {!compact && (
        <>
          <div
            className="absolute rounded-full"
            style={{
              width: 680,
              height: 680,
              background:
                "radial-gradient(closest-side,rgba(240,220,192,.14),rgba(240,220,192,0) 70%)",
              filter: "blur(6px)",
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              width: 880,
              height: 880,
              border: "1px solid rgba(245,236,226,.08)",
            }}
          />
        </>
      )}

      <div
        className="relative flex flex-col items-center"
        style={{ fontSize: compact ? 9 : 17 }}
      >
        {/* chocolate slab */}
        <div
          className="relative"
          style={{
            width: "25em",
            height: "10em",
            animation: kick ? "csShake .22s ease-out" : "none",
          }}
        >
          {/* tray backing (fades as blocks snap) */}
          <div
            style={{
              position: "absolute",
              inset: "-.5em",
              borderRadius: ".8em",
              background:
                "linear-gradient(150deg,rgba(74,46,32,.55),rgba(51,32,26,.35))",
              boxShadow: "0 30px 66px rgba(0,0,0,.45)",
              transition: "opacity .6s ease",
              opacity: trayOpacity,
            }}
          />

          {/* the 8 blocks */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gridTemplateRows: "repeat(2,1fr)",
              gap: ".34em",
            }}
          >
            {TOPICS.map((label, i) => {
              const off = i < displaySnapped;
              const d = DRIFT[i];
              const transform = off
                ? `translate(${(d[0] * SPREAD).toFixed(2)}em,${(
                    d[1] * SPREAD
                  ).toFixed(2)}em) rotate(${d[2]}deg) scale(1.02)`
                : "none";
              return (
                <div
                  key={i}
                  style={{
                    position: "relative",
                    borderRadius: ".28em",
                    overflow: "hidden",
                    background: "linear-gradient(150deg,#5f3d29,#3d2419)",
                    boxShadow:
                      "inset 0 .09em 0 rgba(245,236,226,.18),inset 0 -.12em .18em rgba(0,0,0,.42),0 .5em 1.4em rgba(0,0,0,.35)",
                    transition:
                      "transform .9s cubic-bezier(.2,1.25,.35,1),opacity .9s ease,box-shadow .55s ease",
                    transform,
                    opacity: off ? 1 : 0.92,
                    zIndex: off ? 2 : 1,
                  }}
                >
                  {/* caramel sheen revealed on snap */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "linear-gradient(#f0dcc0,#c58a4e 44%,#8a5a34)",
                      transition: "opacity .65s ease",
                      opacity: off ? 0.55 : 0,
                      mixBlendMode: "soft-light",
                    }}
                  />
                  {/* block number */}
                  <div
                    style={{
                      position: "absolute",
                      left: ".4em",
                      top: ".34em",
                      font: "400 .58em/1 var(--font-ibm-plex-mono),monospace",
                      letterSpacing: ".08em",
                      transition: "color .4s ease",
                      color: off
                        ? "rgba(36,21,17,.7)"
                        : "rgba(245,236,226,.32)",
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  {/* lesson label revealed on snap */}
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      bottom: ".38em",
                      textAlign: "center",
                      font: "300 .62em/1.2 var(--font-jost),sans-serif",
                      transition: "opacity .65s ease",
                      opacity: off ? 1 : 0,
                      color: "rgba(255,246,232,.9)",
                    }}
                  >
                    {label}
                  </div>
                </div>
              );
            })}
          </div>

          {/* gloss sweep over the intact tray */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: ".7em",
              overflow: "hidden",
              pointerEvents: "none",
              transition: "opacity .6s ease",
              opacity: trayOpacity,
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "-20%",
                left: 0,
                width: "18%",
                height: "140%",
                background:
                  "linear-gradient(90deg,rgba(255,246,232,0),rgba(255,246,232,.18),rgba(255,246,232,0))",
                animation: "csGloss 3.6s ease-in-out infinite",
              }}
            />
          </div>
        </div>

        {/* wordmark */}
        <div
          style={{
            font: `200 ${compact ? 22 : 44}px/1 var(--font-jost),sans-serif`,
            letterSpacing: ".42em",
            color: "transparent",
            WebkitTextStroke: "1px rgba(245,236,226,.5)",
            marginTop: compact ? 24 : 52,
            paddingLeft: ".42em",
          }}
        >
          COCOA
        </div>
        <div
          className="font-script text-lime"
          style={{
            font: `400 ${compact ? 20 : 32}px/1 var(--font-ephesis),cursive`,
            marginTop: compact ? 8 : 12,
            minHeight: "1em",
          }}
        >
          {caption}
        </div>

        {/* progress bar */}
        <div style={{ width: "25em", marginTop: compact ? 16 : 30 }}>
          <div style={{ height: 1, background: "rgba(245,236,226,.18)" }}>
            <div
              style={{
                height: 1,
                background: "#e4f24a",
                transition: "width .4s cubic-bezier(.4,0,.2,1)",
                width: `${pct}%`,
              }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-cream/50">
            <span style={{ animation: "csBlink 1.8s ease-in-out infinite" }}>
              {statusLabel}
            </span>
            <span className="text-lime">{pct}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

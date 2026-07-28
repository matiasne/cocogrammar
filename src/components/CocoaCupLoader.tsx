"use client";

import { useEffect, useRef, useState } from "react";

// Faithful React port of `Cocoa Cup Loader.dc.html` — a mug of hot chocolate
// where squares drop in one by one, each landing with a ripple, steam rising as
// it finishes. Background is transparent (shows over the page). Runs once and
// holds at "ready" until the parent unmounts it (no loop reset).

const TOTAL = 7;
const DURATION_SECONDS = 5;

type Drop = { id: number; left: number; anim: string };

export function CocoaCupLoader({
  finish = false,
  onDone,
}: {
  // When true, the loader jumps to 100% and, after a brief hold, calls onDone.
  finish?: boolean;
  onDone?: () => void;
}) {
  const [dropped, setDropped] = useState(0);
  const [drops, setDrops] = useState<Drop[]>([]);
  const [rippleId, setRippleId] = useState<number | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const step = (DURATION_SECONDS * 1000) / TOTAL;

    for (let i = 0; i < TOTAL; i++) {
      timers.current.push(
        setTimeout(() => {
          const id = i;
          const left = 50 + (((i * 7) % 11) - 5) * 0.9;
          // Alternate keyframe name so reused nodes actually restart.
          const anim =
            (i % 2 ? "ccDropB" : "ccDrop") + " .8s cubic-bezier(.5,.02,.7,1) forwards";
          setDrops((s) => [...s, { id, left, anim }]);

          // On landing: fill rises, ripple fires, drop node is cleaned up.
          timers.current.push(
            setTimeout(() => {
              setDropped((d) => d + 1);
              setRippleId(id);
              setDrops((s) => s.filter((d) => d.id !== id));
              timers.current.push(
                setTimeout(() => setRippleId((r) => (r === id ? null : r)), 800),
              );
            }, 720),
          );
        }, step * i),
      );
    }

    return () => timers.current.forEach(clearTimeout);
  }, []);

  // When the real work finishes: snap to 100%, hold briefly, then hand off.
  useEffect(() => {
    if (!finish) return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setDrops([]);
    setDropped(TOTAL);
    const t = setTimeout(() => onDone?.(), 900);
    return () => clearTimeout(t);
  }, [finish, onDone]);

  const pct = Math.round((dropped / TOTAL) * 100);
  const steamOpacity = dropped >= TOTAL - 1 ? 1 : 0;
  const statusLabel =
    dropped < TOTAL ? `${dropped} OF ${TOTAL} SQUARES IN` : "STIRRED AND READY";
  const caption =
    dropped === 0
      ? "warming the milk"
      : dropped < 4
        ? "dropping the squares"
        : dropped < TOTAL
          ? "stirring it through"
          : "your cup is ready";

  return (
    <div className="relative flex flex-col items-center justify-center overflow-visible px-6 py-10">
      <div
        className="relative flex flex-col items-center"
        style={{ fontSize: 18 }}
      >
        {/* mug scene */}
        <div
          className="relative flex items-end justify-center"
          style={{ width: "16em", height: "16em" }}
        >
          {/* dropping squares */}
          {drops.map((d) => (
            <div
              key={d.id}
              style={{
                position: "absolute",
                left: `${d.left}%`,
                top: 0,
                zIndex: 1,
                // @ts-expect-error CSS custom property for the landing offset
                "--land": "9.2em",
                width: "1.5em",
                height: "1.5em",
                borderRadius: ".22em",
                background: "#5b3a27",
                animation: d.anim,
              }}
            />
          ))}

          {/* ripple splash on landing */}
          {rippleId !== null && (
            <div
              key={`ripple-${rippleId}`}
              style={{
                position: "absolute",
                left: "50%",
                bottom: "8em",
                zIndex: 4,
                width: "2.2em",
                height: ".5em",
                borderRadius: ".25em",
                border: ".14em solid #c58a4e",
                borderBottom: "none",
                opacity: 0,
                animation: "ccRipple .8s ease-out",
              }}
            />
          )}

          {/* handle */}
          <div
            style={{
              position: "absolute",
              right: "1.7em",
              bottom: "3.1em",
              zIndex: 2,
              width: "2.4em",
              height: "2.8em",
              border: ".4em solid #efe0cd",
              borderLeft: "none",
              borderRadius: "0 1.6em 1.6em 0",
            }}
          />

          {/* cup body + chocolate surface */}
          <div style={{ position: "relative", width: "7.4em", height: "8em", zIndex: 3 }}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: ".3em .3em 1.6em 1.6em",
                background: "#efe0cd",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: ".4em",
                right: ".4em",
                top: ".4em",
                height: "1.1em",
                borderRadius: ".18em",
                background: "#3a2418",
              }}
            />
          </div>

          {/* steam */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              bottom: "8.3em",
              width: "5.6em",
              height: "3.4em",
              pointerEvents: "none",
              transition: "opacity .8s ease",
              opacity: steamOpacity,
              zIndex: 1,
            }}
          >
            <div
              style={{
                position: "absolute",
                left: "22%",
                bottom: 0,
                width: ".34em",
                height: "1.6em",
                borderRadius: ".17em",
                background: "rgba(255,246,232,.35)",
                animation: "ccSteam 3.2s ease-out infinite",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: "48%",
                bottom: 0,
                width: ".34em",
                height: "1.3em",
                borderRadius: ".17em",
                background: "rgba(255,246,232,.3)",
                animation: "ccSteam 3.2s ease-out .9s infinite",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: "68%",
                bottom: 0,
                width: ".34em",
                height: "1.5em",
                borderRadius: ".17em",
                background: "rgba(255,246,232,.26)",
                animation: "ccSteam 3.2s ease-out 1.8s infinite",
              }}
            />
          </div>

          {/* shadow */}
          <div
            style={{
              position: "absolute",
              bottom: "-.2em",
              width: "8.6em",
              height: ".3em",
              borderRadius: ".15em",
              background: "rgba(0,0,0,.22)",
            }}
          />
        </div>

        {/* wordmark */}
        <div
          style={{
            font: "200 44px/1 Jost,sans-serif",
            letterSpacing: ".42em",
            color: "transparent",
            WebkitTextStroke: "1px rgba(245,236,226,.5)",
            marginTop: 44,
            paddingLeft: ".42em",
          }}
        >
          COCOA
        </div>
        <div
          className="font-script text-lime"
          style={{ font: "400 32px/1 Ephesis,cursive", marginTop: 12, minHeight: "1em" }}
        >
          {caption}
        </div>

        {/* progress bar */}
        <div style={{ width: "19em", marginTop: 30 }}>
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
            <span style={{ animation: "ccBlink 1.8s ease-in-out infinite" }}>
              {statusLabel}
            </span>
            <span className="text-lime">{pct}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

// Faithful React port of `Cocoa Loader.dc.html`. Since course generation takes an
// unknown few seconds, the progress bar self-animates in a loop (same easing as
// the design) to convey "melting" while the real request runs. When the request
// finishes, the parent unmounts this component.
const LOADER_SECONDS = 2.6;

export function CocoaLoader() {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    let raf = 0;
    let timeout: ReturnType<typeof setTimeout>;
    let start = 0;

    const run = () => {
      start = performance.now();
      const tick = () => {
        const p = Math.min(1, (performance.now() - start) / (LOADER_SECONDS * 1000));
        setPct(Math.round((1 - Math.pow(1 - p, 2.2)) * 100));
        if (p < 1) {
          raf = requestAnimationFrame(tick);
        } else {
          // loop
          timeout = setTimeout(run, 900);
        }
      };
      raf = requestAnimationFrame(tick);
    };

    run();
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timeout);
    };
  }, []);

  const caption =
    pct < 45 ? "tempering" : pct < 85 ? "reading your sentences" : "almost poured";

  return (
    <div
      className="relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden rounded-2xl"
      style={{
        background:
          "radial-gradient(90% 70% at 50% 42%,#5a3826 0%,#3a2217 52%,#241611 100%)",
      }}
    >
      {/* soft central glow */}
      <div
        className="absolute rounded-full"
        style={{
          width: 640,
          height: 640,
          background:
            "radial-gradient(closest-side,rgba(240,220,192,.16),rgba(240,220,192,0) 70%)",
          filter: "blur(4px)",
        }}
      />

      {/* ring + chocolate bar */}
      <div className="relative flex h-[230px] w-[230px] items-center justify-center">
        {/* base ring */}
        <div
          className="absolute inset-0 rounded-full"
          style={{ border: "1px solid rgba(245,236,226,.14)" }}
        />
        {/* fast lime top arc */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            border: "1px solid transparent",
            borderTopColor: "#e4f24a",
            animation: "cdSpin 1.5s cubic-bezier(.5,.1,.4,.9) infinite",
          }}
        />
        {/* slow faint bottom arc */}
        <div
          className="absolute rounded-full"
          style={{
            inset: 26,
            border: "1px solid transparent",
            borderBottomColor: "rgba(228,242,74,.35)",
            animation: "cdSpinSlow 2.6s linear infinite",
          }}
        />
        {/* chocolate bar */}
        <div
          className="relative grid overflow-hidden"
          style={{
            width: 104,
            height: 104,
            borderRadius: 10,
            background: "linear-gradient(150deg,#5b3a27,#3a2418)",
            border: "1px solid rgba(245,236,226,.16)",
            boxShadow:
              "inset 0 1px 0 rgba(245,236,226,.14),0 18px 40px rgba(0,0,0,.5)",
            gridTemplateColumns: "1fr 1fr",
            gridTemplateRows: "1fr 1fr",
          }}
        >
          <div
            style={{
              borderRight: "1px solid rgba(245,236,226,.1)",
              borderBottom: "1px solid rgba(245,236,226,.1)",
            }}
          />
          <div style={{ borderBottom: "1px solid rgba(245,236,226,.1)" }} />
          <div style={{ borderRight: "1px solid rgba(245,236,226,.1)" }} />
          <div />
          {/* molten fill rising with progress */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: `${pct}%`,
              background: "linear-gradient(#f0dcc0,#c58a4e 42%,#8a5a34)",
              opacity: 0.95,
              boxShadow: "0 -1px 0 rgba(228,242,74,.75)",
              transition: "height .2s linear",
            }}
          />
        </div>
        {/* lime drip */}
        <div
          style={{
            position: "absolute",
            top: 172,
            left: "50%",
            width: 3,
            height: 16,
            borderRadius: 2,
            background: "#e4f24a",
            animation: "cdDrip 1.9s ease-in infinite",
          }}
        />
      </div>

      {/* wordmark */}
      <div
        className="mt-[52px]"
        style={{
          font: "200 62px/1 var(--font-jost),sans-serif",
          letterSpacing: ".42em",
          color: "transparent",
          WebkitTextStroke: "1px rgba(245,236,226,.5)",
          paddingLeft: ".42em",
        }}
      >
        COCOA
      </div>
      <div
        className="mt-3.5 font-script text-[34px] text-lime"
        style={{ lineHeight: 1 }}
      >
        {caption}
      </div>

      {/* progress bar */}
      <div className="mt-[34px] w-[300px]">
        <div style={{ height: 1, background: "rgba(245,236,226,.18)" }}>
          <div
            style={{
              height: 1,
              background: "#e4f24a",
              width: `${pct}%`,
              transition: "width .18s linear",
            }}
          />
        </div>
        <div className="mt-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-cream/50">
          <span style={{ animation: "cdBreathe 1.8s ease-in-out infinite" }}>
            Melting your lessons
          </span>
          <span className="text-lime">{pct}%</span>
        </div>
      </div>
    </div>
  );
}

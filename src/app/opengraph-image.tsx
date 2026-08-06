import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "CocoGrammar — learn sweetly. Every slip becomes a lesson.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Cocoa Dark palette (see tailwind.config.ts).
const COCOA = "#180b08";
const CREAM = "#f5ece2";
const LIME = "#e4f24a";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px 90px",
          backgroundColor: COCOA,
          backgroundImage: `radial-gradient(120% 90% at 62% 26%, #4a2318 0%, #2c1410 48%, #1a0c09 100%)`,
        }}
      >
        <div style={{ display: "flex", fontSize: 30, color: LIME, letterSpacing: 2 }}>
          COCOGRAMMAR
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontSize: 88,
            fontWeight: 300,
            color: CREAM,
            lineHeight: 1.05,
            letterSpacing: -1,
          }}
        >
          Every slip you make
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 88,
            fontWeight: 300,
            color: CREAM,
            lineHeight: 1.05,
            letterSpacing: -1,
          }}
        >
          becomes a <span style={{ color: LIME, marginLeft: 22 }}>lesson.</span>
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 40,
            fontSize: 34,
            color: "rgba(245,236,226,0.72)",
            maxWidth: 940,
          }}
        >
          AI grammar coaching pressed from your own mistakes.
        </div>
      </div>
    ),
    { ...size },
  );
}

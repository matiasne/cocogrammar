import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

// A "C" mark on the cocoa background with the chartreuse accent.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#180b08",
          backgroundImage:
            "radial-gradient(120% 90% at 62% 26%, #4a2318 0%, #2c1410 48%, #1a0c09 100%)",
          color: "#e4f24a",
          fontSize: 360,
          fontWeight: 300,
        }}
      >
        C
      </div>
    ),
    { ...size },
  );
}

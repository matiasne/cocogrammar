import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Cocoa Dark palette
        cocoa: "#180b08", // near-black cocoa background
        "cocoa-panel": "#25110d", // card / panel surface
        "cocoa-deep": "#1a0c09",
        cream: "#f5ece2", // primary text
        lime: "#e4f24a", // chartreuse accent
        "lime-bright": "#f2ff7a",
        ink: "#1c0d0a", // dark text on lime
      },
      fontFamily: {
        sans: ["Jost", "system-ui", "sans-serif"],
        reading: ["Lora", "Georgia", "serif"],
        script: ["Ephesis", "cursive"],
        mono: ["IBM Plex Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CocoGrammar — learn sweetly",
    short_name: "CocoGrammar",
    description:
      "AI English grammar coach that turns the mistakes you make into a personalized course built from your own habits.",
    start_url: "/",
    display: "standalone",
    background_color: "#180b08",
    theme_color: "#180b08",
    categories: ["education", "productivity"],
    lang: "en",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}

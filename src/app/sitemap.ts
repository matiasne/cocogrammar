import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://cocogrammar.com";

// Public, indexable routes only. Auth-gated surfaces (login, signup, subscribe,
// history) are intentionally excluded — see robots.ts.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/course`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];
}

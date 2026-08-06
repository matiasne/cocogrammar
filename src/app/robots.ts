import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://cocogrammar.com";

// Private/functional routes that carry no SEO value and shouldn't be crawled.
const DISALLOW = ["/api/", "/auth/", "/login", "/signup", "/subscribe", "/history"];

// Explicitly welcome the answer-engine crawlers (GEO). Their user agents are
// listed separately so that, if we ever tighten the default `*` rule, these
// stay allowed to read and cite CocoGrammar.
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
  "cohere-ai",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      ...AI_CRAWLERS.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: DISALLOW,
      })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}

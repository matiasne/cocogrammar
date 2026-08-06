import type { Metadata } from "next";
import Link from "next/link";
import { Jost, Ephesis, IBM_Plex_Mono, Lora } from "next/font/google";
import "./globals.css";
import { getUserOrNull } from "@/lib/auth";
import { NavAuth } from "@/components/NavAuth";
import { WelcomeModal } from "@/components/WelcomeModal";
import { PageTransition } from "@/components/PageTransition";

export const dynamic = "force-dynamic";

// Self-hosted + preloaded via next/font — replaces the render-blocking Google
// Fonts @import that previously sat at the top of globals.css. Each exposes a
// CSS variable consumed by tailwind.config.ts and the raw rules in globals.css.
const jost = Jost({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500"],
  variable: "--font-jost",
  display: "swap",
});
const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-lora",
  display: "swap",
});
const ephesis = Ephesis({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-ephesis",
  display: "swap",
});
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-ibm-plex-mono",
  display: "swap",
});
const fontVariables = `${jost.variable} ${lora.variable} ${ephesis.variable} ${ibmPlexMono.variable}`;

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://cocogrammar.com";
const SITE_NAME = "CocoGrammar";
const TAGLINE = "AI English grammar coach that turns your mistakes into a personalized course";
const DESCRIPTION =
  "CocoGrammar is a free AI English grammar checker and coach. Write a sentence, get an instant correction, and watch your own mistakes get pressed into a personalized grammar course built around your habits. Learn English writing by fixing the errors you actually make.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "CocoGrammar — AI grammar coach that learns from your mistakes",
    template: "%s · CocoGrammar",
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "AI grammar checker",
    "English grammar coach",
    "learn English writing",
    "personalized grammar course",
    "grammar correction",
    "English writing practice",
    "fix grammar mistakes",
    "ESL writing",
    "grammar feedback",
    "AI English tutor",
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "education",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "CocoGrammar — AI grammar coach that learns from your mistakes",
    description: DESCRIPTION,
    locale: "en_US",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "CocoGrammar — learn sweetly. Every slip becomes a lesson.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CocoGrammar — AI grammar coach that learns from your mistakes",
    description: TAGLINE + ". Every slip you make becomes a lesson.",
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: "/icon",
    apple: "/icon",
  },
};

// Structured data (JSON-LD) — helps both traditional SEO rich results and GEO
// (answer engines like ChatGPT, Perplexity, Google AI Overviews) understand
// what CocoGrammar is, how it's priced, and what it costs nothing to try.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      description: DESCRIPTION,
      logo: `${SITE_URL}/icon`,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: TAGLINE,
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "en",
    },
    {
      "@type": ["SoftwareApplication", "EducationalApplication"],
      "@id": `${SITE_URL}/#app`,
      name: SITE_NAME,
      applicationCategory: "EducationApplication",
      operatingSystem: "Web",
      url: SITE_URL,
      description: DESCRIPTION,
      featureList: [
        "Instant AI grammar correction",
        "Personalized grammar courses generated from your own mistakes",
        "Chapter-based exercises and challenges",
        "Progress history of every correction",
      ],
      offers: [
        {
          "@type": "Offer",
          name: "Free plan",
          price: "0",
          priceCurrency: "USD",
          description: "10 sentence checks and 4 personalized course generations, free.",
        },
        {
          "@type": "Offer",
          name: "Cocoa Unlimited",
          price: "5",
          priceCurrency: "USD",
          description:
            "Unlimited grammar corrections and unlimited personalized courses. Cancel anytime.",
        },
      ],
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE_URL}/#faq`,
      mainEntity: [
        {
          "@type": "Question",
          name: "What is CocoGrammar?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "CocoGrammar is an AI English grammar coach. You write a sentence, it corrects it instantly, and it turns the mistakes you actually make into a personalized grammar course tailored to your own habits.",
          },
        },
        {
          "@type": "Question",
          name: "Is CocoGrammar free?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. The free plan includes 10 sentence corrections and 4 personalized course generations. Cocoa Unlimited is $5/month for unlimited corrections and courses, and you can cancel anytime.",
          },
        },
        {
          "@type": "Question",
          name: "How is CocoGrammar different from a normal grammar checker?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "A normal grammar checker just fixes a sentence and moves on. CocoGrammar remembers the mistakes you repeat and presses them into a personalized course, so you stop tripping over the same rock twice.",
          },
        },
      ],
    },
  ],
};

const navLinks = [
  { href: "/", label: "Write" },
  { href: "/course", label: "Course" },
  { href: "/history", label: "Log" },
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getUserOrNull();
  return (
    <html lang="en" className={fontVariables}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <WelcomeModal />
        <header>
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 md:px-14">
            <Link href="/" className="text-2xl font-light tracking-wide text-cream hover:text-cream">
              CocoGrammar
            </Link>
            <div className="hidden gap-11 text-[15px] font-light text-cream/70 md:flex">
              {navLinks.map((l) => (
                <Link key={l.href} href={l.href} className="text-cream/70 hover:text-cream">
                  {l.label}
                </Link>
              ))}
            </div>
            <NavAuth
              email={user?.email ?? null}
              isSubscribed={user?.isSubscribed ?? false}
              sentencesUsed={user?.sentencesUsed ?? 0}
              coursesUsed={user?.coursesUsed ?? 0}
            />
          </nav>
          {/* Mobile nav */}
          <div className="flex gap-6 px-6 pb-4 text-sm font-light text-cream/70 md:hidden">
            {navLinks.map((l) => (
              <Link key={l.href} href={l.href} className="text-cream/70 hover:text-cream">
                {l.label}
              </Link>
            ))}
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8 md:px-14">
          <PageTransition>{children}</PageTransition>
        </main>
      </body>
    </html>
  );
}

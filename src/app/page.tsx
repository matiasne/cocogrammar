import type { Metadata } from "next";
import { WriterHome } from "@/components/WriterHome";

export const metadata: Metadata = {
  title: "CocoGrammar — AI grammar coach that learns from your mistakes",
  description:
    "Write a sentence, get an instant AI grammar correction, and let CocoGrammar press your mistakes into a personalized English course built around your own habits. Free to start.",
  alternates: { canonical: "/" },
};

// Public: guests can view and try the Write surface. The correction API stays
// auth-gated, so acting while logged out prompts a login (handled in WriterPane).
//
// The interactive surface (WriterHome) is a near-empty canvas by design, which
// leaves crawlers and answer engines (GEO) with almost nothing to read. The
// sr-only block below gives them real, indexable prose describing the product
// without touching the visual design.
export default function HomePage() {
  return (
    <>
      <section className="sr-only">
        <h1>CocoGrammar — AI English grammar coach that learns from your mistakes</h1>
        <p>
          CocoGrammar is a free AI-powered English grammar checker and writing
          coach. Write a sentence and get it corrected instantly. Every mistake
          you make becomes a lesson: CocoGrammar remembers the errors you repeat
          and presses them into a personalized grammar course built entirely from
          your own habits, so you stop tripping over the same rock twice.
        </p>
        <h2>How CocoGrammar works</h2>
        <ol>
          <li>
            Write in plain English. Type any sentence into the writing surface —
            no prompts, no exercises to pick.
          </li>
          <li>
            Get an instant correction. CocoGrammar fixes the grammar, spelling,
            and phrasing and explains what changed.
          </li>
          <li>
            Learn from your own habits. Your corrections feed a personalized
            course of chapters and exercises drawn from the mistakes you actually
            make.
          </li>
        </ol>
        <h2>Pricing</h2>
        <p>
          CocoGrammar is free to start: the free plan includes 10 sentence
          corrections and 4 personalized course generations. Cocoa Unlimited is
          $5 per month for unlimited grammar corrections and unlimited
          personalized courses, and you can cancel anytime.
        </p>
        <h2>Who it&rsquo;s for</h2>
        <p>
          CocoGrammar is for English learners, ESL students, and anyone who wants
          to improve their written English by fixing the errors they repeat —
          rather than working through generic textbook grammar drills.
        </p>
      </section>
      <WriterHome />
    </>
  );
}

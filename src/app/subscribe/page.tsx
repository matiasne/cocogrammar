import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUserOrNull } from "@/lib/auth";
import { usdToArs } from "@/lib/fx";
import { MercadoPagoBrick } from "@/components/MercadoPagoBrick";

export const dynamic = "force-dynamic";

// Auth-gated (guests are redirected to /login) — keep it out of the index.
export const metadata: Metadata = {
  title: "Cocoa Unlimited — unlimited corrections & courses",
  description:
    "Go unlimited for $5/month: unlimited AI grammar corrections and as many personalized courses as you want. Cancel anytime.",
  robots: { index: false, follow: true },
};

export default async function SubscribePage() {
  const user = await getUserOrNull();
  if (!user) redirect("/login");

  // Priced in USD; charged in ARS at the live rate (MercadoPago AR settles in ARS).
  const usd = Number(process.env.MP_MONTHLY_AMOUNT_USD ?? "5");
  const currency = process.env.MP_CURRENCY_ID ?? "ARS";
  const { ars } = await usdToArs(usd);
  const arsFormatted = new Intl.NumberFormat("es-AR").format(ars);

  if (user.isSubscribed) {
    return (
      <div className="mx-auto mt-16 max-w-md text-center">
        <p className="font-script text-4xl text-lime">go unlimited</p>
        <h1 className="mt-1 text-3xl font-light text-cream">Cocoa Unlimited</h1>
        <p className="mt-8 font-reading text-lg font-normal text-cream/85">
          You&rsquo;re already subscribed — write and generate courses to your heart&rsquo;s content. 🍫
        </p>
      </div>
    );
  }

  const perks = [
    "Unlimited grammar corrections",
    "As many personalized courses as you want",
    "Every slip keeps feeding your next lesson",
  ];

  return (
    <div className="mx-auto mt-16 grid max-w-5xl items-start gap-10 lg:grid-cols-2 lg:gap-16">
      {/* Left column — the pitch */}
      <div>
        <p className="font-script text-4xl text-lime">go unlimited</p>
        <h1 className="mt-1 text-4xl font-light text-cream">Cocoa Unlimited</h1>
        <p className="mt-6 font-reading text-lg font-normal leading-relaxed text-cream/85">
          The free plan gives you 10 sentence checks and 4 course generations.
          Subscribe for <span className="text-lime">unlimited</span> writing and
          as many personalized courses as you like.
        </p>

        <ul className="mt-8 space-y-3">
          {perks.map((perk) => (
            <li key={perk} className="flex items-start gap-3 font-reading text-base text-cream/85">
              <span className="mt-0.5 text-lime">✓</span>
              {perk}
            </li>
          ))}
        </ul>

        <div className="mt-8 flex items-baseline gap-2">
          <span className="text-3xl font-light text-cream">${usd} USD</span>
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-cream/45">
            / month · cancel anytime
          </span>
        </div>
        <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.14em] text-cream/45">
          ≈ {arsFormatted} {currency} charged at today&rsquo;s rate
        </p>
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-cream/40">
          {user.sentencesUsed}/10 sentences · {user.coursesUsed}/4 courses used
        </p>
      </div>

      {/* Right column — the card form panel */}
      <div className="rounded-2xl border border-cream/12 bg-cocoa-panel/80 p-6 shadow-2xl backdrop-blur">
        <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.16em] text-cream/50">
          Payment details
        </p>
        <MercadoPagoBrick amount={ars} />
      </div>
    </div>
  );
}

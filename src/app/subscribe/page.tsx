import { redirect } from "next/navigation";
import { getUserOrNull } from "@/lib/auth";
import { SubscribeButton } from "@/components/SubscribeButton";

export const dynamic = "force-dynamic";

export default async function SubscribePage() {
  const user = await getUserOrNull();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto mt-16 max-w-md text-center">
      <p className="font-script text-4xl text-lime">go unlimited</p>
      <h1 className="mt-1 text-3xl font-light text-cream">Cocoa Unlimited</h1>

      {user.isSubscribed ? (
        <p className="mt-8 font-reading text-lg font-normal text-cream/85">
          You&rsquo;re already subscribed — write and generate courses to your heart&rsquo;s content. 🍫
        </p>
      ) : (
        <>
          <p className="mt-6 font-reading text-lg font-normal leading-relaxed text-cream/85">
            The free plan gives you 10 sentence checks and 4 course generations.
            Subscribe for <span className="text-lime">unlimited</span> writing and
            as many personalized courses as you like.
          </p>
          <div className="mt-8 flex justify-center">
            <SubscribeButton />
          </div>
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-cream/40">
            {user.sentencesUsed}/10 sentences · {user.coursesUsed}/4 courses used
          </p>
        </>
      )}
    </div>
  );
}

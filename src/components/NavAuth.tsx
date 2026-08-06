"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// Right-hand nav slot: usage indicator + sign out for logged-in users, or a
// Log in / Sign up CTA for guests.
export function NavAuth({
  email,
  isSubscribed,
  sentencesUsed,
  coursesUsed,
}: {
  email: string | null;
  isSubscribed: boolean;
  sentencesUsed: number;
  coursesUsed: number;
}) {
  const router = useRouter();

  if (!email) {
    return (
      <Link
        href="/login"
        className="rounded-3xl bg-lime px-6 py-2.5 text-[15px] font-normal text-ink hover:bg-lime-bright hover:text-ink"
      >
        Log in
      </Link>
    );
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-4">
      {isSubscribed ? (
        <span className="hidden font-mono text-[10px] uppercase tracking-[0.14em] text-lime sm:inline">
          Unlimited
        </span>
      ) : (
        <span className="hidden font-mono text-[10px] uppercase tracking-[0.14em] text-cream/45 sm:inline">
          {sentencesUsed}/10 sentences · {coursesUsed}/4 courses
        </span>
      )}
      <Link
        href="/subscribe"
        className={
          isSubscribed
            ? "text-[13px] font-light text-cream/70 hover:text-cream"
            : "rounded-3xl bg-lime px-5 py-2 text-[13px] font-normal text-ink hover:bg-lime-bright hover:text-ink"
        }
      >
        {isSubscribed ? "Subscription" : "Subscribe"}
      </Link>
      <button
        onClick={signOut}
        className="text-[13px] font-light text-cream/60 hover:text-cream"
        title={email}
      >
        Logout
      </button>
    </div>
  );
}

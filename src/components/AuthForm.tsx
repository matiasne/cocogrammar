"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Shared login/signup surface: "Continue with Google" + an email/password form.
// Used both as the full /login and /signup pages and inside LoginModal.
//
// - `embedded`: drop page margins and toggle login/signup INSIDE the component
//   (via a button) instead of linking to the separate pages — so a modal user
//   never navigates away and loses their in-progress input.
// - `onSuccess`: called after a successful email/password login. The modal uses
//   it to close + refresh in place; the pages fall back to navigating home.
export function AuthForm({
  mode = "login",
  embedded = false,
  onSuccess,
}: {
  mode?: "login" | "signup";
  embedded?: boolean;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [currentMode, setCurrentMode] = useState<"login" | "signup">(mode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isSignup = currentMode === "signup";

  async function withGoogle() {
    setError(null);
    const supabase = createClient();
    // Return to the current page so a modal login lands the user back where they
    // were, with their input intact.
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
      window.location.pathname + window.location.search,
    )}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) setError(error.message);
  }

  async function withEmail(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const supabase = createClient();
    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        // If email confirmation is on, there's no session yet.
        if (!data.session) {
          setNotice("Check your email to confirm your account, then log in.");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      if (onSuccess) {
        onSuccess();
        router.refresh();
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={embedded ? "" : "mx-auto mt-16 max-w-sm"}>
      {!embedded && (
        <>
          <p className="font-script text-4xl text-lime">
            {isSignup ? "join sweetly" : "welcome back"}
          </p>
          <h1 className="mt-1 text-2xl font-light text-cream">
            {isSignup ? "Create your account" : "Log in to Cocoa"}
          </h1>
        </>
      )}

      <button
        onClick={withGoogle}
        className={`flex w-full items-center justify-center gap-3 rounded-2xl border border-cream/25 bg-cream/[0.04] px-6 py-3 text-[15px] font-light text-cream hover:border-lime/50 hover:text-lime ${
          embedded ? "" : "mt-8"
        }`}
      >
        Continue with Google
      </button>

      <div className="my-6 flex items-center gap-4">
        <span className="h-px flex-1 bg-cream/15" />
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-cream/40">
          or
        </span>
        <span className="h-px flex-1 bg-cream/15" />
      </div>

      <form onSubmit={withEmail} className="space-y-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          className="w-full rounded-2xl border border-cream/20 bg-cream/5 px-4 py-3 text-[15px] font-light text-cream placeholder:text-cream/40 focus:border-lime/50 focus:outline-none"
        />
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoComplete={isSignup ? "new-password" : "current-password"}
          className="w-full rounded-2xl border border-cream/20 bg-cream/5 px-4 py-3 text-[15px] font-light text-cream placeholder:text-cream/40 focus:border-lime/50 focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-2xl bg-lime px-6 py-3 text-[15px] font-normal text-ink hover:bg-lime-bright disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "…" : isSignup ? "Sign up" : "Log in"}
        </button>
      </form>

      {error && <p className="mt-4 text-sm font-light text-red-300">{error}</p>}
      {notice && <p className="mt-4 text-sm font-light text-lime">{notice}</p>}

      <p className="mt-6 text-center text-sm font-light text-cream/60">
        {isSignup ? "Already have an account? " : "New here? "}
        {embedded ? (
          // Toggle in place — never leaves the modal.
          <button
            type="button"
            onClick={() => {
              setCurrentMode(isSignup ? "login" : "signup");
              setError(null);
              setNotice(null);
            }}
            className="text-lime hover:text-lime-bright"
          >
            {isSignup ? "Log in" : "Create an account"}
          </button>
        ) : (
          <Link href={isSignup ? "/login" : "/signup"} className="text-lime">
            {isSignup ? "Log in" : "Create an account"}
          </Link>
        )}
      </p>
    </div>
  );
}

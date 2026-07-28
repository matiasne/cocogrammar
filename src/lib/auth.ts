import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, type AppUser } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";

// Thrown by requireUser() when there's no session. API routes catch it and
// return `unauthorized()`.
export class UnauthorizedError extends Error {
  constructor() {
    super("Not authenticated");
    this.name = "UnauthorizedError";
  }
}

export function unauthorized() {
  return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
}

/**
 * The single bridge from Supabase Auth to our `public.users` row.
 * - Reads the Supabase session (throws UnauthorizedError if none).
 * - Lazily upserts the app-user row, keyed on `id` = the Supabase auth uid.
 * - Returns the full app user record (with plan + usage counters).
 */
export async function requireUser(): Promise<AppUser> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new UnauthorizedError();

  const email = user.email ?? `${user.id}@no-email.local`;
  const displayName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    null;

  // Idempotent: first request creates the row, later ones no-op on the PK.
  await db
    .insert(users)
    .values({ id: user.id, email, displayName })
    .onConflictDoNothing({ target: users.id });

  const [row] = await db.select().from(users).where(eq(users.id, user.id));
  return row;
}

/** Non-throwing variant for Server Components that render for logged-out users. */
export async function getUserOrNull(): Promise<AppUser | null> {
  try {
    return await requireUser();
  } catch {
    return null;
  }
}

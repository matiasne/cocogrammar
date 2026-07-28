import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { preApproval } from "@/lib/mercadopago";
import { db } from "@/db";
import { users } from "@/db/schema";

export const runtime = "nodejs";

// Public route (see middleware PUBLIC_PREFIXES). MercadoPago sends a thin
// notification — we fetch the referenced preapproval and sync isSubscribed.
//
// A preapproval is "authorized" while the subscription is live; "paused" or
// "cancelled" once it stops. We key the user off external_reference (the user
// id we set at creation) and persist the preapproval id for later lookups.
export async function POST(req: Request) {
  // The id can arrive in the JSON body (`data.id`) or as query params.
  const url = new URL(req.url);
  const body = await req.json().catch(() => ({} as Record<string, unknown>));

  const type =
    (body as { type?: string; topic?: string }).type ??
    (body as { topic?: string }).topic ??
    url.searchParams.get("type") ??
    url.searchParams.get("topic");

  const preapprovalId =
    (body as { data?: { id?: string } }).data?.id ??
    url.searchParams.get("data.id") ??
    url.searchParams.get("id");

  // We only act on subscription (preapproval) notifications.
  if (type !== "subscription_preapproval" || !preapprovalId) {
    return NextResponse.json({ received: true });
  }

  try {
    const pre = await preApproval().get({ id: preapprovalId });
    const userId = pre.external_reference;
    if (!userId) {
      return NextResponse.json({ received: true });
    }

    const active = pre.status === "authorized";
    await db
      .update(users)
      .set({ isSubscribed: active, mpPreapprovalId: preapprovalId })
      .where(eq(users.id, userId));
  } catch (err) {
    console.error("webhook handler error:", err);
    // Return 500 so MercadoPago retries transient failures.
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

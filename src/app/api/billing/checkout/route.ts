import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { requireUser, unauthorized, UnauthorizedError } from "@/lib/auth";

export const runtime = "nodejs";

// Creates a Stripe Checkout Session for the subscription and returns its URL.
export async function POST() {
  try {
    const user = await requireUser();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
      customer_email: user.email,
      // The webhook uses this to flip the right user's subscription flag.
      client_reference_id: user.id,
      success_url: `${baseUrl}/course?subscribed=1`,
      cancel_url: `${baseUrl}/subscribe?canceled=1`,
    });

    if (!session.url) {
      return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
    }
    return NextResponse.json({ url: session.url });
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorized();
    console.error("checkout error:", err);
    return NextResponse.json({ error: "Failed to start checkout" }, { status: 500 });
  }
}

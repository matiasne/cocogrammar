import { NextResponse } from "next/server";
import { preApproval } from "@/lib/mercadopago";
import { requireUser, unauthorized, UnauthorizedError } from "@/lib/auth";

export const runtime = "nodejs";

// Monthly price for Cocoa Unlimited (USD).
const MONTHLY_AMOUNT = Number(process.env.MP_MONTHLY_AMOUNT ?? "5");

// Creates a MercadoPago preapproval (recurring subscription) and returns its
// hosted checkout URL (`init_point`).
export async function POST() {
  try {
    const user = await requireUser();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

    const result = await preApproval().create({
      body: {
        reason: "Cocoa Unlimited",
        // The webhook maps events back to this user by looking up the
        // preapproval id (stored on success) — we also stash the user id in
        // external_reference for the initial redirect confirmation.
        external_reference: user.id,
        payer_email: user.email,
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: MONTHLY_AMOUNT,
          currency_id: "USD",
        },
        back_url: `${baseUrl}/course?subscribed=1`,
        status: "pending",
      },
    });

    const url = result.init_point;
    if (!url) {
      return NextResponse.json({ error: "Failed to create checkout" }, { status: 500 });
    }
    return NextResponse.json({ url });
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorized();
    console.error("checkout error:", err);
    return NextResponse.json({ error: "Failed to start checkout" }, { status: 500 });
  }
}

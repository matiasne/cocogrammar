import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { preApproval } from "@/lib/mercadopago";
import { usdToArs } from "@/lib/fx";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser, unauthorized, UnauthorizedError } from "@/lib/auth";

export const runtime = "nodejs";

// Cocoa Unlimited is priced in USD, but an Argentina (MLA) MercadoPago account
// can only settle in ARS (USD is rejected as an invalid field). So we convert the
// USD price to ARS at the live rate and charge that. The charge currency stays
// ARS; the USD figure is the source-of-truth price shown to the user.
const MONTHLY_USD = Number(process.env.MP_MONTHLY_AMOUNT_USD ?? "5");
const CURRENCY_ID = process.env.MP_CURRENCY_ID ?? "ARS";

// The embedded Card Payment Brick tokenizes the card client-side and posts the
// resulting card token here. We create an *authorized* preapproval from it so the
// subscription starts immediately and auto-renews — no redirect to MP's site.
const BodySchema = z.object({
  cardTokenId: z.string().min(1),
  // The email the Brick collected for the payer (may differ from the login email).
  payerEmail: z.string().email().optional(),
});

// Optional public https return URL. With an inline card token MercadoPago does
// NOT require back_url, so we only include it when a valid public URL exists.
function publicBackUrl(): string | undefined {
  const explicit = process.env.MP_BACK_URL?.replace(/\/$/, "");
  const base = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "");
  for (const candidate of [explicit, base]) {
    if (!candidate) continue;
    try {
      const u = new URL(`${candidate}/course?subscribed=1`);
      const isLocal =
        u.hostname === "localhost" ||
        u.hostname === "127.0.0.1" ||
        u.hostname.endsWith(".local");
      if (u.protocol === "https:" && !isLocal) return u.toString();
    } catch {
      // try the next candidate
    }
  }
  return undefined;
}

export async function POST(req: Request) {
  let input: z.infer<typeof BodySchema>;
  try {
    input = BodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const user = await requireUser();
    const backUrl = publicBackUrl();

    // Convert the USD price to ARS at the live rate (the amount actually charged).
    const { ars } = await usdToArs(MONTHLY_USD);

    const result = await preApproval().create({
      body: {
        reason: "Cocoa Unlimited",
        external_reference: user.id,
        payer_email: input.payerEmail ?? user.email,
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: ars,
          currency_id: CURRENCY_ID,
        },
        // Inline card token → start the subscription right away (auto-renews).
        card_token_id: input.cardTokenId,
        status: "authorized",
        ...(backUrl ? { back_url: backUrl } : {}),
      },
    });

    // Persist the preapproval id and flip the flag optimistically; the webhook
    // remains the source of truth for later renewals/cancellations.
    const authorized = result.status === "authorized";
    await db
      .update(users)
      .set({ isSubscribed: authorized, mpPreapprovalId: result.id ?? null })
      .where(eq(users.id, user.id));

    return NextResponse.json({ status: result.status, subscribed: authorized });
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorized();
    // Surface MercadoPago's own message (e.g. amount below minimum, declined
    // card) so the user sees something actionable rather than a generic failure.
    const mpMessage =
      err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : null;
    console.error("checkout error:", err);
    return NextResponse.json(
      { error: mpMessage ?? "Failed to start subscription" },
      { status: 500 },
    );
  }
}

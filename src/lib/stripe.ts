import Stripe from "stripe";

// Lazily construct the server-side Stripe client so a missing key doesn't throw
// at module load (e.g. during `next build` page-data collection). Uses the
// account's default API version.
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    _stripe = new Stripe(key);
  }
  return _stripe;
}

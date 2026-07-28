import { MercadoPagoConfig, PreApproval, Payment } from "mercadopago";

// Lazily construct the MercadoPago client so a missing token doesn't throw at
// module load (e.g. during `next build` page-data collection).
let _config: MercadoPagoConfig | null = null;

function config(): MercadoPagoConfig {
  if (!_config) {
    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) throw new Error("MP_ACCESS_TOKEN is not set");
    _config = new MercadoPagoConfig({ accessToken });
  }
  return _config;
}

// Recurring subscriptions (preapproval). Cocoa Unlimited is a monthly plan.
export function preApproval(): PreApproval {
  return new PreApproval(config());
}

// Payment lookups (used when a webhook references an authorized payment).
export function payment(): Payment {
  return new Payment(config());
}

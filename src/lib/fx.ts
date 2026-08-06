// Live USD→ARS exchange rate for pricing. MercadoPago on an Argentina (MLA)
// account can only settle in ARS, so we price in USD and convert at charge time.
//
// The rate is fetched from free, keyless FX sources with a fallback chain, and
// cached in memory so we don't hit the network on every request.

// Static last-resort rate, used only if every source fails. Roughly the official
// USD→ARS rate; update occasionally. Overridable via MP_USD_ARS_FALLBACK.
const STATIC_FALLBACK = Number(process.env.MP_USD_ARS_FALLBACK ?? "1450");

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

type Cached = { rate: number; fetchedAtMs: number };
let cache: Cached | null = null;

async function fetchFromErApi(): Promise<number | null> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      // Revalidate hourly at the fetch layer too.
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result?: string; rates?: { ARS?: number } };
    const ars = data.result === "success" ? data.rates?.ARS : undefined;
    return typeof ars === "number" && ars > 0 ? ars : null;
  } catch {
    return null;
  }
}

async function fetchFromCurrencyApi(): Promise<number | null> {
  try {
    const res = await fetch(
      "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json",
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { usd?: { ars?: number } };
    const ars = data.usd?.ars;
    return typeof ars === "number" && ars > 0 ? ars : null;
  } catch {
    return null;
  }
}

/**
 * Current USD→ARS rate. Cached in memory for an hour; falls back across two live
 * sources and finally a static rate so pricing never breaks.
 */
export async function getUsdArsRate(nowMs = Date.now()): Promise<number> {
  if (cache && nowMs - cache.fetchedAtMs < CACHE_TTL_MS) {
    return cache.rate;
  }

  const rate = (await fetchFromErApi()) ?? (await fetchFromCurrencyApi());
  if (rate) {
    cache = { rate, fetchedAtMs: nowMs };
    return rate;
  }

  // Every source failed — reuse a stale cached value if we have one, else static.
  return cache?.rate ?? STATIC_FALLBACK;
}

/** Convert a USD amount to ARS at the current rate, rounded to a whole peso. */
export async function usdToArs(usd: number): Promise<{ ars: number; rate: number }> {
  const rate = await getUsdArsRate();
  return { ars: Math.round(usd * rate), rate };
}

"use client";

import { useState } from "react";

// POSTs to the checkout route and redirects to MercadoPago's hosted checkout.
export function SubscribeButton({ className = "" }: { className?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? "Checkout failed");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        onClick={go}
        disabled={busy}
        className={
          className ||
          "rounded-3xl bg-lime px-8 py-3 text-[15px] font-normal text-ink hover:bg-lime-bright disabled:cursor-not-allowed disabled:opacity-40"
        }
      >
        {busy ? "Redirecting…" : "Subscribe"}
      </button>
      {error && <p className="mt-3 text-sm font-light text-red-300">{error}</p>}
    </div>
  );
}

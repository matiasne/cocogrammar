"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// MercadoPago's SDK is loaded from their CDN and attaches a global constructor.
declare global {
  interface Window {
    MercadoPago?: new (
      publicKey: string,
      opts?: { locale?: string },
    ) => {
      bricks: () => {
        create: (
          brick: "cardPayment",
          containerId: string,
          settings: unknown,
        ) => Promise<{ unmount: () => void }>;
      };
    };
  }
}

const SDK_SRC = "https://sdk.mercadopago.com/js/v2";
const CONTAINER_ID = "cocoa-card-brick";

// Loads the MP SDK once and resolves when window.MercadoPago is available.
function loadSdk(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.MercadoPago) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SDK_SRC}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("SDK failed to load")));
      return;
    }
    const s = document.createElement("script");
    s.src = SDK_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("SDK failed to load"));
    document.body.appendChild(s);
  });
}

// Embedded Card Payment Brick → tokenizes the card client-side, posts the token
// to /api/billing/checkout which creates the authorized (recurring) preapproval.
export function MercadoPagoBrick({ amount }: { amount: number }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "processing" | "done">(
    "loading",
  );
  // Guards against React strict-mode double-mounting the Brick.
  const mountedRef = useRef(false);

  useEffect(() => {
    const publicKey = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY;
    if (!publicKey) {
      setError("Payments aren't configured (missing NEXT_PUBLIC_MP_PUBLIC_KEY).");
      return;
    }
    if (mountedRef.current) return;
    mountedRef.current = true;

    let controller: { unmount: () => void } | null = null;

    (async () => {
      try {
        await loadSdk();
        const mp = new window.MercadoPago!(publicKey, { locale: "es-AR" });
        const bricks = mp.bricks();
        controller = await bricks.create("cardPayment", CONTAINER_ID, {
          initialization: { amount },
          customization: {
            visual: {
              hidePaymentButton: false,
              style: {
                // Cocoa Dark palette (mirrors tailwind.config).
                theme: "dark",
                customVariables: {
                  baseColor: "#e4f24a", // lime accent (focus, labels, links)
                  baseColorFirstVariant: "#f2ff7a", // lime-bright (hover)
                  baseColorSecondVariant: "#25110d", // cocoa-panel
                  formBackgroundColor: "#25110d", // card surface
                  inputBackgroundColor: "#180b08", // cocoa (field bg)
                  inputVerticalPadding: "12px",
                  borderRadiusMedium: "16px",
                  borderRadiusLarge: "24px",
                  formPadding: "0px",
                  textPrimaryColor: "#f5ece2", // cream
                  textSecondaryColor: "rgba(245,236,226,0.6)",
                  outlinePrimaryColor: "rgba(245,236,226,0.2)",
                  outlineSecondaryColor: "rgba(245,236,226,0.12)",
                  buttonTextColor: "#1c0d0a", // ink (dark text on lime button)
                  fontSizeExtraSmall: "12px",
                },
              },
            },
            paymentMethods: { types: { excluded: ["debit_card"] } },
          },
          callbacks: {
            onReady: () => setStatus("ready"),
            onError: (brickError: { message?: string }) =>
              setError(brickError?.message ?? "Something went wrong with the card form"),
            // Brick tokenized the card; formData.token is the card token id.
            onSubmit: async (data: { formData?: { token?: string; payer?: { email?: string } } }) => {
              const token = data.formData?.token;
              if (!token) {
                setError("Could not read the card token — try again.");
                return;
              }
              setStatus("processing");
              setError(null);
              try {
                const res = await fetch("/api/billing/checkout", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    cardTokenId: token,
                    payerEmail: data.formData?.payer?.email,
                  }),
                });
                const body = await res.json();
                if (!res.ok || !body.subscribed) {
                  throw new Error(body.error ?? "Subscription could not be activated");
                }
                setStatus("done");
                router.push("/course?subscribed=1");
                router.refresh();
              } catch (e) {
                setStatus("ready");
                setError(e instanceof Error ? e.message : "Something went wrong");
              }
            },
          },
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load the payment form");
      }
    })();

    return () => {
      controller?.unmount();
    };
  }, [amount, router]);

  return (
    <div className="text-left">
      {status === "loading" && !error && (
        <p className="text-center font-mono text-[11px] uppercase tracking-[0.14em] text-cream/45">
          Loading secure card form…
        </p>
      )}

      {/* MercadoPago mounts its iframe-backed card fields here. */}
      <div id={CONTAINER_ID} />

      {status === "processing" && (
        <p className="mt-4 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-lime">
          Activating your subscription…
        </p>
      )}

      {status === "done" && (
        <p className="mt-4 text-center font-script text-2xl text-lime">welcome to unlimited</p>
      )}

      {error && (
        <p className="mt-4 text-center text-sm font-light text-red-300">{error}</p>
      )}
    </div>
  );
}

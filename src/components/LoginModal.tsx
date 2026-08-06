"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AuthForm } from "@/components/AuthForm";

// Centered modal with an inline login/signup form. Because it authenticates in
// place (no navigation), a guest keeps whatever they'd typed on the page.
//
// Rendered via a portal to document.body so it escapes the writer/course block
// it's declared in — nesting it there made the fixed overlay create a stray
// inner scroll. As a body-level layer it covers the viewport cleanly.
export function LoginModal({
  open,
  onClose,
  title = "log in to continue",
  message,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  message: string;
}) {
  // Portals need the DOM, so only render after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Close on Escape + lock page scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="overlay-fade fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-cocoa/80 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="reveal my-8 w-full max-w-sm rounded-2xl border border-lime/25 bg-cocoa-panel p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <p className="font-script text-3xl text-lime">{title}</p>
          <p className="mt-3 font-reading text-base font-normal leading-relaxed text-cream/85">
            {message}
          </p>
        </div>

        <div className="mt-6">
          <AuthForm mode="login" embedded onSuccess={onClose} />
        </div>

        <button
          onClick={onClose}
          className="mt-5 block w-full text-center font-mono text-[10px] uppercase tracking-[0.14em] text-cream/40 hover:text-cream/70"
        >
          Maybe later
        </button>
      </div>
    </div>,
    document.body,
  );
}

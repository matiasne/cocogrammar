"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Centered yes/no confirmation modal, styled to match LoginModal. Rendered via a
// portal to document.body so the fixed overlay escapes whatever block declares it
// and covers the viewport cleanly. Replaces native window.confirm() so the
// confirmation matches the rest of the UI.
export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  busy = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  // When true, the confirm button shows a working state and is disabled.
  busy?: boolean;
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

        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={onConfirm}
            disabled={busy}
            className="w-full rounded-3xl bg-lime px-6 py-2.5 text-sm font-normal text-ink hover:bg-lime-bright disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Working…" : confirmLabel}
          </button>
          <button
            onClick={onClose}
            disabled={busy}
            className="w-full text-center font-mono text-[10px] uppercase tracking-[0.14em] text-cream/40 hover:text-cream/70 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

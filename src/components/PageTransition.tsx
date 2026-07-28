"use client";

import { usePathname } from "next/navigation";

// Replays the `page-enter` CSS animation on every route change. Keying the
// wrapper on the pathname forces React to remount it, which restarts the
// animation — so navigating between Write, Course and Log fades/slides the
// new page in. Respects prefers-reduced-motion via the CSS.
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-enter">
      {children}
    </div>
  );
}

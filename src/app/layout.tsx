import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getUserOrNull } from "@/lib/auth";
import { NavAuth } from "@/components/NavAuth";
import { WelcomeModal } from "@/components/WelcomeModal";
import { PageTransition } from "@/components/PageTransition";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "CocoGrammar — learn sweetly",
  description: "Every slip you make becomes a lesson. Grammar coaching from your own writing.",
};

const navLinks = [
  { href: "/", label: "Write" },
  { href: "/course", label: "Course" },
  { href: "/history", label: "Log" },
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getUserOrNull();
  return (
    <html lang="en">
      <body>
        <WelcomeModal />
        <header>
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 md:px-14">
            <Link href="/" className="text-2xl font-light tracking-wide text-cream hover:text-cream">
              CocoGrammar
            </Link>
            <div className="hidden gap-11 text-[15px] font-light text-cream/70 md:flex">
              {navLinks.map((l) => (
                <Link key={l.href} href={l.href} className="text-cream/70 hover:text-cream">
                  {l.label}
                </Link>
              ))}
            </div>
            <NavAuth
              email={user?.email ?? null}
              isSubscribed={user?.isSubscribed ?? false}
              sentencesUsed={user?.sentencesUsed ?? 0}
              coursesUsed={user?.coursesUsed ?? 0}
            />
          </nav>
          {/* Mobile nav */}
          <div className="flex gap-6 px-6 pb-4 text-sm font-light text-cream/70 md:hidden">
            {navLinks.map((l) => (
              <Link key={l.href} href={l.href} className="text-cream/70 hover:text-cream">
                {l.label}
              </Link>
            ))}
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8 md:px-14">
          <PageTransition>{children}</PageTransition>
        </main>
      </body>
    </html>
  );
}

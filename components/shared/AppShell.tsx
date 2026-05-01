"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useSession, signOut } from "next-auth/react";
import { Logo } from "./Logo";

const NAV = [
  { href: "/dashboard", label: "Dashboard", numeral: "I" },
  { href: "/entry/new", label: "Today's page", numeral: "II" },
  { href: "/history", label: "History", numeral: "III" },
  { href: "/digest/weekly", label: "Digests", numeral: "IV" },
  { href: "/templates", label: "Gallery", numeral: "V" },
  { href: "/settings", label: "Settings", numeral: "VI" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isDigests = pathname.startsWith("/digest");

  return (
    <div className="flex min-h-screen w-full">
      <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-border bg-bg-base sticky top-0 h-screen">
        <div className="px-6 py-6">
          <Link href="/dashboard">
            <Logo />
          </Link>
          <p className="mt-2 text-[10.5px] uppercase tracking-[0.22em] text-text-muted font-mono">
            volume one
          </p>
        </div>
        <div className="rule-fine mx-6" />
        <nav className="flex-1 px-3 py-5 flex flex-col gap-px">
          {NAV.map((item) => {
            const active =
              pathname === item.href ||
              (item.href === "/digest/weekly" && isDigests) ||
              (item.href !== "/dashboard" &&
                item.href !== "/digest/weekly" &&
                pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group relative flex items-baseline gap-4 px-4 py-3 text-[15px] transition-colors ${
                  active
                    ? "text-accent"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="activeMark"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 bg-accent"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="numeral text-base text-text-muted w-5 not-italic">
                  {item.numeral}.
                </span>
                <span className={active ? "font-serif italic text-lg" : ""}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
        <div className="rule-fine mx-6" />
        <div className="px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="grid place-items-center w-9 h-9 border border-border-strong text-text-secondary text-[13px] font-mono">
              {session?.user?.name?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate font-serif italic text-base">
                {session?.user?.name ?? "Guest"}
              </div>
              <div className="text-[11px] text-text-muted truncate font-mono uppercase tracking-[0.18em]">
                {session?.user?.email ?? "Sign in"}
              </div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-text-muted hover:text-accent transition-colors text-base"
              aria-label="Sign out"
              title="Sign out"
            >
              ↗
            </button>
          </div>
        </div>
      </aside>

      {/* mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 border-b border-border bg-bg-base/80 backdrop-blur-md">
        <div className="flex items-center justify-between px-5 py-3">
          <Link href="/dashboard">
            <Logo />
          </Link>
          <Link
            href="/entry/new"
            className="text-sm text-accent hover:text-accent-hover font-serif italic text-lg"
          >
            Today →
          </Link>
        </div>
      </div>

      <main className="flex-1 min-w-0 md:pt-0 pt-14">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}

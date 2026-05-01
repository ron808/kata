"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";

const NAV = [
  { href: "/dashboard", label: "Dashboard", numeral: "I" },
  { href: "/entry/new", label: "Today's page", numeral: "II" },
  { href: "/history", label: "History", numeral: "III" },
  { href: "/digest/weekly", label: "Digests", numeral: "IV" },
  { href: "/templates", label: "Gallery", numeral: "V" },
  { href: "/settings", label: "Settings", numeral: "VI" },
];

function isActive(pathname: string, href: string) {
  const isDigests = pathname.startsWith("/digest");
  if (pathname === href) return true;
  if (href === "/digest/weekly" && isDigests) return true;
  if (
    href !== "/dashboard" &&
    href !== "/digest/weekly" &&
    pathname.startsWith(href)
  )
    return true;
  return false;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);

  // close mobile drawer on route change (React 19: sync via comparison-in-render)
  if (pathname !== lastPath) {
    setLastPath(pathname);
    if (drawerOpen) setDrawerOpen(false);
  }

  // lock body scroll while drawer is open
  useEffect(() => {
    if (!drawerOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [drawerOpen]);

  // ESC closes the drawer
  useEffect(() => {
    if (!drawerOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setDrawerOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  const userInitial = session?.user?.name?.[0]?.toUpperCase() ?? "?";
  const userName = session?.user?.name ?? "Guest";
  const userEmail = session?.user?.email ?? "Sign in";

  return (
    <div className="flex min-h-screen w-full">
      {/* Skip to content (keyboard users) */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-3 focus:py-2 focus:bg-bg-elevated focus:text-text-primary focus:border focus:border-accent focus:rounded"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-border bg-bg-base sticky top-0 h-screen">
        <div className="px-6 py-6">
          <Link href="/dashboard" className="inline-flex">
            <Logo />
          </Link>
          <p className="mt-2 text-[10.5px] uppercase tracking-[0.22em] text-text-muted font-mono">
            volume one
          </p>
        </div>
        <div className="rule-fine mx-6" />
        <nav
          aria-label="Primary"
          className="flex-1 px-3 py-5 flex flex-col gap-px overflow-y-auto"
        >
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
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
        <div className="px-5 py-5 space-y-3">
          <div className="flex items-center gap-3">
            <div
              aria-hidden
              className="grid place-items-center w-9 h-9 border border-border-strong text-text-secondary text-[13px] font-mono shrink-0"
            >
              {userInitial}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate font-serif italic text-base">
                {userName}
              </div>
              <div className="text-[11px] text-text-muted truncate font-mono uppercase tracking-[0.18em]">
                {userEmail}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-border hover:border-accent hover:text-accent text-text-secondary text-[12px] uppercase tracking-[0.18em] font-mono transition-colors"
          >
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4"
            >
              <path d="M15 17l5-5-5-5" />
              <path d="M20 12H9" />
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-30 h-14 border-b border-border bg-bg-base/85 backdrop-blur-md">
        <div className="h-full flex items-center justify-between px-4">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            aria-expanded={drawerOpen}
            aria-controls="mobile-drawer"
            className="grid place-items-center w-10 h-10 -ml-2 text-text-secondary hover:text-accent transition-colors"
          >
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              className="w-5 h-5"
            >
              <path d="M4 7h16" />
              <path d="M4 12h16" />
              <path d="M4 17h16" />
            </svg>
          </button>
          <Link href="/dashboard" className="inline-flex">
            <Logo />
          </Link>
          <Link
            href="/entry/new"
            className="text-accent hover:text-accent-hover font-serif italic text-base"
          >
            Today →
          </Link>
        </div>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="md:hidden fixed inset-0 z-40 bg-black/55"
              onClick={() => setDrawerOpen(false)}
              aria-hidden
            />
            <motion.aside
              id="mobile-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 360, damping: 36 }}
              className="md:hidden fixed top-0 left-0 bottom-0 z-50 w-[82%] max-w-[320px] bg-bg-base border-r border-border flex flex-col"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <Logo />
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close menu"
                  className="grid place-items-center w-10 h-10 -mr-2 text-text-secondary hover:text-accent transition-colors"
                >
                  <svg
                    aria-hidden
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    className="w-5 h-5"
                  >
                    <path d="M6 6l12 12" />
                    <path d="M18 6L6 18" />
                  </svg>
                </button>
              </div>
              <nav
                aria-label="Primary"
                className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-px"
              >
                {NAV.map((item) => {
                  const active = isActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-baseline gap-4 px-4 py-3 text-[15px] transition-colors ${
                        active
                          ? "text-accent"
                          : "text-text-secondary hover:text-text-primary"
                      }`}
                    >
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
              <div className="border-t border-border px-5 py-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div
                    aria-hidden
                    className="grid place-items-center w-9 h-9 border border-border-strong text-text-secondary text-[13px] font-mono shrink-0"
                  >
                    {userInitial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate font-serif italic text-base">
                      {userName}
                    </div>
                    <div className="text-[11px] text-text-muted truncate font-mono uppercase tracking-[0.18em]">
                      {userEmail}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-border hover:border-accent hover:text-accent text-text-secondary text-[12px] uppercase tracking-[0.18em] font-mono transition-colors"
                >
                  <svg
                    aria-hidden
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-4 h-4"
                  >
                    <path d="M15 17l5-5-5-5" />
                    <path d="M20 12H9" />
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  </svg>
                  Sign out
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main id="main" className="flex-1 min-w-0 pt-14 md:pt-0">
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

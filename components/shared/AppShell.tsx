"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import type { Names } from "@/lib/companion/naming";
import { AskMaru } from "./AskMaru";
import { Avatar } from "./Avatar";
import { CompanionProvider } from "./Companion";
import { Icon, type IconName } from "./Icon";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

export interface ShellUser {
  name: string;
  email: string;
  handle: string | null;
  hue: number;
  /** Where Kata thinks they are, which decides what today is. */
  timezone: string | null;
  /** What they call their companion, and what it calls them. */
  names: Names;
}

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/dashboard", label: "Home", icon: "home" },
  { href: "/people", label: "People", icon: "people" },
  { href: "/messages", label: "Messages", icon: "chat" },
  { href: "/threads", label: "Threads", icon: "threads" },
  { href: "/history", label: "Pages", icon: "history" },
  { href: "/breakdowns", label: "Breakdowns", icon: "chart" },
  { href: "/digest/weekly", label: "Letters", icon: "letter" },
  { href: "/templates", label: "Gallery", icon: "gallery" },
];

function isActive(pathname: string, href: string) {
  if (href === "/digest/weekly") return pathname.startsWith("/digest");
  if (href === "/dashboard") return pathname === href;
  if (href === "/people") return pathname === href || pathname.startsWith("/people/") || pathname.startsWith("/u/");
  if (href === "/history") return pathname === href || (pathname.startsWith("/entry/") && pathname !== "/entry/new");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({
  user,
  unread,
  messages: messagesAtLoad,
  children,
}: {
  user: ShellUser;
  unread: number;
  /** Messages waiting, when the page loaded. */
  messages: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const messages = useUnreadMessages(messagesAtLoad, pathname);
  // Focus modes bring their own bottom bar, so the tab bar steps aside.
  const writing = pathname.startsWith("/entry/new");
  const focused = writing || pathname === "/settings/template";
  // The companion's colour: on the shell for the first paint, on <html> for dialogs and toasts outside it.
  const maru = user.names.hue ?? undefined;
  // Today follows the writer: someone who travels shouldn't stay on the day they left behind.
  useEffect(() => {
    const here = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!here || !user.timezone || here === user.timezone) return;
    void fetch("/api/settings/kata", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timezone: here }),
    }).then((res) => {
      if (res.ok) router.refresh();
    });
  }, [user.timezone, router]);
  useEffect(() => {
    const html = document.documentElement;
    if (maru) html.dataset.maru = String(maru);
    else delete html.dataset.maru;
    return () => {
      delete html.dataset.maru;
    };
  }, [maru]);

  return (
    <CompanionProvider names={user.names}>
      <div data-maru={maru} className="lg:grid lg:min-h-svh lg:grid-cols-[16.5rem_minmax(0,1fr)]">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2.5 focus:text-ground"
        >
          Skip to content
        </a>

        {/* Desktop rail */}
        <aside className="rule sticky top-0 hidden h-svh flex-col border-r-2 px-4 pb-4 lg:flex">
          <div className="flex h-[var(--header-h)] items-center justify-between px-1">
            <Link href="/dashboard" aria-label="Kata, home" className="flex min-h-11 items-center">
              <Logo cut="ground" />
            </Link>
            <Bell unread={unread} active={pathname === "/notifications"} />
          </div>
          <nav aria-label="Primary" className="mt-4">
            <ul className="space-y-1">
              {NAV.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`flex h-11 items-center gap-3 rounded-full px-3.5 text-[0.9375rem] font-medium transition-colors duration-300 ${
                        active
                          ? "bg-sun text-on-sun shadow-[inset_0_0_0_2px_var(--edge)]"
                          : "text-ink/70 hover:bg-ink/[0.06] hover:text-ink"
                      }`}
                    >
                      <Icon name={item.icon} className="h-5 w-5" />
                      {item.label}
                      {item.href === "/messages" && messages ? (
                        <span
                          aria-label={`${messages} new`}
                          className="ml-auto grid h-6 min-w-6 place-items-center rounded-full border-2 border-edge bg-accent px-1.5 text-[0.75rem] font-bold leading-none text-on-accent tabular-nums"
                        >
                          {messages > 9 ? "9+" : messages}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <Link
            href="/entry/new"
            aria-current={writing ? "page" : undefined}
            className="press mt-6 flex h-12 items-center justify-center gap-2.5 rounded-full border-2 border-edge bg-accent px-4 font-semibold text-on-accent transition-[transform,box-shadow] duration-300"
          >
            <Icon name="pen" className="h-[1.1rem] w-[1.1rem]" />
            Write your page
          </Link>
          <div className="mt-auto">
            <AccountMenu user={user} pathname={pathname} placement="up" />
          </div>
        </aside>

        {/* Compact top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 bg-ground/92 px-margin backdrop-blur-md lg:hidden">
          <Link href="/dashboard" aria-label="Kata, home" className="-mx-1 flex min-h-11 items-center px-1">
            <Logo cut="ground" />
          </Link>
          <div className="flex items-center gap-1.5">
            <Inbox unread={messages} active={pathname.startsWith("/messages")} />
            <Bell unread={unread} active={pathname === "/notifications"} />
            <AccountMenu user={user} pathname={pathname} placement="down" compact />
          </div>
        </header>

        <main id="main" className={`min-w-0 ${focused ? "" : "max-lg:pb-[calc(5rem+env(safe-area-inset-bottom))]"}`}>
          {/* Opacity only: a transform here would trap the fixed save bar on today's page. */}
          <motion.div
            key={pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {children}
          </motion.div>
        </main>

        <AskMaru pathname={pathname} />

        {/* Compact tab bar; hidden in focus modes, which have their own save bar. */}
        {!focused ? (
          <nav
            aria-label="Primary"
            className="rule fixed inset-x-0 bottom-0 z-30 border-t-2 bg-ground/94 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
          >
            <ul className="mx-auto grid h-[4.25rem] max-w-lg grid-cols-5 items-center px-2">
              {["/dashboard", "/people", null, "/threads", "/history"].map((href) => (href ? NAV.find((n) => n.href === href)! : null)).map((item) =>
                item ? (
                  <li key={item.href} className="flex justify-center">
                    <Link
                      href={item.href}
                      aria-current={isActive(pathname, item.href) ? "page" : undefined}
                      className={`flex h-14 min-w-14 flex-col items-center justify-center gap-1 rounded-md text-[0.75rem] font-semibold transition-colors ${
                        isActive(pathname, item.href) ? "text-ink" : "text-ink/60"
                      }`}
                    >
                      <span
                        className={`grid h-8 w-12 place-items-center rounded-full transition-colors ${
                          isActive(pathname, item.href) ? "bg-sun text-on-sun shadow-[inset_0_0_0_2px_var(--edge)]" : ""
                        }`}
                      >
                        <Icon name={item.icon} className="h-[1.3rem] w-[1.3rem]" />
                      </span>
                      {item.label}
                    </Link>
                  </li>
                ) : (
                  <li key="today" className="flex justify-center">
                    <Link
                      href="/entry/new"
                      aria-label="Write your page"
                      className="press grid h-13 w-13 place-items-center rounded-full border-2 border-edge bg-accent text-on-accent transition-[transform,box-shadow] duration-300"
                    >
                      <Icon name="plus" className="h-6 w-6" strokeWidth={2.2} />
                    </Link>
                  </li>
                )
              )}
            </ul>
          </nav>
        ) : null}
      </div>
    </CompanionProvider>
  );
}

/** Messages waiting: from the page load, then checked every so often and on every page change. */
function useUnreadMessages(atLoad: number, pathname: string): number {
  const [count, setCount] = useState(atLoad);
  const [seen, setSeen] = useState(atLoad);
  if (atLoad !== seen) {
    setSeen(atLoad);
    setCount(atLoad);
  }
  useEffect(() => {
    let live = true;
    const check = async () => {
      if (document.visibilityState !== "visible") return;
      const res = await fetch("/api/messages/unread", { cache: "no-store" }).catch(() => null);
      if (!res?.ok || !live) return;
      const data = (await res.json()) as { unread: number };
      if (live) setCount(data.unread);
    };
    void check();
    const id = window.setInterval(check, 30_000);
    return () => {
      live = false;
      window.clearInterval(id);
    };
  }, [pathname]);
  return count;
}

/** Messages, beside the bell on a phone (the tab bar has no room). */
function Inbox({ unread, active }: { unread: number; active: boolean }) {
  return (
    <Link
      href="/messages"
      aria-current={active ? "page" : undefined}
      aria-label={unread ? `Messages, ${unread} new` : "Messages"}
      className="chip relative !h-11 !w-11 !min-h-0 !px-0"
    >
      <Icon name="chat" className="h-5 w-5" />
      {unread ? (
        <span className="absolute -right-1.5 -top-1.5 grid h-[1.375rem] min-w-[1.375rem] place-items-center rounded-full border-2 border-edge bg-accent px-1 text-[0.75rem] font-bold leading-none text-on-accent tabular-nums">
          {unread > 9 ? "9+" : unread}
        </span>
      ) : null}
    </Link>
  );
}

function Bell({ unread, active }: { unread: number; active: boolean }) {
  return (
    <Link
      href="/notifications"
      aria-current={active ? "page" : undefined}
      aria-label={unread ? `Notifications, ${unread} new` : "Notifications"}
      className="chip relative !h-11 !w-11 !min-h-0 !px-0"
    >
      <Icon name="bell" className="h-5 w-5" />
      {unread ? (
        <span className="absolute -right-1.5 -top-1.5 grid h-[1.375rem] min-w-[1.375rem] place-items-center rounded-full border-2 border-edge bg-accent px-1 text-[0.75rem] font-bold leading-none text-on-accent tabular-nums">
          {unread > 9 ? "9+" : unread}
        </span>
      ) : null}
    </Link>
  );
}

function AccountMenu({
  user,
  pathname,
  placement,
  compact = false,
}: {
  user: ShellUser;
  pathname: string;
  placement: "up" | "down";
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  const root = useRef<HTMLDivElement | null>(null);
  const menuId = compact ? "account-menu-compact" : "account-menu";

  // Close on navigation (React 19: sync via comparison-in-render).
  if (pathname !== lastPath) {
    setLastPath(pathname);
    if (open) setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  const profileHref = user.handle ? `/u/${user.handle}` : "/settings#profile";
  const items: { href: string; label: string; icon: IconName }[] = [
    { href: profileHref, label: "Your profile", icon: "user" },
    ...(compact
      ? ([
          { href: "/breakdowns", label: "Breakdowns", icon: "chart" },
          { href: "/digest/weekly", label: "Letters", icon: "letter" },
          { href: "/templates", label: "Gallery", icon: "gallery" },
        ] as const)
      : []),
    { href: "/settings", label: "Settings", icon: "settings" },
  ];

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label="Account"
        className={
          compact
            ? "grid h-11 w-11 place-items-center rounded-full"
            : "flex w-full items-center gap-3 rounded-full p-1.5 pr-3 text-left transition-colors hover:bg-ink/[0.06]"
        }
      >
        <Avatar name={user.name} hue={user.hue} size={compact ? 38 : 40} />
        {compact ? null : (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[0.9375rem] font-semibold">{user.name}</span>
            <span className="block truncate text-sm text-ink/65">{user.handle ? `@${user.handle}` : "Choose a handle"}</span>
          </span>
        )}
        {compact ? null : <Icon name="arrow-down" className={`h-4 w-4 text-ink/60 transition-transform ${open ? "" : "rotate-180"}`} />}
      </button>
      {open ? (
        <div
          id={menuId}
          className={`card absolute z-40 w-[min(18rem,calc(100vw-2rem))] p-2 ${
            placement === "up" ? "bottom-[calc(100%+0.75rem)] left-0" : "right-0 top-[calc(100%+0.75rem)]"
          }`}
        >
          <div className="px-3 py-2.5">
            <p className="truncate font-semibold">{user.name}</p>
            <p className="truncate text-sm text-ink/65">{user.email}</p>
          </div>
          <div className="rule my-1 border-t-2" />
          {items.map((item) => (
            <Link key={item.href} href={item.href} className="flex h-11 items-center gap-3 rounded-full px-3 font-medium hover:bg-ink/[0.06]">
              <Icon name={item.icon} className="h-5 w-5 text-ink/70" />
              {item.label}
            </Link>
          ))}
          <div className="px-1 py-2">
            <ThemeToggle className="w-full" />
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex h-11 w-full items-center gap-3 rounded-full px-3 text-left font-medium hover:bg-ink/[0.06]"
          >
            <Icon name="signout" className="h-5 w-5 text-ink/70" />
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}

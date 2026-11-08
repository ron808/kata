"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { FocusBar } from "@/components/focus/FocusBar";
import { FOCUS_EVENT, type FocusChange } from "@/components/focus/mode";
import type { Names } from "@/lib/companion/naming";
import type { FocusState, FocusTheme } from "@/lib/types";
import { AskMaru } from "./AskMaru";
import { Avatar } from "./Avatar";
import { CompanionProvider } from "./Companion";
import { Icon, type IconName } from "./Icon";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { useToast } from "./Toast";

export interface ShellUser {
  name: string;
  email: string;
  handle: string | null;
  hue: number;
  /** Where Kata thinks they are, which decides what today is. */
  timezone: string | null;
  /** What they call their companion, and what it calls them. */
  names: Names;
  /** The mission they're focused on, if any. */
  focus: FocusState | null;
  focusTheme: FocusTheme;
}

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/dashboard", label: "Home", icon: "home" },
  { href: "/people", label: "People", icon: "people" },
  { href: "/messages", label: "Messages", icon: "chat" },
  { href: "/threads", label: "Threads", icon: "threads" },
  { href: "/missions", label: "Missions", icon: "target" },
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
  const { notifications: unreadNow, messages } = usePulse({ notifications: unread, messages: messagesAtLoad }, pathname);
  // Focus modes bring their own bottom bar, so the tab bar steps aside.
  const writing = pathname.startsWith("/entry/new");
  const focused = writing || pathname === "/settings/template";
  // The companion's colour: on the shell for the first paint, on <html> for dialogs and toasts outside it.
  const maru = user.names.hue ?? undefined;
  const { on: inFocus, theme } = useFocusMode(user);
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

  // Focus: the whole app goes over to one mission, in its own colours, with only the way out left.
  if (inFocus) {
    return (
      <CompanionProvider names={user.names}>
        <div data-maru={maru} data-focus={theme} className="min-h-svh bg-ground text-ink">
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2.5 focus:text-ground"
          >
            Skip to content
          </a>
          <FocusBar focus={user.focus} />
          <main id="main" className="min-w-0">
            {children}
          </main>
          <AskMaru pathname={pathname} focused />
        </div>
      </CompanionProvider>
    );
  }

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
            <Bell unread={unreadNow} active={pathname === "/notifications"} />
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
            Your page
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
            <Bell unread={unreadNow} active={pathname === "/notifications"} />
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
                      aria-label="Your page"
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

/**
 * Whether focus is on, and in which colours. The server says, and a change made here shows at once
 * rather than after the page has been fetched again. On <html> too, for what sits outside the
 * shell, and remembered for the first paint of the focus screen.
 */
function useFocusMode(user: ShellUser): { on: boolean; theme: FocusTheme } {
  const told = user.focus ? `${user.focus.missionId}:${user.focusTheme}` : `:${user.focusTheme}`;
  const [seen, setSeen] = useState(told);
  const [change, setChange] = useState<FocusChange>({});
  if (told !== seen) {
    setSeen(told);
    setChange({});
  }
  const on = change.on ?? Boolean(user.focus);
  const theme = change.theme ?? user.focusTheme;

  useEffect(() => {
    const onChange = (e: Event) => setChange((c) => ({ ...c, ...(e as CustomEvent<FocusChange>).detail }));
    window.addEventListener(FOCUS_EVENT, onChange);
    return () => window.removeEventListener(FOCUS_EVENT, onChange);
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    if (on) html.dataset.focus = theme;
    else delete html.dataset.focus;
    try {
      if (on) localStorage.setItem("kata-focus", theme);
      else localStorage.removeItem("kata-focus");
    } catch {
      // Storage blocked: the first paint just starts in the usual colours.
    }
    return () => {
      delete html.dataset.focus;
    };
  }, [on, theme]);

  return { on, theme };
}

/** Ask the shell to check for notifications and messages now, after something that changes them. */
export const PULSE_EVENT = "kata:pulse";

type Counts = { notifications: number; messages: number };
type Pulse = Counts & { newestAt: string | null; checkedAt: string; latest: { text: string } | null };

/**
 * Notifications and messages waiting, kept fresh by `/api/pulse`: every 10 seconds while they're
 * using Kata, every 30 once they've gone quiet, never in a hidden tab, and at once when they come
 * back to it or change page. A notification that arrives while Kata is open shows as a toast, and
 * the notifications page takes it in. The same check is how friends see they're here.
 */
function usePulse(atLoad: Counts, pathname: string): Counts {
  const router = useRouter();
  const { toast } = useToast();
  const [counts, setCounts] = useState(atLoad);
  const [seen, setSeen] = useState(atLoad);
  if (atLoad.notifications !== seen.notifications || atLoad.messages !== seen.messages) {
    setSeen(atLoad);
    setCounts(atLoad);
  }
  const known = useRef(atLoad);
  const page = useRef(pathname);
  // The newest notification the shell has heard about (server time), so only newer ones toast.
  const since = useRef<string | null>(null);
  const lastInput = useRef(0);
  const lastCheck = useRef(0);
  useEffect(() => {
    known.current = counts;
  }, [counts]);
  useEffect(() => {
    page.current = pathname;
  }, [pathname]);

  useEffect(() => {
    let live = true;
    let timer = 0;
    let busy = false;
    lastInput.current = Date.now();
    const tick = async () => {
      window.clearTimeout(timer);
      if (document.visibilityState !== "visible" || busy) return;
      busy = true;
      lastCheck.current = Date.now();
      const res = await fetch(`/api/pulse${since.current ? `?after=${encodeURIComponent(since.current)}` : ""}`, { cache: "no-store" }).catch(() => null);
      busy = false;
      if (!live) return;
      if (res?.ok) {
        const data = (await res.json()) as Pulse;
        if (!live) return;
        const before = known.current;
        known.current = { notifications: data.notifications, messages: data.messages };
        setCounts(known.current);
        const reading = page.current === "/notifications";
        if (data.latest && !reading) toast(data.latest.text);
        if (reading && data.notifications > before.notifications) router.refresh();
        since.current = data.newestAt ?? since.current ?? data.checkedAt;
      }
      const quiet = Date.now() - lastInput.current > 2 * 60_000;
      timer = window.setTimeout(tick, quiet ? 30_000 : 10_000);
    };
    // Coming back to the tab fires focus and visibilitychange together: one check does for both.
    const wake = () => {
      if (Date.now() - lastCheck.current > 1500) void tick();
    };
    const stir = () => {
      lastInput.current = Date.now();
    };
    const inputs = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("focus", wake);
    window.addEventListener(PULSE_EVENT, wake);
    for (const e of inputs) window.addEventListener(e, stir, { passive: true });
    void tick();
    return () => {
      live = false;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("focus", wake);
      window.removeEventListener(PULSE_EVENT, wake);
      for (const e of inputs) window.removeEventListener(e, stir);
    };
  }, [pathname, router, toast]);
  return counts;
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
          { href: "/missions", label: "Missions", icon: "target" },
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

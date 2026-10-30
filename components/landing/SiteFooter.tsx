import Link from "next/link";
import { Logo } from "@/components/shared/Logo";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { VisitReceipt } from "./VisitReceipt";

const LINKS: [string, string][] = [
  ["/#how", "How it works"],
  ["/#people", "Your people"],
  ["/#pages", "Pages people use"],
  ["/#private", "What stays private"],
];

export function SiteFooter() {
  return (
    <footer className="border-t-2 border-edge bg-raised px-margin pb-10 pt-[clamp(3.5rem,6vw,5.5rem)]">
      <div className="mx-auto grid max-w-[90rem] grid-cols-1 gap-x-10 gap-y-12 md:grid-cols-12">
        <div className="md:col-span-6 lg:col-span-4">
          <Logo cut="raised" />
          <p className="mt-5 max-w-xs text-[0.9375rem] text-ink/70">
            型, kata: a form you practise until it becomes yours. A journal that keeps
            up with you, a few lines a day.
          </p>
        </div>
        <nav aria-label="Footer" className="md:col-span-6 lg:col-span-4">
          <ul className="grid grid-cols-1 gap-x-8 xs:grid-cols-2">
            {LINKS.map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="link inline-flex min-h-11 items-center no-underline hover:underline">
                  {label}
                </Link>
              </li>
            ))}
            {/* Signed in (see StartLink), the last link opens the journal instead. */}
            <li className="[html[data-session=in]_&]:hidden">
              <Link href="/login" className="link inline-flex min-h-11 items-center no-underline hover:underline">
                Log in
              </Link>
            </li>
            <li className="hidden [html[data-session=in]_&]:block">
              <Link href="/dashboard" className="link inline-flex min-h-11 items-center no-underline hover:underline">
                Open Kata
              </Link>
            </li>
          </ul>
        </nav>
        <div className="md:col-span-12 lg:col-span-4 lg:justify-self-end">
          <p className="mb-3 text-[0.9375rem] text-ink/70">Theme</p>
          <ThemeToggle className="[&_button]:min-h-11" />
        </div>
      </div>
      <div className="rule mx-auto mt-14 flex max-w-[90rem] flex-wrap items-center justify-between gap-3 border-t-2 pt-6">
        <p className="font-display text-xl">Kata</p>
        <VisitReceipt />
      </div>
    </footer>
  );
}

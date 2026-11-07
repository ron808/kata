import type { Metadata } from "next";
import Link from "next/link";
import { KataMark } from "@/components/shared/Avatar";
import { buttonClass } from "@/components/shared/Button";
import { Logo } from "@/components/shared/Logo";
import { SignOutQuietly } from "@/components/settings/StartOver";

export const metadata: Metadata = { title: "Account deleted · Kata", robots: { index: false, follow: false } };

/** Where a deleted account lands, and where any other device still signed in to it is sent. */
export default function Bye() {
  return (
    <div className="flex min-h-svh flex-col px-margin">
      <header className="flex h-[var(--header-h)] shrink-0 items-center">
        <Link href="/" aria-label="Kata, home" className="-mx-1 flex min-h-11 items-center px-1">
          <Logo cut="ground" />
        </Link>
      </header>
      <main id="main" className="flex flex-1 items-center justify-center py-12">
        <div className="mx-auto w-full max-w-xl text-center">
          <h1 className="font-display text-display-m">
            Your account is <span className="mark">gone</span>.
          </h1>
          <div className="mx-auto mt-6 flex w-fit max-w-full items-start gap-3 text-left">
            <KataMark size={34} cut="ground" />
            <p className="bubble-kata px-4 py-2.5 text-[0.9375rem] leading-snug">
              Everything in it was deleted from Kata: your pages, your threads, your profile and your conversations.
            </p>
          </div>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link href="/" className={buttonClass({ variant: "secondary", size: "lg" })}>
              Kata’s front page
            </Link>
          </div>
        </div>
      </main>
      <SignOutQuietly />
    </div>
  );
}

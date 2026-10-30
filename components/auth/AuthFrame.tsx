import Link from "next/link";
import type { ReactNode } from "react";
import { KataMark } from "@/components/shared/Avatar";
import { buttonClass } from "@/components/shared/Button";
import { Logo } from "@/components/shared/Logo";

/**
 * Log in, sign up and the password pages: a big headline, a line from Kata, the form on a
 * taped card, and on wide screens a desk with a sticker scene beside it.
 */
export function AuthFrame({
  title,
  says,
  children,
  footer,
  aside,
  switchTo,
}: {
  title: ReactNode;
  /** What Kata says under the headline. */
  says: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  aside?: ReactNode;
  switchTo?: { href: string; label: string };
}) {
  return (
    <div className="grid min-h-svh grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="flex min-w-0 flex-col px-margin">
        <header className="flex h-[var(--header-h)] shrink-0 items-center justify-between gap-4">
          <Link href="/" aria-label="Kata, home" className="-mx-1 flex min-h-11 items-center px-1">
            <Logo cut="ground" />
          </Link>
          {switchTo ? (
            <Link href={switchTo.href} className={buttonClass({ variant: "secondary", className: "min-w-11" })}>
              {switchTo.label}
            </Link>
          ) : null}
        </header>
        <main id="main" className="flex flex-1 items-center py-[clamp(1.75rem,6svh,4.5rem)]">
          <div className="mx-auto w-full max-w-[27rem]">
            <h1 className="font-display text-display-m max-sm:text-[2.75rem]">{title}</h1>
            <div className="mt-5 flex items-start gap-3">
              <KataMark size={34} cut="ground" />
              <p className="bubble-kata px-4 py-2.5 text-[0.9375rem] leading-snug">
                <span className="sr-only">Maru says: </span>
                {says}
              </p>
            </div>
            <div className="card mt-9 px-5 pb-6 pt-7 sm:px-7 sm:pb-7">
              <span aria-hidden className="tape" />
              {children}
            </div>
            {footer ? (
              <div className="mt-6 text-center text-[0.9375rem] text-ink/70 [&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center [&_a]:px-0.5 [&_a]:font-semibold [&_a]:text-ink">
                {footer}
              </div>
            ) : null}
          </div>
        </main>
      </div>
      {aside ? (
        // Tablets get the desk under the form; wide screens put it beside.
        <div aria-hidden className="hidden min-w-0 px-margin pb-margin md:block lg:px-0 lg:py-4 lg:pr-4">
          {aside}
        </div>
      ) : null}
    </div>
  );
}

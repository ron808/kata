import Link from "next/link";
import { buttonClass } from "@/components/shared/Button";
import { Logo } from "@/components/shared/Logo";
import { StartLink } from "./StartLink";

/** Landing header. Fixed over the scenes; takes on chapter tokens over dark sections. */
export function SiteHeader() {
  return (
    <header
      data-site-header
      className="fixed inset-x-0 top-0 z-50 h-[var(--header-h)] bg-ground/88 text-ink backdrop-blur-md transition-colors duration-500"
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-10 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2.5 focus:text-ground"
      >
        Skip to content
      </a>
      <div className="mx-auto flex h-full max-w-[90rem] items-center justify-between gap-3 px-margin">
        <Link href="/" aria-label="Kata, home" className="-mx-1 flex min-h-11 items-center px-1">
          <Logo />
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2">
          <a href="#how" className={buttonClass({ variant: "quiet", className: "max-md:hidden" })}>
            How it works
          </a>
          <Link
            href="/login"
            className={buttonClass({ variant: "quiet", className: "max-xs:px-3 [html[data-session=in]_&]:hidden" })}
          >
            Log in
          </Link>
          <StartLink variant="secondary" lit />
        </nav>
      </div>
    </header>
  );
}

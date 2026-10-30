import Link from "next/link";
import { KataMark } from "@/components/shared/Avatar";
import { buttonClass } from "@/components/shared/Button";
import { Logo } from "@/components/shared/Logo";
import { Sticker } from "@/components/onboarding/Sticker";

const DIGITS = [
  { d: "4", hue: 0, tilt: -8, lift: "translate-y-2" },
  { d: "0", hue: 2, tilt: 5, lift: "-translate-y-3" },
  { d: "4", hue: 3, tilt: -3, lift: "translate-y-1" },
];

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col px-margin">
      <header className="flex h-[var(--header-h)] shrink-0 items-center">
        <Link href="/" aria-label="Kata, home" className="-mx-1 flex min-h-11 items-center px-1">
          <Logo cut="ground" />
        </Link>
      </header>
      <main id="main" className="flex flex-1 items-center justify-center py-12">
        <div className="mx-auto w-full max-w-xl text-center">
          <p aria-hidden className="flex justify-center gap-[clamp(0.25rem,1.5vw,0.9rem)]">
            {DIGITS.map((n, i) => (
              <Sticker
                key={i}
                hue={n.hue}
                size="clamp(5.5rem, 22vw, 9.5rem)"
                tilt={n.tilt}
                className={`appear ${n.lift} motion-safe:[animation-delay:var(--d)]`}
                style={{ ["--d" as string]: `${i * 140}ms` }}
              >
                <span className="font-display text-[clamp(3.2rem,13vw,5.75rem)] leading-none">{n.d}</span>
              </Sticker>
            ))}
          </p>
          <h1 className="mt-10 font-display text-display-m">
            <span className="sr-only">Error 404. </span>
            This page <span className="mark">wandered off</span>.
          </h1>
          <div className="mx-auto mt-6 flex w-fit max-w-full items-start gap-3 text-left">
            <KataMark size={34} cut="ground" />
            <p className="bubble-kata px-4 py-2.5 text-[0.9375rem] leading-snug">
              <span className="sr-only">Maru says: </span>I looked everywhere. It may have moved, or the link has a typo.
            </p>
          </div>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link href="/dashboard" className={buttonClass({ size: "lg" })}>
              Back to today
            </Link>
            <Link href="/" className={buttonClass({ variant: "secondary", size: "lg" })}>
              Kata’s front page
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

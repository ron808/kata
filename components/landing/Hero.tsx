import { buttonClass } from "@/components/shared/Button";
import { Seal } from "@/components/shared/Seal";
import { CheckIn } from "./CheckIn";
import { StartLink } from "./StartLink";
import s from "./landing.module.css";

/** The promise, the seal, and an example morning with Kata a visitor can answer. */
export function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="px-margin pb-section pt-[calc(var(--header-h)+clamp(1.75rem,7svh,5rem))]"
    >
      <div className="mx-auto grid max-w-[90rem] grid-cols-1 items-center gap-x-14 gap-y-20 lg:grid-cols-12">
        <div className="@container lg:col-span-7">
          {/* Fit to the column: the longest line, "that checks in", measures 4.9em. Lines
              never wrap, so the title's height can't change when the face swaps in for its
              wider fallback (which is clipped meanwhile instead of reflowing the hero). */}
          <h1
            id="hero-title"
            className="overflow-x-clip font-display text-display-xl tracking-[-0.022em] [--k:5] [font-size:min(calc(100cqi/var(--k)),10.5rem)] [&>span]:whitespace-nowrap"
          >
            <span className="block">The journal</span>{" "}
            <span className="block">
              that <span className={`mark ${s.marker} ${s.swipe}`}>checks in</span>
            </span>{" "}
            <span className="block">
              on you.
              <span className={`${s.stamp} ml-[0.14em] inline-block -rotate-[8deg] align-[0.02em]`}>
                <Seal size="0.74em" cut="ground" />
              </span>
            </span>
          </h1>
          <p className="mt-8 max-w-[34rem] text-lede text-ink/75">
            Write a few lines a day. Maru, the friend inside Kata, keeps a map of what you’re working on, checks in
            on it each morning, and lets you share the good bits with your people.
          </p>
          {/* Stacked on phones so the rows never depend on which font has loaded yet. */}
          <div className="mt-9 flex flex-wrap items-center gap-3 max-sm:flex-col max-sm:items-start">
            <StartLink size="lg" arrow big />
            <a href="#how" className={buttonClass({ variant: "secondary", size: "lg" })}>
              See how it works
            </a>
          </div>
          <p className="mt-4 text-sm text-ink/65">Free. No one else on Kata sees your pages.</p>
        </div>

        {/* Top room for the sticker on the card's corner, clear of the fixed header. */}
        <div className="mx-auto w-full max-w-[34rem] pt-10 lg:col-span-5 lg:max-w-none lg:pt-16">
          <CheckIn />
          <p className="mt-5 text-[0.8125rem] text-ink/65">An example morning. Tap a reply; nothing is sent.</p>
        </div>
      </div>
    </section>
  );
}

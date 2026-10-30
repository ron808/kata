import Link from "next/link";
import { Seal } from "@/components/shared/Seal";
import { Today } from "@/components/shared/Today";
import { StartLink } from "./StartLink";
import s from "./landing.module.css";

/** The last page: today, waiting for its first few lines. */
export function BeginSection({ todayWeekday }: { todayWeekday: string }) {
  return (
    <section aria-labelledby="begin-title" className="px-margin py-section">
      <div className="@container mx-auto max-w-[90rem]">
        {/* Fit to width. From sm up it's one line, longest with "Wednesday" (K em); on
            phones the weekday takes the second line. */}
        <h2
          id="begin-title"
          className="font-display leading-[0.86] tracking-[-0.03em] [--k:5.75] [font-size:min(calc(100cqi/var(--k)),12rem)] sm:[--k:8.75]"
        >
          <span className="whitespace-nowrap max-sm:block">Start with </span>
          <span className="whitespace-nowrap max-sm:block">
            <span className={`mark ${s.marker}`}>
              <Today initial={todayWeekday} style="weekday" />
            </span>
            .
            <span data-begin-seal className="ml-[0.14em] inline-block align-[0.02em]">
              <span className="inline-block -rotate-[8deg]">
                <Seal size="0.7em" cut="ground" />
              </span>
            </span>
          </span>
        </h2>
        <p className="mt-8 max-w-xl text-lede text-ink/75">
          Pick a starter, write a few lines, and tomorrow morning Maru will ask how it went.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
          <StartLink size="lg" arrow big />
          <p className="text-ink/70 [html[data-session=in]_&]:invisible">
            Already writing?{" "}
            <Link href="/login" className="link text-ink">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}

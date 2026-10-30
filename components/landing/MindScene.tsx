import type { CSSProperties } from "react";
import { Seal } from "@/components/shared/Seal";
import { STATUS_LABEL, Status } from "@/components/shared/Status";
import { NOTE, STEPS, STUCK_ASK, THREADS, type ThreadId } from "./content";
import s from "./landing.module.css";

const HUE = Object.fromEntries(THREADS.map((t) => [t.id, t.hue])) as Record<ThreadId, number>;
const MAP_LABEL = `An example map of six threads around you: ${THREADS.map(
  (t) => `${t.title}, ${STATUS_LABEL[t.status].toLowerCase()}`
).join("; ")}.`;

/**
 * The signature scene. A day's page: Kata marks what's on your mind, each phrase lifts
 * off as a sticker and lands on a map of threads, every thread gets a status, and Kata
 * asks about the stuck one. Scrubbed by Scenes.tsx inside a sticky runway; without JS or
 * with reduced motion it's the finished map beside the page, with the steps as a list.
 *
 * Desktop: copy, page and Kata's question in the left column, the map in the right.
 * Phones: one stage under the caption, where the page gives way to the map.
 */
export function MindScene() {
  return (
    <section
      id="how"
      data-scene="mind"
      aria-labelledby="mind-title"
      className={`chapter ${s.mat} relative staged:h-[400svh] staged:lg:h-[440svh]`}
    >
      <div data-mind-view className="relative staged:sticky staged:top-0 staged:h-svh staged:overflow-clip">
        <div
          className="mx-auto flex max-w-[90rem] flex-col gap-12 px-margin py-section lg:grid lg:grid-cols-12 lg:grid-rows-[auto_auto_1fr] lg:content-center lg:gap-x-12 lg:gap-y-10 staged:h-full staged:gap-[clamp(0.75rem,2.5svh,1.5rem)] staged:py-0 staged:pb-[3svh] staged:pt-[calc(var(--header-h)+2.5svh)] staged:lg:gap-y-[3.5svh] staged:lg:pb-[4svh] staged:lg:pt-[calc(var(--header-h)+4svh)]"
        >
          <div className="lg:col-span-5 lg:col-start-1 lg:row-start-1">
            <h2 id="mind-title" className="font-display text-display-l staged:sr-only">
              Write a few lines. Maru keeps the map.
            </h2>
            <ol className="mt-10 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-1 staged:mt-0 staged:grid-cols-1 staged:gap-0">
              {STEPS.map((step, i) => (
                <li
                  key={step}
                  data-step={i}
                  className={`flex items-center gap-4 text-balance font-display text-display-s staged:block staged:text-[clamp(1.75rem,1.15rem+2.4vw,2.5rem)] staged:leading-[0.98] staged:[grid-area:1/1] staged:lg:text-[min(var(--text-display-m),6.2svh)] staged:lg:leading-[0.95] ${
                    i < STEPS.length - 1 ? "staged:opacity-0" : ""
                  }`}
                >
                  <span aria-hidden data-hue={[0, 2, 5, 1][i]} className="avatar size-11 text-xl staged:hidden">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
            <div aria-hidden className="mt-4 hidden gap-1.5 staged:flex staged:lg:mt-6 staged:lg:max-w-[18rem]">
              {STEPS.map((step) => (
                <span key={step} className="h-1.5 flex-1 overflow-clip rounded-full bg-ink/20">
                  <span data-meter className="block h-full origin-left rounded-full bg-sun" />
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-10 lg:contents staged:max-lg:relative staged:max-lg:min-h-0 staged:max-lg:flex-1 staged:max-lg:[container-type:size]">
            <article
              data-mind-page
              aria-label="An example page"
              className="card w-full p-[clamp(1.1rem,2vw,1.75rem)] lg:col-span-5 lg:col-start-1 lg:row-start-2 lg:max-w-[34rem] lg:self-start staged:max-lg:absolute staged:max-lg:inset-0 staged:max-lg:m-auto staged:max-lg:h-fit staged:max-lg:w-[min(100%,34rem)] staged:max-lg:opacity-0"
            >
              <header className="rule flex items-center justify-between gap-3 border-b-2 pb-3">
                <p className="font-display text-display-s">Thursday</p>
                <span className="tag" data-hue="1">
                  Example page
                </span>
              </header>
              <p className="ruled mt-2 text-[clamp(1rem,0.92rem+0.35vw,1.1875rem)] [--rule:1.8em] staged:text-[clamp(0.9375rem,0.75rem+0.9vw,1.25rem)] staged:lg:text-[clamp(1rem,2.5svh,1.375rem)]">
                {NOTE.map((part, i) =>
                  typeof part === "string" ? (
                    part
                  ) : (
                    <span
                      key={i}
                      data-phrase={part.thread}
                      data-hue={HUE[part.thread]}
                      className="relative inline-block whitespace-nowrap"
                    >
                      <span
                        data-swipe
                        aria-hidden
                        className="absolute -inset-x-[0.14em] bottom-[0.3em] top-[0.32em] origin-left rounded-[0.3em] bg-hue/45"
                      />
                      <span className="relative">{part.text}</span>
                    </span>
                  )
                )}
              </p>
            </article>

            <div
              data-mind-mapwrap
              className="mx-auto w-full max-w-[34rem] lg:col-span-7 lg:col-start-6 lg:row-span-3 lg:row-start-1 lg:max-w-[44rem] lg:self-center staged:max-lg:absolute staged:max-lg:inset-0 staged:max-lg:m-auto staged:max-lg:h-fit staged:max-lg:w-[min(100cqw,100cqh)] staged:max-lg:max-w-none staged:lg:w-[min(100%,42rem,calc(100svh-var(--header-h)-15svh))]"
            >
              <div data-mind-map role="img" aria-label={MAP_LABEL} className="map">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
                  {THREADS.map((t) => (
                    <line key={t.id} data-link={t.id} x1="50" y1="50" x2={t.x} y2={t.y} className="map-link" />
                  ))}
                </svg>
                <span data-me aria-hidden className="absolute left-1/2 top-1/2">
                  <span className="map-me">You</span>
                </span>
                {THREADS.map((t) => (
                  // GSAP flies this wrapper; the sticker inside keeps its own CSS centring and tilt.
                  <span key={t.id} data-fly={t.id} aria-hidden className="absolute" style={{ left: `${t.x}%`, top: `${t.y}%` }}>
                    <span
                      className="map-node"
                      data-hue={t.hue}
                      data-weight={t.weight}
                      style={{ "--x": "0px", "--y": "0px", "--tilt": `${t.tilt}deg` } as CSSProperties}
                    >
                      <span className="map-title text-[clamp(11px,calc(var(--s)*0.14),26px)]">{t.title}</span>
                      <span className="map-meta text-[clamp(10px,calc(var(--s)*0.095),15px)]">{t.meta}</span>
                      <span className="absolute left-1/2 top-[calc(100%-0.95rem)] -translate-x-1/2">
                        <span
                          data-badge
                          className="inline-flex -rotate-[4deg] rounded-full border-2 border-edge bg-surface px-2 py-0.5 shadow-sticker-sm"
                        >
                          <Status status={t.status} />
                        </span>
                      </span>
                    </span>
                  </span>
                ))}
              </div>
            </div>

            <div
              data-mind-ask
              className="flex items-start gap-3 lg:col-span-5 lg:col-start-1 lg:row-start-3 lg:self-start staged:max-lg:absolute staged:max-lg:inset-x-0 staged:max-lg:bottom-0"
            >
              <Seal size={40} className="mt-1" style={{ ["--seal-cut" as string]: "var(--mat)" }} />
              <div className="min-w-0">
                <p className="bubble-kata max-w-[34ch] px-4 py-3 leading-snug">{STUCK_ASK}</p>
                <p className="mt-2.5 flex flex-wrap items-center gap-2 text-[0.875rem] text-ink/70">
                  Filed for tomorrow’s page under
                  <span className="tag" data-hue={HUE.sleep}>
                    #sleep
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

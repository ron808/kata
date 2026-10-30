import type { CSSProperties, ReactNode } from "react";
import { KataMark } from "@/components/shared/Avatar";
import { Icon } from "@/components/shared/Icon";
import { Seal } from "@/components/shared/Seal";
import { Sticker, StickerLabel } from "@/components/onboarding/Sticker";

// The desk beside the auth forms: dotted cutting-mat paper with a sticker scene on it.
// Every scene is decorative (AuthFrame hides it from assistive tech) and labelled as an
// example wherever it shows made-up threads.

const DOTS: CSSProperties = {
  backgroundImage: "radial-gradient(circle, color-mix(in oklab, var(--ink) 15%, transparent) 1.25px, transparent 1.9px)",
  backgroundSize: "22px 22px",
};

/** A one-time entrance in order, skipped entirely with reduced motion. */
const at = (ms: number): CSSProperties => ({ ["--d" as string]: `${ms}ms` });
const IN = "appear motion-safe:[animation-delay:var(--d,0ms)]";

function Desk({ caption, children }: { caption?: string; children: ReactNode }) {
  return (
    <div
      className="relative grid h-full min-h-[36rem] place-items-center overflow-clip rounded-xl border-2 border-edge bg-raised px-16 pb-24 pt-20 lg:min-h-[40rem]"
      style={DOTS}
    >
      {/* The scene is drawn at one size and zoomed to the desk: full size under the form on tablets, smaller beside a narrow form, bigger on wide screens. */}
      <div className="grid w-full place-items-center lg:[zoom:0.84] xl:[zoom:1] min-[90rem]:[zoom:1.1] 2xl:[zoom:1.2]">{children}</div>
      {caption ? (
        <p className="absolute bottom-5 left-6 rounded-full bg-raised px-2 text-sm font-medium text-ink/70">{caption}</p>
      ) : null}
    </div>
  );
}

/** Log in: Kata checking in on a thread, the way a morning starts. */
export function CheckInAside() {
  return (
    <Desk caption="An example check-in. Names are made up.">
      <div className="relative w-full max-w-[25.5rem]">
        <Sticker hue={2} size="6.75rem" tilt={-6} className={`absolute -left-[5.75rem] top-[36%] ${IN}`} style={at(1500)}>
          <StickerLabel title="Job hunt" meta="2 this week" />
        </Sticker>
        <div className="card p-6">
          <div className="flex items-center gap-3">
            <KataMark size={38} cut="surface" />
            <div className="min-w-0">
              <p className="font-semibold leading-tight">Maru</p>
              <p className="text-[0.8125rem] text-ink/65">Checks in every morning</p>
            </div>
          </div>
          <div className="mt-5 grid justify-items-start gap-3 text-[0.9375rem] leading-snug">
            <p className={`bubble-kata px-4 py-2.5 ${IN}`} style={at(150)}>
              Morning, Sam. Four days in a row now.
            </p>
            <p className={`bubble-kata max-w-[30ch] px-4 py-2.5 ${IN}`} style={at(700)}>
              Yesterday the payments webhook was waiting on review. Did it land?
            </p>
            <div className={`flex flex-wrap gap-2 ${IN}`} style={at(1200)}>
              <span className="chip chip-sm bg-sun text-on-sun">
                <Icon name="check" className="h-3.5 w-3.5" strokeWidth={2.4} />
                It landed
              </span>
              <span className="chip chip-sm">Still waiting</span>
              <span className="chip chip-sm">Drop it</span>
            </div>
            <p className={`bubble-you justify-self-end px-4 py-2 font-medium ${IN}`} style={at(1900)}>
              It landed
            </p>
            <p className={`bubble-kata max-w-[30ch] px-4 py-2.5 ${IN}`} style={at(2500)}>
              Nice. I’ll mark it done and ask how the retries look tomorrow.
            </p>
          </div>
        </div>
        <Sticker hue={0} size="7.5rem" tilt={7} className={`absolute -right-14 -top-16 ${IN}`} style={at(2900)}>
          <StickerLabel title="Payments webhook" meta="Done" />
        </Sticker>
        <Sticker hue={3} size="5.75rem" tilt={-5} className={`absolute -bottom-12 -right-9 ${IN}`} style={at(1700)}>
          <StickerLabel title="Gym" meta="4 days" />
        </Sticker>
      </div>
    </Desk>
  );
}

const MAP = [
  { title: "Portfolio", meta: "Moving", hue: 4, x: 25, y: 27, s: 29, tilt: -6 },
  { title: "Job hunt", meta: "2 this week", hue: 2, x: 76, y: 25, s: 29, tilt: 5 },
  { title: "Gym", meta: "4 days", hue: 3, x: 83, y: 70, s: 22, tilt: -4 },
  { title: "Mom’s birthday", meta: "Friday", hue: 1, x: 52, y: 85, s: 23, tilt: 3 },
  { title: "Sleep", meta: "5h 40m", hue: 5, x: 18, y: 70, s: 22, tilt: 7 },
];

/** Sign up: the map Kata keeps, filling in, with one of the questions it adds. */
export function MapAside() {
  return (
    <Desk caption="An example map. Yours fills in as you go.">
      <div className="relative w-full max-w-[26rem]">
        <div className="card p-6">
          <p className="font-display text-[1.85rem] leading-none">On your mind</p>
          <p className="mt-1.5 text-sm text-ink/65">What Maru keeps track of for you.</p>
          <div className="relative mt-4 aspect-square [container-type:inline-size]">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
              {MAP.map((n) => (
                <line
                  key={n.title}
                  x1="50"
                  y1="50"
                  x2={n.x}
                  y2={n.y}
                  stroke="var(--edge)"
                  strokeWidth="2"
                  strokeDasharray="5 6"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>
            <span className="absolute left-1/2 top-1/2 grid h-[17cqi] w-[17cqi] -translate-x-1/2 -translate-y-1/2 rotate-[-8deg] place-items-center rounded-full bg-ink font-display text-[clamp(0.8rem,4cqi,1rem)] text-ground">
              You
            </span>
            {MAP.map((n, i) => (
              <Sticker
                key={n.title}
                hue={n.hue}
                size={`${n.s}cqi`}
                tilt={n.tilt}
                fontSize="clamp(0.8rem, 3.9cqi, 1rem)"
                className={`absolute -translate-x-1/2 -translate-y-1/2 ${IN}`}
                style={{ left: `${n.x}%`, top: `${n.y}%`, ...at(250 + i * 380) }}
              >
                <StickerLabel title={n.title} meta={n.s > 25 ? n.meta : undefined} />
              </Sticker>
            ))}
          </div>
        </div>
        <div
          data-hue="5"
          className={`absolute -bottom-16 -left-14 w-[14.5rem] rotate-[-3deg] rounded-md border-2 border-edge bg-tint px-4 pb-4 pt-5 shadow-sticker ${IN}`}
          style={at(2300)}
        >
          <span className="tape" />
          <span className="tag">#sleep</span>
          <p className="mt-2.5 font-semibold leading-snug">What time did the screen actually go off last night?</p>
        </div>
      </div>
    </Desk>
  );
}

/** Password pages: the reset link, sealed and on its way. */
export function LetterAside() {
  return (
    <Desk>
      <div className="relative">
        <div className={`card relative aspect-[3/2] w-[23rem] rotate-[-3deg] overflow-clip ${IN}`} style={at(100)}>
          <svg viewBox="0 0 300 200" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
            <path d="M0 0 L150 104 L300 0" fill="var(--raised)" stroke="var(--edge)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          </svg>
          <Seal size={62} cut="surface" className="absolute left-1/2 top-[52%] -translate-x-1/2 -translate-y-1/2 rotate-[-8deg]" />
          <div className="absolute bottom-5 left-6 right-6">
            <p className="font-display text-[1.6rem] leading-none">For you</p>
            <p className="mt-1.5 text-sm text-ink/70">A link to choose a new password</p>
          </div>
        </div>
        <Sticker hue={4} size="6.5rem" tilt={8} className={`absolute -right-12 -top-14 ${IN}`} style={at(700)}>
          <Icon name="clock" className="mx-auto h-6 w-6" strokeWidth={2} />
          <StickerLabel title="30 minutes" />
        </Sticker>
        <div className={`absolute -bottom-24 left-2 flex items-start gap-2.5 ${IN}`} style={at(1200)}>
          <KataMark size={32} cut="raised" />
          <p className="bubble-kata max-w-[26ch] px-4 py-2.5 text-[0.9375rem] leading-snug">
            Happens to everyone. Your pages are safe while you sort it out.
          </p>
        </div>
      </div>
    </Desk>
  );
}

"use client";

import { FIELD_TYPE_META } from "@/components/builder/fieldTypes";
import { KataMark } from "@/components/shared/Avatar";
import { Icon } from "@/components/shared/Icon";
import { Today } from "@/components/shared/Today";
import type { RolePreset } from "@/lib/types";
import { Sticker, StickerLabel } from "./Sticker";
import { checkInInfo, interestHue, MAX_FOCUS, type CheckIn } from "./script";
import styles from "./onboarding.module.css";

// Where each thread lands on the little map, in percent of a 16:10 box; sizes in cqi.
const SLOTS = [
  { x: 22, y: 31, s: 25, tilt: -6 },
  { x: 78, y: 29, s: 25, tilt: 5 },
  { x: 83, y: 76, s: 19, tilt: -4 },
  { x: 50, y: 82, s: 19, tilt: 3 },
  { x: 17, y: 76, s: 19, tilt: 7 },
  { x: 50, y: 17, s: 19, tilt: -3 },
];

const MAX_TAGS = 8;

/**
 * Desktop only: the map and today's page filling in as you answer. A preview of what the
 * conversation already says, so it's hidden from assistive tech.
 */
export function LivePanel({
  today,
  preset,
  kept,
  focus,
  interests,
  checkIn,
  handle,
  companion,
}: {
  today: string;
  preset: RolePreset | null;
  kept: RolePreset["fields"];
  focus: string[];
  interests: string[];
  checkIn: CheckIn | null;
  handle: string | null;
  /** What they're calling their companion. */
  companion: string;
}) {
  const asks = [
    ...focus.map((title, i) => ({ key: `t-${title}`, label: title, hue: i % 8 })),
    ...interests.map((tag) => ({ key: `i-${tag}`, label: `#${tag.replace(/\s+/g, "-")}`, hue: interestHue(tag) })),
  ];

  return (
    <div aria-hidden className="grid grid-cols-1 gap-5">
      <section className="card p-5">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="font-display text-display-s">Your map</p>
            <p className="mt-1 text-sm text-ink/65">Each thing you add becomes a thread.</p>
          </div>
          <span className="shrink-0 text-sm font-semibold tabular-nums text-ink/65">
            {focus.length} of {MAX_FOCUS}
          </span>
        </div>
        <div className="relative mt-3 aspect-[16/10] [container-type:inline-size]">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
            {SLOTS.map((s, i) => (
              <line
                key={i}
                x1="50"
                y1="50"
                x2={s.x}
                y2={s.y}
                stroke="var(--edge)"
                strokeWidth="2"
                strokeDasharray="5 6"
                vectorEffect="non-scaling-stroke"
                className="transition-opacity duration-500"
                opacity={focus[i] ? 1 : 0}
              />
            ))}
          </svg>
          {SLOTS.map((s, i) =>
            focus[i] ? null : (
              <span
                key={`slot-${i}`}
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-ink/25"
                style={{ left: `${s.x}%`, top: `${s.y}%`, width: `${s.s * 0.86}cqi`, aspectRatio: "1" }}
              />
            )
          )}
          <span className="absolute left-1/2 top-1/2 grid h-[15cqi] w-[15cqi] -translate-x-1/2 -translate-y-1/2 rotate-[-8deg] place-items-center rounded-full bg-ink font-display text-[clamp(0.8rem,3.6cqi,1rem)] text-ground">
            You
          </span>
          {focus.slice(0, SLOTS.length).map((title, i) => {
            const s = SLOTS[i];
            return (
              <span
                key={title.toLowerCase()}
                className={`absolute -translate-x-1/2 -translate-y-1/2 ${styles.slot}`}
                style={{ left: `${s.x}%`, top: `${s.y}%` }}
              >
                <Sticker
                  hue={i % 8}
                  size={`${s.s}cqi`}
                  tilt={s.tilt}
                  fontSize={`clamp(0.75rem, ${(s.s * 0.165).toFixed(2)}cqi, 1.05rem)`}
                  className={styles.stick}
                >
                  <StickerLabel title={title} />
                </Sticker>
              </span>
            );
          })}
        </div>
      </section>

      <section className="card p-5">
        <p className="font-display text-display-s">Today’s page</p>
        <p className="mt-1 text-sm text-ink/65">
          <Today initial={today} />
          {preset ? ` · ${preset.name} starter` : null}
        </p>
        {preset ? (
          <>
            <ol className="mt-4 grid grid-cols-1 gap-2">
              {kept.map((f) => {
                const meta = FIELD_TYPE_META[f.type];
                return (
                  <li key={`${f.type}-${f.label}`} className="appear flex items-center gap-2.5">
                    <span
                      data-hue={meta?.hue ?? 0}
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-edge bg-hue text-on-hue"
                    >
                      <Icon name={meta?.icon ?? "text-short"} className="h-3.5 w-3.5" strokeWidth={2} />
                    </span>
                    <span className="min-w-0 font-semibold leading-snug">{f.label}</span>
                  </li>
                );
              })}
            </ol>
          </>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-2.5">
            {[78, 62, 70].map((w) => (
              <div key={w} className="flex items-center gap-2.5">
                <span className="h-7 w-7 shrink-0 rounded-full border-2 border-dashed border-ink/25" />
                <span className="h-3 rounded-full bg-raised" style={{ width: `${w}%` }} />
              </div>
            ))}
            <p className="mt-1 text-sm text-ink/65">Your questions appear once you say what you do.</p>
          </div>
        )}

        {asks.length ? (
          <div className="rule mt-4 border-t-2 pt-3.5">
            <p className="text-sm font-semibold">{companion} will also ask about</p>
            <ul className="mt-2.5 flex flex-wrap gap-1.5">
              {asks.slice(0, MAX_TAGS).map((a) => (
                <li key={a.key} data-hue={a.hue} className="tag appear max-w-full">
                  <span className="truncate">{a.label}</span>
                </li>
              ))}
              {asks.length > MAX_TAGS ? (
                <li className="inline-flex h-[1.6rem] items-center px-1 text-[0.8125rem] font-semibold text-ink/65">
                  +{asks.length - MAX_TAGS} more
                </li>
              ) : null}
            </ul>
          </div>
        ) : null}

        <div className="rule mt-4 flex items-center gap-2.5 border-t-2 pt-3.5">
          <KataMark size={28} cut="surface" />
          <p className="min-w-0 flex-1 text-sm font-medium">
            {checkIn ? checkInInfo(checkIn).line : <span className="text-ink/65">Check-ins start once you say when</span>}
          </p>
          {handle ? (
            <span className="tag appear max-w-[45%]">
              <span className="truncate">@{handle}</span>
            </span>
          ) : null}
        </div>
      </section>
    </div>
  );
}

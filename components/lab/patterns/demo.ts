import { addDays } from "@/lib/companion/time";
import { WINDOW_DAYS, patternsOf, type Activity, type DayOf, type Patterns } from "@/lib/patterns/compute";

/*
 * Two months of a made-up writer's days, for the Lab: walking lifts their mood, sleep their
 * energy, family days and getting things moving a little, water does nothing, and the gym is too
 * new to tell. A seeded random, so every visit shows the same days, run through the same
 * patternsOf the app uses.
 */

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const scale = (n: number) => Math.max(1, Math.min(5, Math.round(n)));

/** Example patterns up to yesterday; `fresh` is a writer five days in, with too little to go on. */
export function demoPatterns(today: string, fresh = false): Patterns {
  const rand = seeded(808);
  // Roughly a bell curve, from three draws: enough for made-up moods.
  const wobble = () => (rand() + rand() + rand() - 1.5) * 1.15;
  const upTo = addDays(today, -1);
  const from = addDays(today, -WINDOW_DAYS);
  const gymSince = addDays(today, -6);
  const days: DayOf[] = [];
  const on = { walk: {}, water: {}, gym: {}, moved: {}, outside: {}, family: {} } as Record<string, Record<string, boolean>>;
  const slept: { day: string; value: number }[] = [];
  for (let i = 0; i < WINDOW_DAYS; i++) {
    const day = addDays(from, i);
    const walked = rand() < 0.55;
    const water = rand() < 0.75;
    const moved = rand() < 0.45;
    const family = rand() < 0.16;
    const sleep = [5.5, 6, 6.5, 7, 7, 7.5, 8, 8, 8.5][Math.floor(rand() * 9)];
    const wrote = rand() < 0.72;
    const answered = rand() < 0.82;
    const mood = scale(3.1 + (walked ? 0.95 : 0) + (family ? 0.5 : 0) + (moved ? 0.45 : 0) + wobble());
    const energy = scale(2.7 + (sleep >= 7 ? 1.05 : 0) + wobble() * 0.8);
    const counted = !fresh || i >= WINDOW_DAYS - 5;
    days.push({ day, mood: counted && answered ? mood : null, energy: counted && wrote ? energy : null });
    on.walk[day] = walked;
    on.water[day] = water;
    if (day >= gymSince) on.gym[day] = i % 3 === 0;
    if (i >= 6) on.moved[day] = moved;
    if (wrote) {
      on.outside[day] = walked ? rand() < 0.85 : rand() < 0.25;
      on.family[day] = family;
      slept.push({ day, value: sleep });
    }
  }
  const habit = (key: string, title: string, hue: number): Activity => ({ key: `habit:${key}`, kind: "habit", title, detail: "", hue, href: null, sides: ["Done", "Not done"], on: on[key] });
  const activities: Activity[] = [
    habit("walk", "Walk", 3),
    habit("water", "Drink water", 2),
    habit("gym", "Gym", 0),
    { key: "moved", kind: "moved", title: "Moving something forward", detail: "", hue: null, href: null, sides: ["Moved something", "Didn’t"], on: on.moved },
    { key: "page-number:hours slept", kind: "number", title: "Hours slept", detail: "", hue: null, href: null, sides: ["", ""], on: {}, values: slept, goal: null, unit: "" },
    { key: "yes:did i get outside?", kind: "yes", title: "Did I get outside?", detail: "", hue: null, href: null, sides: ["Yes", "No"], on: on.outside },
    { key: "tag:family", kind: "tag", title: "family", detail: "", hue: null, href: null, sides: ["Tagged", "Not tagged"], on: on.family },
  ];
  return patternsOf(days, activities, from, upTo);
}

import { Types } from "mongoose";
import { CompanionMessage, type IReceipt } from "@/lib/db/models/CompanionMessage";
import { Entry } from "@/lib/db/models/Entry";
import { Thread, type IThread } from "@/lib/db/models/Thread";
import { habitDays } from "@/lib/breakdowns/stats";
import { addDays, dateToDay, dayToDate, localDay } from "@/lib/companion/time";
import { MIN_SIDE, WINDOW_DAYS, dayMoods, pageScale, patternsOf, type Activity, type DayOf, type Patterns } from "./compute";

/*
 * The writer's last two months as days with a mood and an energy level, and everything they keep
 * as an activity on those days, for patternsOf. Days count once they're over, so the window ends
 * yesterday: this morning's mood with a habit not yet done would read as a day without it.
 */

type PageDay = {
  date: Date;
  fields?: { type: string; label: string; value?: unknown }[];
  tags?: string[];
};

// The thread's own first entry is it starting, not an update.
const updateAt = (t: IThread, at: Date) => Math.abs(new Date(at).getTime() - new Date(t.createdAt).getTime()) > 10_000;

/** The most tags compared: the ones on the most pages. */
const TAGS = 6;

export async function loadPatterns(userId: string, tz: string, today: string): Promise<Patterns> {
  const upTo = addDays(today, -1);
  const from = addDays(today, -WINDOW_DAYS);
  const id = new Types.ObjectId(userId);
  const inside = (day: string) => day >= from && day <= upTo;
  const [threads, said, pages] = await Promise.all([
    Thread.find({ userId: id, archived: false }).lean<IThread[]>(),
    CompanionMessage.find({
      userId: id,
      from: "you",
      mood: { $ne: null },
      day: { $gte: from, $lte: upTo },
    })
      .sort({ createdAt: 1 })
      .select("day mood")
      .lean<{ day: string; mood: number }[]>(),
    Entry.find({
      userId: id,
      date: { $gte: dayToDate(from), $lte: dayToDate(upTo) },
    })
      .select("date fields.type fields.label fields.value tags")
      .lean<PageDay[]>(),
  ]);

  const written = pages.map((p) => ({ ...p, day: dateToDay(p.date) })).filter((p) => inside(p.day));
  const moods = dayMoods(said, written);
  const energies = new Map(written.map((p) => [p.day, pageScale(p.fields, "energy")]));
  const days: DayOf[] = [];
  for (let d = from; d <= upTo; d = addDays(d, 1))
    days.push({
      day: d,
      mood: moods.get(d) ?? null,
      energy: energies.get(d) ?? null,
    });

  const activities: Activity[] = [];
  // Days something other than a habit moved: an update, or a number logged on it.
  const moved = new Set<string>();
  let movingSince: string | null = null;
  for (const t of threads) {
    const created = localDay(tz, t.createdAt);
    if (created > upTo) continue;
    const thread = {
      title: t.title,
      hue: (t.hue ?? 0) % 8,
      href: `/threads?t=${t._id}`,
    };
    if (t.kind === "habit") {
      const did = habitDays(t, tz);
      const on: Record<string, boolean> = {};
      for (let d = created > from ? created : from; d <= upTo; d = addDays(d, 1)) on[d] = did.has(d);
      activities.push({
        ...thread,
        key: `habit:${t._id}`,
        kind: "habit",
        detail: "",
        sides: ["Done", "Not done"],
        on,
      });
    } else {
      if (!movingSince || created < movingSince) movingSince = created;
      for (const l of t.log ?? []) {
        const day = localDay(tz, new Date(l.at));
        if (inside(day) && updateAt(t, l.at)) moved.add(day);
      }
    }
    for (const f of t.fields ?? []) {
      if (f.type !== "number") continue;
      const values = (f.days ?? []).filter((d) => inside(d.day) && Number.isFinite(d.value));
      if (!values.length) continue;
      if (t.kind !== "habit") values.forEach((v) => moved.add(v.day));
      activities.push({
        ...thread,
        key: `number:${t._id}:${f.key}`,
        kind: "number",
        detail: f.label,
        sides: ["", ""],
        on: {},
        values,
        goal: f.goal ?? null,
        unit: f.unit || f.label.toLowerCase(),
      });
    }
  }
  if (movingSince) {
    const on: Record<string, boolean> = {};
    for (let d = movingSince > from ? movingSince : from; d <= upTo; d = addDays(d, 1)) on[d] = moved.has(d);
    activities.push({
      key: "moved",
      kind: "moved",
      title: "Moving something forward",
      detail: "",
      hue: null,
      href: null,
      sides: ["Moved something", "Didn’t"],
      on,
    });
  }

  // A page's own yes-or-no questions and numbers, by their wording, and its tags.
  const answers = new Map<string, { title: string; on: Record<string, boolean> }>();
  const numbers = new Map<string, { title: string; values: { day: string; value: number }[] }>();
  const tagged = new Map<string, Set<string>>();
  for (const p of written) {
    for (const f of p.fields ?? []) {
      const title = (f.label ?? "").trim();
      const key = title.toLowerCase();
      if (!key) continue;
      if (f.type === "yes_no" && typeof f.value === "boolean") {
        const a = answers.get(key) ?? { title, on: {} };
        a.on[p.day] = f.value;
        answers.set(key, a);
      } else if (f.type === "number" && typeof f.value === "number" && Number.isFinite(f.value)) {
        const n = numbers.get(key) ?? { title, values: [] };
        n.values.push({ day: p.day, value: f.value });
        numbers.set(key, n);
      }
    }
    for (const tag of new Set((p.tags ?? []).map((x) => x.trim().toLowerCase()).filter(Boolean))) tagged.set(tag, (tagged.get(tag) ?? new Set()).add(p.day));
  }
  for (const [key, a] of answers)
    activities.push({
      key: `yes:${key}`,
      kind: "yes",
      title: a.title,
      detail: "",
      hue: null,
      href: null,
      sides: ["Yes", "No"],
      on: a.on,
    });
  for (const [key, n] of numbers)
    activities.push({
      key: `page-number:${key}`,
      kind: "number",
      title: n.title,
      detail: "",
      hue: null,
      href: null,
      sides: ["", ""],
      on: {},
      values: n.values,
      goal: null,
      unit: "",
    });
  const tags = [...tagged]
    .filter(([, on]) => on.size >= MIN_SIDE)
    .sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0]))
    .slice(0, TAGS);
  for (const [tag, on] of tags) {
    activities.push({
      key: `tag:${tag}`,
      kind: "tag",
      title: tag,
      detail: "",
      hue: null,
      href: null,
      sides: ["Tagged", "Not tagged"],
      on: Object.fromEntries(written.map((p) => [p.day, on.has(p.day)])),
    });
  }

  return patternsOf(days, activities, from, upTo);
}

/** What a receipt says about patterns Maru looked up. */
export function patternsReceipt(p: Patterns): IReceipt {
  const clear = p.found.filter((x) => x.strength === "clear").length;
  const watching = p.found.length - clear;
  const found = [clear ? `${clear} clear` : "", watching ? `${watching} worth watching` : ""].filter(Boolean).join(", ");
  return {
    kind: "breakdown",
    text: "Patterns",
    detail: `Last ${WINDOW_DAYS} days · ${p.moods} with a mood${found ? ` · ${found}` : ""}`,
    href: "/breakdowns#patterns",
    hue: null,
  };
}

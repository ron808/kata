"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/shared/Button";
import { useCompanion } from "@/components/shared/Companion";
import { Icon } from "@/components/shared/Icon";
import { addDays, dayDiff } from "@/lib/companion/time";
import { FIELDS_MAX, guessFields, parseTrack, specLabel, specText, valueText } from "@/lib/companion/fields";
import type { ThreadField, ThreadT } from "@/lib/types";

type Save = (body: Record<string, unknown>, done?: string) => Promise<ThreadT | undefined>;

/**
 * What a thread keeps track of (made up for it by the companion, or added here): today's
 * values to log, the last two weeks of each number, and the fields themselves to add or drop.
 */
export function ThreadFields({ thread: t, today, busy, save }: { thread: ThreadT; today: string; busy: boolean; save: Save }) {
  const { name: companionName } = useCompanion();
  const todayOf = (f: ThreadField) => (f.type === "text" ? String(f.value ?? "") : String(f.days.find((d) => d.day === today)?.value ?? ""));
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(t.fields.map((f) => [f.key, todayOf(f)])));
  const [seen, setSeen] = useState(t.fields);
  if (t.fields !== seen) {
    setSeen(t.fields);
    setValues(Object.fromEntries(t.fields.map((f) => [f.key, todayOf(f)])));
  }
  const [adding, setAdding] = useState("");

  const changed = t.fields.filter((f) => (values[f.key] ?? "").trim() !== todayOf(f));
  const valid = changed.every((f) => f.type === "text" || !values[f.key]?.trim() || /^-?\d+(?:[.,]\d+)?$/.test(values[f.key].trim()));
  const ideas = t.fields.length ? [] : guessFields(t.title, t.kind);

  async function log(e: FormEvent) {
    e.preventDefault();
    if (!changed.length || !valid) return;
    const body = Object.fromEntries(
      changed.map((f) => {
        const v = values[f.key].trim();
        return [f.key, !v ? null : f.type === "number" ? Number(v.replace(",", ".")) : v];
      })
    );
    await save({ values: body }, "Logged for today");
  }

  async function add(raw: string) {
    const [spec] = parseTrack([raw]);
    if (!spec) return;
    if (await save({ track: [{ label: spec.label, unit: spec.unit, type: spec.type, goal: spec.goal }] })) setAdding("");
  }

  return (
    <div>
      <p className="mb-2 text-[0.875rem] font-semibold">Keeps track of</p>
      {t.fields.length ? (
        <form onSubmit={log} className="grid grid-cols-1 gap-3">
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {t.fields.map((f) => (
              <li key={f.key} className="min-w-0 rounded-md border-2 border-edge bg-surface p-3">
                <div className="flex items-start gap-2">
                  <label htmlFor={`f-${t._id}-${f.key}`} className="min-w-0 flex-1 pt-0.5 font-semibold leading-tight [overflow-wrap:anywhere]">
                    {f.label}
                    {f.goal ? <span className="block text-[0.8125rem] font-normal text-ink/65">Goal {valueText(f, f.goal)} a day</span> : null}
                  </label>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => save({ untrack: [f.key] }, `${f.label} is off ${t.title}`)}
                    aria-label={`Stop keeping track of ${f.label}`}
                    className="-mr-1.5 -mt-1.5 grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink/60 transition-colors hover:bg-ink/[0.06] hover:text-ink"
                  >
                    <Icon name="close" className="h-4 w-4" />
                  </button>
                </div>
                {f.type === "number" ? <Strip field={f} today={today} /> : null}
                <span className="relative mt-2.5 block">
                  <input
                    id={`f-${t._id}-${f.key}`}
                    className={`control !min-h-11 !py-2 ${f.type === "number" ? "tabular-nums" : ""} ${f.unit ? "!pr-12" : ""}`}
                    inputMode={f.type === "number" ? "decimal" : undefined}
                    autoComplete="off"
                    maxLength={120}
                    placeholder={f.type === "number" ? "Today" : `What’s the ${f.label.toLowerCase()}?`}
                    value={values[f.key] ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [f.key]: f.type === "number" ? e.target.value.replace(/[^\d.,-]/g, "") : e.target.value }))}
                  />
                  {f.unit ? <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[0.875rem] text-ink/65">{f.unit}</span> : null}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" variant="secondary" disabled={busy || !changed.length || !valid}>
              <Icon name="check" className="h-4 w-4" strokeWidth={2.4} />
              Log today
            </Button>
            <p className="text-[0.8125rem] text-ink/65">Or tell {companionName}, like “walked 30 min”.</p>
          </div>
        </form>
      ) : (
        <p className="text-[0.9375rem] text-ink/75">Nothing yet. Add what’s worth a number{ideas.length ? ", or start with these:" : "."}</p>
      )}

      {ideas.length ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {ideas.map((s) => (
            <button key={s.label} type="button" className="chip chip-sm" disabled={busy} onClick={() => add(specText(s))}>
              <Icon name="plus" className="h-3.5 w-3.5" />
              {specLabel(specText(s))}
            </button>
          ))}
        </div>
      ) : null}

      {t.fields.length < FIELDS_MAX ? (
        <form
          className="mt-3 flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            add(adding);
          }}
        >
          <label htmlFor={`add-field-${t._id}`} className="sr-only">
            Keep track of something else on {t.title}
          </label>
          <input
            id={`add-field-${t._id}`}
            className="control !min-h-11 !py-2"
            placeholder="Add one, like pages"
            autoComplete="off"
            maxLength={40}
            value={adding}
            onChange={(e) => setAdding(e.target.value)}
          />
          <button
            type="submit"
            disabled={busy || !adding.trim()}
            aria-label="Add it"
            className="press grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-edge bg-surface transition-[transform,box-shadow,opacity] duration-300 disabled:opacity-45"
          >
            <Icon name="plus" className="h-4 w-4" />
          </button>
        </form>
      ) : null}
    </div>
  );
}

/** A number's last two weeks as small bars, today last; a filled bar reached the goal. */
function Strip({ field: f, today }: { field: ThreadField; today: string }) {
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13));
  const byDay = new Map(f.days.map((d) => [d.day, d.value]));
  const week = days.slice(7).map((d) => byDay.get(d)).filter((v): v is number => v !== undefined);
  const top = Math.max(f.goal ?? 0, ...f.days.filter((d) => dayDiff(today, d.day) < 14).map((d) => d.value), 1);
  const avg = week.length ? week.reduce((a, b) => a + b, 0) / week.length : null;
  const label = `${f.label}, last two weeks: ${days
    .map((d) => byDay.get(d))
    .filter((v) => v !== undefined)
    .length} days logged${avg !== null ? `, this week about ${valueText(f, Math.round(avg * 10) / 10)} a day` : ""}`;
  return (
    <div className="mt-2.5">
      <div role="img" aria-label={label} className="flex h-10 items-end gap-[3px]">
        {days.map((d) => {
          const v = byDay.get(d);
          const reached = v !== undefined && f.goal !== null && v >= f.goal;
          return (
            <span key={d} className="flex h-full flex-1 items-end justify-center">
              {v === undefined ? (
                <span className="mb-0.5 h-1 w-1 rounded-full bg-ink/25" />
              ) : (
                <span
                  className={`w-full max-w-2.5 rounded-t-[3px] border-[1.5px] border-edge ${reached || f.goal === null ? "bg-hue" : "bg-tint"}`}
                  style={{ height: `${Math.max(14, Math.round((Math.max(0, v) / top) * 100))}%` }}
                />
              )}
            </span>
          );
        })}
      </div>
      <p className="mt-1 text-[0.8125rem] text-ink/65">
        {avg !== null ? `About ${valueText(f, Math.round(avg * 10) / 10)} a day this week` : "Nothing logged this week"}
      </p>
    </div>
  );
}

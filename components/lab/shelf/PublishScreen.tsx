"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Fragment, useMemo, useState, type ReactNode } from "react";
import type { Me } from "@/components/lab/cast";
import { PersonSeal } from "@/components/lab/PersonSeal";
import { Button } from "@/components/shared/Button";
import { CheckRow, EASE, Switch } from "./bits";
import { CLEANUPS, MY_COLOPHON, TODAYS_PAGE, VOLUME_OPTIONS } from "./data";
import type { PublishedLeaf } from "./ShelfPrototype";

export function PublishScreen({
  me,
  published,
  onPublish,
}: {
  me: Me;
  published: PublishedLeaf | null;
  onPublish: (p: PublishedLeaf | null) => void;
}) {
  const reduce = useReducedMotion();
  const [text, setText] = useState(TODAYS_PAGE.fields[0].value);
  const [included, setIncluded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(TODAYS_PAGE.fields.map((f) => [f.id, f.defaultOn]))
  );
  const [accepted, setAccepted] = useState<string[]>([]);
  const [kept, setKept] = useState<string[]>([]);
  const [title, setTitle] = useState(TODAYS_PAGE.title);
  const [volume, setVolume] = useState(VOLUME_OPTIONS[1]);
  const [cooling, setCooling] = useState(true);
  const locked = published !== null;

  const present = CLEANUPS.filter((c) => text.includes(c.find));
  const pending = present.filter((c) => !accepted.includes(c.id) && !kept.includes(c.id));
  const publicText = useMemo(
    () => CLEANUPS.filter((c) => accepted.includes(c.id)).reduce((t, c) => t.split(c.find).join(c.replace), text),
    [text, accepted]
  );
  const finished = TODAYS_PAGE.fields.find((f) => f.id === "finished")!;
  const anyField = TODAYS_PAGE.fields.some((f) => included[f.id]);

  function publish() {
    const body = [included.mind ? publicText : "", included.finished ? `Finished: ${finished.value}` : ""].filter(Boolean).join(" ");
    onPublish({ leaf: { id: "me-new", date: "Thu 29 Oct", title: title.trim() || "Untitled leaf", body }, cooling });
  }

  return (
    <div className="grid grid-cols-1 gap-x-10 gap-y-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,27rem)]">
      {/* Your private page, with a checkbox per field */}
      <section aria-labelledby="page-title">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="page-title" className="font-display text-[1.75rem] leading-tight">
            Your page
          </h2>
          <p className="text-sm text-ink/65">Private. Tick what the leaf may carry.</p>
        </div>
        <article className="sheet px-[clamp(1.1rem,4vw,2.75rem)] pb-8 pt-7">
          <header className="rule flex items-end justify-between gap-4 border-b pb-5">
            <p className="font-display text-[clamp(2.2rem,1.8rem+1.6vw,3rem)] leading-[0.95]">
              {TODAYS_PAGE.weekday}
              <span className="block text-[0.55em] text-ink/65">{TODAYS_PAGE.date}</span>
            </p>
            <PersonSeal initial={me.initial} size={34} className="-rotate-6" title={`Written by ${me.first}`} />
          </header>

          <fieldset disabled={locked} className="mt-6 space-y-7 disabled:opacity-75">
            <legend className="sr-only">Fields to include in the leaf</legend>
            {TODAYS_PAGE.fields.map((f) => {
              const on = included[f.id];
              return (
                <div key={f.id} className={`transition-opacity duration-300 ${on ? "" : "opacity-80"}`}>
                  <CheckRow id={`inc-${f.id}`} checked={on} onChange={(v) => setIncluded((s) => ({ ...s, [f.id]: v }))}>
                    <span className="font-display text-[1.25rem] leading-tight text-ink">{f.prompt}</span>
                    {f.kind === "scale" || f.kind === "tags" ? (
                      <span className="ml-2 text-sm not-italic text-ink/65">{on ? "in the leaf" : "stays private"}</span>
                    ) : null}
                  </CheckRow>
                  {f.id === "mind" ? (
                    <>
                      <label htmlFor="mind-text" className="sr-only">
                        {f.prompt}
                      </label>
                      <textarea
                        id="mind-text"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        rows={6}
                        className="writing ruled mt-1 [field-sizing:content]"
                      />
                      {present.length ? (
                        <Cleanups
                          items={present}
                          accepted={accepted}
                          kept={kept}
                          onAccept={(id) => setAccepted((a) => [...a, id])}
                          onKeep={(id) => setKept((k) => [...k, id])}
                          onUndo={(id) => {
                            setAccepted((a) => a.filter((x) => x !== id));
                            setKept((k) => k.filter((x) => x !== id));
                          }}
                        />
                      ) : null}
                    </>
                  ) : f.kind === "tags" ? (
                    <p className="mt-1 flex flex-wrap gap-1.5 pl-8">
                      {f.value.split(" ").map((t) => (
                        <span key={t} className="rounded-sm bg-ink/[0.06] px-2 py-0.5 text-sm text-ink/75">
                          {t}
                        </span>
                      ))}
                    </p>
                  ) : (
                    <p className="ruled mt-1 pl-8 text-prose text-ink/85">{f.value}</p>
                  )}
                </div>
              );
            })}
          </fieldset>
        </article>
      </section>

      {/* The leaf, as others will see it */}
      <section aria-labelledby="preview-title" className="lg:sticky lg:top-24 lg:self-start">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="preview-title" className="font-display text-[1.75rem] leading-tight">
            The leaf
          </h2>
          <p className="text-sm text-ink/65">How visitors will see it</p>
        </div>

        <div className={`sheet relative overflow-hidden px-[clamp(1.1rem,4vw,1.75rem)] pt-6 transition-[padding] duration-500 ease-out ${locked ? "pb-24" : "pb-6"}`}>
          <div className="flex items-center gap-3">
            <PersonSeal initial="E" size={30} />
            <p className="text-sm leading-snug text-ink/65">
              <span className="block font-medium text-ink">{MY_COLOPHON.pen}</span>
              Thu 29 Oct{volume !== VOLUME_OPTIONS[0] ? ` · ${volume}` : ""}
            </p>
          </div>
          <h3 className="mt-5 font-display text-[1.9rem] leading-[1.05]">{title.trim() || "Untitled leaf"}</h3>
          {!anyField ? (
            <p className="mt-3 text-[0.9375rem] text-ink/65">Tick a field on your page to put words on this leaf.</p>
          ) : null}
          <div className="mt-3 space-y-4">
            {included.mind ? (
              <p className="text-[1.0625rem] leading-[1.7] text-ink/85">
                <Highlighted text={publicText} marks={locked ? [] : pending.map((c) => c.find)} />
              </p>
            ) : null}
            {included.finished ? (
              <p className="text-[1.0625rem] leading-[1.7] text-ink/85">
                <span className="font-display text-ink/70">{finished.prompt}: </span>
                {finished.value}
              </p>
            ) : null}
            {included.mood ? <Meta label="Mood">{TODAYS_PAGE.fields[2].value}</Meta> : null}
            {included.energy ? <Meta label="Energy">{TODAYS_PAGE.fields[3].value}</Meta> : null}
            {included.tags ? <Meta label="Tags">{TODAYS_PAGE.fields[4].value}</Meta> : null}
          </div>
          <AnimatePresence>
            {locked ? (
              <motion.span
                key="stamp"
                aria-hidden
                initial={{ opacity: 0, scale: reduce ? 1 : 1.5, rotate: reduce ? -8 : -18 }}
                animate={{ opacity: 1, scale: 1, rotate: -8 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: EASE }}
                className="absolute bottom-5 right-5"
              >
                <PersonSeal initial="E" size={52} />
              </motion.span>
            ) : null}
          </AnimatePresence>
        </div>

        <div className="mt-6 space-y-4">
          <fieldset disabled={locked} className="space-y-4 disabled:opacity-75">
            <legend className="sr-only">Leaf options</legend>
            <div>
              <label htmlFor="leaf-title" className="mb-1.5 block text-[0.9375rem] font-medium">
                Title
              </label>
              <input id="leaf-title" value={title} onChange={(e) => setTitle(e.target.value)} className="control" />
            </div>
            <div>
              <label htmlFor="leaf-volume" className="mb-1.5 block text-[0.9375rem] font-medium">
                Bind into a volume
              </label>
              <select id="leaf-volume" value={volume} onChange={(e) => setVolume(e.target.value)} className="control">
                {VOLUME_OPTIONS.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </div>
            <Switch
              checked={cooling}
              onChange={setCooling}
              label="Let it cool for 24 hours"
              hint="It goes up tomorrow at 9:40 pm. Until then, only you can see it."
            />
          </fieldset>

          <AnimatePresence mode="wait" initial={false}>
            {published ? (
              <motion.div
                key="done"
                role="status"
                initial={{ opacity: 0, y: reduce ? 0 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: EASE }}
                className="rule border-t pt-5"
              >
                <p className="font-display text-[1.5rem] leading-tight">
                  {published.cooling ? "Cooling until tomorrow, 9:40 pm." : "It’s on your colophon."}
                </p>
                <p className="mt-1.5 text-[0.9375rem] text-ink/70">
                  {published.cooling
                    ? "Sleep on it. If it still feels right tomorrow, it goes up on its own."
                    : "It can travel in Sunday Editions now. You can unpublish any time, but not from a letter already sent."}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button variant="secondary" onClick={() => onPublish(null)}>
                    {published.cooling ? "Take it back" : "Unpublish"}
                  </Button>
                  {published.cooling ? (
                    <Button variant="quiet" onClick={() => onPublish({ ...published, cooling: false })}>
                      Publish now instead
                    </Button>
                  ) : null}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="go"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: EASE }}
                className="rule border-t pt-5"
              >
                <Button size="lg" className="w-full" onClick={publish} disabled={!anyField}>
                  {cooling ? "Publish after it cools" : "Publish leaf"}
                </Button>
                <p className="mt-3 text-sm text-ink/65">
                  {pending.length
                    ? `${pending.length === 1 ? "One detail Kata marked is" : `${pending.length} details Kata marked are`} still as you wrote ${pending.length === 1 ? "it" : "them"}. `
                    : ""}
                  You can unpublish any time, but not from a Sunday letter that’s already gone out.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
}

function Cleanups({
  items,
  accepted,
  kept,
  onAccept,
  onKeep,
  onUndo,
}: {
  items: typeof CLEANUPS;
  accepted: string[];
  kept: string[];
  onAccept: (id: string) => void;
  onKeep: (id: string) => void;
  onUndo: (id: string) => void;
}) {
  return (
    <div className="mt-5 rounded-md bg-ink/[0.04] p-4 sm:p-5">
      <p className="text-[0.9375rem] text-ink/80">
        <span className="font-medium text-accent">Kata</span> · Before this leaves your notebook, these could say more than you mean:
      </p>
      <ul className="mt-3 space-y-2.5">
        {items.map((c) => {
          const done = accepted.includes(c.id);
          const left = kept.includes(c.id);
          return (
            <li key={c.id} className="rule flex flex-col gap-2 border-t pt-2.5 sm:flex-row sm:items-center sm:justify-between">
              <p className="min-w-0 text-[0.9375rem] leading-snug">
                {done ? (
                  <>
                    <span className="text-ink/65 line-through decoration-ink/40">{c.find}</span>
                    <span className="text-ink/65"> → </span>
                    <span className="font-medium">{c.replace}</span>
                  </>
                ) : (
                  <>
                    <span className={left ? "text-ink/70" : "font-medium underline decoration-accent decoration-dotted decoration-2 underline-offset-4"}>
                      {c.find}
                    </span>
                    <span className="block text-sm text-ink/65">{left ? "Kept as written" : c.why}</span>
                  </>
                )}
              </p>
              <div className="flex shrink-0 gap-2">
                {done || left ? (
                  <Button size="sm" variant="quiet" className="!h-11" onClick={() => onUndo(c.id)}>
                    Undo
                  </Button>
                ) : (
                  <>
                    <Button size="sm" variant="secondary" className="!h-11" onClick={() => onAccept(c.id)}>
                      Use “{c.replace}”
                    </Button>
                    <Button size="sm" variant="quiet" className="!h-11" onClick={() => onKeep(c.id)}>
                      Keep
                    </Button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Highlighted({ text, marks }: { text: string; marks: string[] }): ReactNode {
  if (!marks.length) return text;
  const re = new RegExp(`(${marks.map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "g");
  return text.split(re).map((part, i) =>
    marks.includes(part) ? (
      <mark key={i} className="bg-transparent text-ink underline decoration-accent decoration-dotted decoration-2 underline-offset-4">
        {part}
      </mark>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    )
  );
}

function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <p className="text-[0.9375rem] text-ink/75">
      <span className="text-ink/65">{label}: </span>
      {children}
    </p>
  );
}


"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useLayoutEffect, useRef, useState } from "react";
import { person, type Me } from "@/components/lab/cast";
import { PersonSeal } from "@/components/lab/PersonSeal";
import { Button } from "@/components/shared/Button";
import { Icon } from "@/components/shared/Icon";
import { EASE, ScreenIntro, Stamp } from "./bits";
import { crossesContinent, ME_CITY, MY_PAGES, NEXT_SUNDAY, RECIPIENTS, SEEDED_OUTGOING, STAMPS, SUNDAY, SUNDAY_AFTER } from "./data";

const EMAIL = "email";
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());

interface Outgoing {
  id: string;
  to: string;
  email?: string;
  body: string;
  quotes: string[];
}

function route(to: string | null, email: string) {
  if (!to) return null;
  if (to === EMAIL) {
    return { name: isEmail(email) ? email.trim() : "someone new", city: null as string | null, transit: false, arrives: NEXT_SUNDAY };
  }
  const p = person(to);
  const transit = crossesContinent(p.city);
  return { name: p.first, city: p.city, transit, arrives: transit ? SUNDAY_AFTER : NEXT_SUNDAY };
}

export function SlowMailScreen({ me, to, setTo }: { me: Me; to: string | null; setTo: (id: string | null) => void }) {
  const reduce = useReducedMotion();
  const [email, setEmail] = useState("");
  const [body, setBody] = useState("");
  const [quotes, setQuotes] = useState<string[]>([]);
  const [drawer, setDrawer] = useState(false);
  const [outgoing, setOutgoing] = useState<Outgoing[]>([{ ...SEEDED_OUTGOING, quotes: [] }]);
  const [note, setNote] = useState("");
  const area = useRef<HTMLTextAreaElement>(null);

  const r = route(to, email);
  const stamps = STAMPS - outgoing.length;
  const ready = Boolean(r) && body.trim().length > 0 && (to !== EMAIL || isEmail(email)) && stamps > 0;

  // Grow the sheet with the letter.
  useLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [body]);

  function seal() {
    if (!ready || !to) return;
    setOutgoing((o) => [{ id: `out-${Date.now()}`, to, email: to === EMAIL ? email.trim() : undefined, body: body.trim(), quotes }, ...o]);
    setNote(`Sealed until Sunday. It reaches ${r?.name} on ${r?.arrives}.`);
    setBody("");
    setQuotes([]);
    setDrawer(false);
    setTo(null);
    setEmail("");
  }

  function edit(item: Outgoing) {
    setOutgoing((o) => o.filter((x) => x.id !== item.id));
    setTo(item.to);
    setEmail(item.email ?? "");
    setBody(item.body);
    setQuotes(item.quotes);
    setNote("Back on your sheet. Seal it again when it’s ready.");
    requestAnimationFrame(() => area.current?.focus());
  }

  function burn(item: Outgoing) {
    setOutgoing((o) => o.filter((x) => x.id !== item.id));
    setNote("Burned. Nothing was sent, and the stamp is yours again.");
  }

  return (
    <div>
      <ScreenIntro
        title="Slow mail"
        lede="A real letter to a friend, or to anyone with an email address. It waits, sealed, and arrives on Sunday morning."
      />

      <div className="mt-8 grid grid-cols-1 gap-y-9 lg:grid-cols-12 lg:gap-x-10">
        {/* Who it’s for: a swipe strip on phones, a grid beside the sheet on desktop */}
          <fieldset className="min-w-0 lg:col-span-5 lg:col-start-8 lg:row-start-1">
            <legend className="font-medium">Who it’s for</legend>
            <div className="no-scrollbar -mx-margin mt-2 flex snap-x scroll-px-margin gap-2 overflow-x-auto px-margin py-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0">
              {[...RECIPIENTS, EMAIL].map((id) => {
                const p = id === EMAIL ? null : person(id);
                return (
                  <label key={id} className="relative w-[8.75rem] shrink-0 cursor-pointer snap-start sm:w-auto">
                    <input type="radio" name="slow-to" value={id} checked={to === id} onChange={() => setTo(id)} className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed" />
                    <span className="flex min-h-14 items-center gap-3 rounded-md border border-ink/15 px-3 py-2 transition-colors duration-300 hover:border-ink/40 peer-checked:border-ink peer-checked:bg-ink/[0.05] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent">
                      {p ? (
                        <PersonSeal initial={p.initial} size={30} state={to === id ? "inked" : "resting"} />
                      ) : (
                        <span className="grid h-[30px] w-[30px] place-items-center text-ink/65">
                          <Icon name="letter" className="h-5 w-5" />
                        </span>
                      )}
                      <span className="min-w-0 leading-tight">
                        <span className="block truncate text-[0.9375rem] font-medium">{p ? p.first : "By email"}</span>
                        <span className="block truncate text-sm text-ink/65">{p ? p.city : "Anyone at all"}</span>
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
            {to === EMAIL ? (
              <div className="mt-4">
                <label htmlFor="slow-email" className="mb-2 block text-[0.9375rem] font-medium text-ink/85">
                  Their email address
                </label>
                <input
                  id="slow-email"
                  type="email"
                  inputMode="email"
                  autoComplete="off"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="friend@example.com"
                  aria-describedby="slow-email-hint"
                  className="control"
                />
                <p id="slow-email-hint" className="mt-2 text-sm text-ink/65">
                  They get it on Sunday morning, with one button: write back.
                </p>
              </div>
            ) : null}
          </fieldset>

        {/* The sheet */}
        <div className="min-w-0 lg:col-span-7 lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <article aria-label="Letter sheet" className="sheet relative px-[clamp(1.25rem,4.5vw,3rem)] pb-9 pt-8">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm text-ink/65">{ME_CITY} · {SUNDAY}</p>
                <p className="mt-3 truncate font-display text-[clamp(1.9rem,1.5rem+1.5vw,2.6rem)] leading-tight">
                  Dear {r ? r.name : <span className="text-ink/55">…</span>},
                </p>
              </div>
              <span className="relative grid h-14 w-12 shrink-0 place-items-center">
                <span aria-hidden className="absolute inset-0 rounded-[2px] border border-dashed border-ink/25" />
                <AnimatePresence>
                  {r ? (
                    <motion.span
                      key={to}
                      className="relative"
                      initial={{ opacity: 0, y: -14, rotate: -12 }}
                      animate={{ opacity: 1, y: 0, rotate: 4 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: reduce ? 0 : 0.5, ease: EASE }}
                    >
                      <Stamp motif="pot" />
                    </motion.span>
                  ) : null}
                </AnimatePresence>
              </span>
            </div>

            <AnimatePresence initial={false}>
              {quotes.map((id) => {
                const q = MY_PAGES.find((x) => x.id === id)!;
                return (
                  <motion.figure
                    key={id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: reduce ? 0 : 0.4, ease: EASE }}
                    className="mt-5 flex items-start gap-2 border-l-2 border-ink/25 pl-4"
                  >
                    <div className="min-w-0 flex-1">
                      <blockquote className="text-[1.125rem] leading-[1.6] text-ink/85">{q.text}</blockquote>
                      <figcaption className="mt-1 text-sm text-ink/65">From my page, {q.date}</figcaption>
                    </div>
                    <button
                      type="button"
                      onClick={() => setQuotes((qs) => qs.filter((x) => x !== id))}
                      aria-label="Remove this quote"
                      className="-mr-2 grid h-11 w-11 shrink-0 place-items-center rounded-md text-ink/65 hover:bg-ink/[0.05] hover:text-ink"
                    >
                      <Icon name="close" className="h-4 w-4" />
                    </button>
                  </motion.figure>
                );
              })}
            </AnimatePresence>

            <label htmlFor="slow-body" className="sr-only">
              Your letter
            </label>
            <textarea
              id="slow-body"
              ref={area}
              rows={8}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write it the way you would by hand. Nobody sees it until Sunday."
              className="writing ruled mt-5 min-h-[17rem]"
            />

            <div className="mt-6 flex items-end justify-between gap-4">
              <p className="font-display text-[1.75rem] leading-none">— {me.first}</p>
              <PersonSeal initial={me.initial} size={40} state="blank" />
            </div>
          </article>

          <div className="mt-4">
            <Button variant="secondary" aria-expanded={drawer} aria-controls="quote-drawer" onClick={() => setDrawer((d) => !d)}>
              <Icon name="page" className="h-4 w-4" />
              Quote from my pages
            </Button>
            <AnimatePresence initial={false}>
              {drawer ? (
                <motion.div
                  key="drawer"
                  id="quote-drawer"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: reduce ? 0 : 0.35, ease: EASE }}
                  className="rule mt-3 rounded-xs border bg-surface"
                >
                  <p className="rule border-b px-4 py-3 text-sm text-ink/65">Lines from your own pages. Only what you pick goes in the letter.</p>
                  <ul className="divide-y divide-ink/10">
                    {MY_PAGES.map((q) => {
                      const used = quotes.includes(q.id);
                      return (
                        <li key={q.id}>
                          <button
                            type="button"
                            disabled={used}
                            onClick={() => setQuotes((qs) => [...qs, q.id])}
                            className="flex min-h-14 w-full items-start justify-between gap-4 px-4 py-3 text-left transition-colors duration-300 hover:bg-ink/[0.03] disabled:cursor-default"
                          >
                            <span className="min-w-0">
                              <span className="block text-sm text-ink/65">{q.date}</span>
                              <span className="mt-0.5 block text-[1.0625rem] leading-[1.5] text-ink/90">{q.text}</span>
                            </span>
                            <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 text-sm font-medium text-ink/80">
                              {used ? <Icon name="check" className="h-4 w-4" /> : <Icon name="plus" className="h-4 w-4" />}
                              {used ? "Quoted" : "Quote"}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

        </div>

        {/* When it lands, and what it costs */}
        <div className="space-y-9 self-start lg:col-span-5 lg:col-start-8 lg:row-span-2 lg:row-start-2">
          <section aria-labelledby="route-title">
            <h3 id="route-title" className="font-medium">
              Postmark
            </h3>
            {r ? (
              <>
                <p className="mt-2 font-display text-[clamp(1.75rem,1.5rem+1vw,2.25rem)] leading-tight">Arrives {r.arrives}</p>
                <ol className="mt-4 space-y-0">
                  <RouteStep first label={ME_CITY} detail={`Sealed until Saturday midnight, postmarked ${NEXT_SUNDAY}`} />
                  {r.transit ? <RouteStep dashed label="In transit" detail={`${r.city} is on another continent, so it waits one more Sunday on the way`} /> : null}
                  <RouteStep last label={r.city ?? "Their inbox"} detail={r.city ? `Arrives ${r.arrives}, beside Kata’s letter` : `Arrives by email at 8:00 on ${NEXT_SUNDAY}`} />
                </ol>
              </>
            ) : (
              <p className="mt-2 text-ink/70">Choose who it’s for to see when it lands.</p>
            )}
          </section>

          <section aria-labelledby="stamps-title">
            <h3 id="stamps-title" className="font-medium">
              Stamps
            </h3>
            <p className="mt-1 text-sm text-ink/65">
              You earn one for every day you write. You have {stamps}; a letter uses one.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {Array.from({ length: stamps }, (_, i) => (
                <Stamp key={i} motif="pot" w={32} h={40} on="ground" className={i === 0 && r ? "opacity-40" : ""} />
              ))}
            </div>
          </section>
        </div>

        <div className="lg:col-span-7 lg:col-start-1 lg:row-start-3">
          <div className="rule flex flex-wrap items-center gap-x-5 gap-y-3 border-t pt-7">
            <Button size="lg" onClick={seal} disabled={!ready}>
              Seal until Sunday
            </Button>
            <p className="text-sm text-ink/65">
              {!r
                ? "Choose who it’s for first."
                : to === EMAIL && !isEmail(email)
                  ? "Add their email address."
                  : !body.trim()
                    ? "Write a line or two first."
                    : "You can still edit or burn it until Saturday at midnight."}
            </p>
          </div>
          <p aria-live="polite" className="mt-3 min-h-6 text-[0.9375rem] text-ink">
            {note}
          </p>
        </div>
      </div>

      <section aria-labelledby="outgoing-title" className="rule mt-14 border-t pt-10">
        <h3 id="outgoing-title" className="font-display text-[clamp(1.75rem,1.5rem+1vw,2.25rem)] leading-none">
          Outgoing
        </h3>
        <p className="mt-2 text-ink/70">Sealed until Sunday. Edit or burn anything here until Saturday at midnight.</p>
        <ul className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <AnimatePresence initial={false}>
            {outgoing.map((o) => {
              const rr = route(o.to, o.email ?? "");
              const p = o.to === EMAIL ? null : person(o.to);
              return (
                <motion.li
                  key={o.id}
                  layout={!reduce}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: reduce ? 0 : 0.45, ease: EASE }}
                  className="sheet flex flex-col p-5 sm:p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      {p ? <PersonSeal initial={p.initial} size={36} state="resting" /> : <Icon name="letter" className="h-6 w-6 text-ink/65" />}
                      <div className="min-w-0">
                        <p className="truncate font-medium">To {rr?.name}</p>
                        <p className="text-sm text-ink/65">Arrives {rr?.arrives}</p>
                      </div>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-2 text-sm text-ink/65">
                      <PersonSeal initial={me.initial} size={24} className="-rotate-6" />
                      Sealed
                    </span>
                  </div>
                  <p className="mt-4 line-clamp-2 text-[1.0625rem] leading-[1.6] text-ink/80">{o.body}</p>
                  <div className="mt-5 flex gap-2">
                    <Button variant="secondary" onClick={() => edit(o)}>
                      Edit
                    </Button>
                    <Button variant="danger" onClick={() => burn(o)}>
                      Burn it
                    </Button>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
        {outgoing.length === 0 ? (
          <p className="mt-6 rounded-xs border border-dashed border-ink/20 p-6 text-ink/70">Nothing waiting. Letters you seal rest here until Sunday morning.</p>
        ) : null}
      </section>
    </div>
  );
}

function RouteStep({ label, detail, first, last, dashed }: { label: string; detail: string; first?: boolean; last?: boolean; dashed?: boolean }) {
  return (
    <li className="relative flex gap-4 pb-5 last:pb-0">
      <span aria-hidden className="relative flex w-3 shrink-0 justify-center">
        {!first ? <span className="absolute top-0 h-2 border-l border-dashed border-ink/35" /> : null}
        <span
          className={`relative mt-[0.35rem] h-3 w-3 rounded-full border-[1.5px] ${ dashed ? "border-dashed border-ink/50 bg-transparent" : last ? "border-ink bg-surface" : "border-ink/70 bg-ink/70"
          }`}
        />
        {!last ? <span className="absolute bottom-0 top-[1.15rem] border-l border-dashed border-ink/35" /> : null}
      </span>
      <span className="min-w-0">
        <span className="block font-medium">{label}</span>
        <span className="block text-sm text-ink/65">{detail}</span>
      </span>
    </li>
  );
}

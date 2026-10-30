"use client";

import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/shared/Icon";
import { Seal } from "@/components/shared/Seal";
import type { ReactionKind } from "@/lib/types";
import {
  FOLLOW_UP,
  KIND_LABEL,
  MOMENTS,
  MOOD_ASK,
  MOOD_REPLY,
  MOODS,
  NEXT_CHECK,
  NEXT_REPLY,
  OPENING,
  PEOPLE,
  QUESTIONS,
  REACTIONS,
  STATUS_LABEL,
  THREADS,
  WORKING_ON,
  type Line,
  type LookId,
} from "./data";

interface HomeProps {
  look: LookId;
  first: string;
  date: string;
}

type Said = Line & { answer?: string };

/** Kata's side of the conversation, scripted for the preview. */
function useConversation(first: string) {
  const [lines, setLines] = useState<Said[]>(() => {
    const [hi, webhook] = OPENING(first);
    return [hi, MOOD_ASK, webhook];
  });
  const [typing, setTyping] = useState(false);
  const timers = useRef<number[]>([]);
  const n = useRef(0);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((t) => window.clearTimeout(t));
  }, []);

  function kataSays(next: Line[]) {
    let delay = 0;
    next.forEach((line, i) => {
      delay += i === 0 ? 650 : 900;
      timers.current.push(window.setTimeout(() => setTyping(true), delay - 500));
      timers.current.push(
        window.setTimeout(() => {
          setTyping(false);
          setLines((ls) => [...ls, line]);
        }, delay)
      );
    });
  }

  function answer(id: string, value: string, label: string) {
    setLines((ls) => [...ls.map((l) => (l.id === id ? { ...l, answer: value } : l)), { id: `you-${id}`, from: "you", text: label }]);
    if (id === "webhook") kataSays([{ id: "webhook-r", from: "kata", text: FOLLOW_UP[value] }, NEXT_CHECK]);
    else if (id === "jobs") kataSays([{ id: "jobs-r", from: "kata", text: NEXT_REPLY[value] }]);
    else if (id === "mood") kataSays([{ id: "mood-r", from: "kata", text: MOOD_REPLY[Number(value)] }]);
  }

  function say(text: string) {
    const id = ++n.current;
    setLines((ls) => [...ls, { id: `you-free-${id}`, from: "you", text }]);
    kataSays([{ id: `kata-free-${id}`, from: "kata", text: "Got it. I’ll keep that on your map and ask how it went tomorrow." }]);
  }

  return { lines, typing, answer, say };
}

function KataMark({ size = 34, cut = "surface" }: { size?: number; cut?: "surface" | "ground" }) {
  return <Seal size={size} style={{ ["--seal-cut" as string]: `var(--lk-${cut})` }} />;
}

function Avatar({ hue, name, size = 40 }: { hue: number; name: string; size?: number }) {
  return (
    <span className="lk-avatar" data-hue={hue} style={{ width: size, height: size, fontSize: size * 0.42 }} aria-hidden>
      {name[0]}
    </span>
  );
}

function Name({ look, children }: { look: LookId; children: ReactNode }) {
  if (look === "sticker") return <span className="lk-mark">{children}</span>;
  if (look === "night") return <span style={{ color: "var(--lk-signal)" }}>{children}</span>;
  return <em style={{ fontStyle: "italic", fontVariationSettings: '"SOFT" 100, "WONK" 1, "opsz" 144' }}>{children}</em>;
}

function Companion({ first, compact = false }: { first: string; compact?: boolean }) {
  const { lines, typing, answer, say } = useConversation(first);
  const [draft, setDraft] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    say(text);
    setDraft("");
  }

  return (
    <section aria-label="Kata" className={`lk-card ${compact ? "p-4" : "p-6"}`}>
      <header className="flex items-center gap-3">
        <KataMark size={compact ? 32 : 38} />
        <div className="min-w-0">
          <p className="font-semibold leading-tight">Kata</p>
          <p className="lk-muted text-[13px]">Checks in every morning</p>
        </div>
        {compact ? null : <p className="lk-mono lk-muted ml-auto shrink-0 text-[12px]">2 check-ins · 1 stuck</p>}
      </header>

      <ol className="mt-5 space-y-3.5" aria-live="polite">
        {lines.map((l) =>
          l.from === "kata" ? (
            <li key={l.id} className="lk-in flex flex-col items-start gap-2.5">
              <p className="lk-kata lk-voice max-w-[36ch] px-4 py-3">{l.text}</p>
              {l.replies ? (
                <div className="flex flex-wrap gap-2">
                  {l.replies.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      className="lk-chip"
                      aria-pressed={l.answer === r.value}
                      disabled={Boolean(l.answer) && l.answer !== r.value}
                      onClick={() => !l.answer && answer(l.id, r.value, r.label)}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              ) : null}
              {l.mood ? (
                <div className="lk-scale" role="group" aria-label="Mood">
                  {MOODS.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      className="lk-scale-step"
                      aria-pressed={l.answer === String(m.value)}
                      disabled={Boolean(l.answer) && l.answer !== String(m.value)}
                      onClick={() => !l.answer && answer(l.id, String(m.value), m.label)}
                    >
                      <MoodDots value={m.value} />
                      {m.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </li>
          ) : (
            <li key={l.id} className="lk-in flex justify-end">
              <p className="lk-you max-w-[30ch] px-4 py-2.5 font-medium">{l.text}</p>
            </li>
          )
        )}
        {typing ? (
          <li className="flex">
            <span className="lk-kata px-4 py-3.5">
              <span className="lk-typing" role="status" aria-label="Kata is typing">
                <i />
                <i />
                <i />
              </span>
            </span>
          </li>
        ) : null}
      </ol>

      <form onSubmit={onSubmit} className="mt-5 flex items-center gap-2">
        <label htmlFor={`say-${compact ? "p" : "d"}`} className="sr-only">
          Tell Kata anything
        </label>
        <input
          id={`say-${compact ? "p" : "d"}`}
          className="lk-input"
          placeholder="Tell Kata what’s on your mind"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          autoComplete="off"
        />
        <button type="submit" className="lk-btn lk-btn-primary h-[46px] w-[46px] shrink-0 !px-0" aria-label="Send">
          <Icon name="send" className="h-5 w-5" />
        </button>
      </form>
    </section>
  );
}

/** Five steps drawn as dots, so moods don't lean on emoji. */
function MoodDots({ value }: { value: number }) {
  return (
    <span aria-hidden className="inline-flex gap-[3px]">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className="h-[5px] w-[5px] rounded-full bg-current" style={{ opacity: i <= value ? 1 : 0.22 }} />
      ))}
    </span>
  );
}

function ThreadMap({ look, selected, onSelect }: { look: LookId; selected: string; onSelect: (id: string) => void }) {
  return (
    <div className="lk-map">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        {look === "night"
          ? [17, 31, 45].map((r) => <ellipse key={r} cx="50" cy="50" rx={r} ry={r} className="lk-orbit" />)
          : null}
        {look !== "daylight"
          ? THREADS.map((t) => <line key={t.id} x1="50" y1="50" x2={t.x} y2={t.y} className="lk-link" />)
          : null}
      </svg>
      <span className="lk-me" aria-hidden>
        You
      </span>
      {THREADS.map((t) => (
        <button
          key={t.id}
          type="button"
          className="lk-node"
          data-hue={t.hue}
          data-weight={t.weight}
          aria-pressed={selected === t.id}
          onClick={() => onSelect(t.id)}
          style={{ "--x": `${t.x}%`, "--y": `${t.y}%`, "--tilt": `${t.tilt}deg` } as CSSProperties}
        >
          {look === "night" ? <span className="lk-node-dot" aria-hidden /> : null}
          <span className="lk-node-title">{t.title}</span>
          {look === "night" ? (
            <span className="lk-node-meta">
              {STATUS_LABEL[t.status]} · {t.short}
            </span>
          ) : t.weight > 1 ? (
            <span className="lk-node-meta">{t.short}</span>
          ) : null}
          {look === "night" ? null : <span className="sr-only">, {STATUS_LABEL[t.status]}</span>}
        </button>
      ))}
    </div>
  );
}

function ThreadDetail({ id }: { id: string }) {
  const t = THREADS.find((x) => x.id === id)!;
  const [asked, setAsked] = useState(true);
  const [shared, setShared] = useState(false);
  return (
    <div key={t.id} className="lk-well lk-in p-4" data-hue={t.hue}>
      <div className="flex items-start justify-between gap-3">
        <p className="lk-display text-[1.6rem]">{t.title}</p>
        <span className="lk-status mt-1 inline-flex shrink-0 items-center gap-1.5 text-[13px]" data-status={t.status}>
          <span className="lk-pip" />
          {STATUS_LABEL[t.status]}
        </span>
      </div>
      <p className="lk-muted mt-1.5 text-[13px]">
        {KIND_LABEL[t.kind]} · {t.meta}
      </p>
      <p className="mt-3">{t.note}</p>
      <p className="mt-1.5 text-[14px]">
        <span className="lk-muted">Next: </span>
        {t.next}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="lk-chip" aria-pressed={asked} onClick={() => setAsked((v) => !v)}>
          {asked ? <Icon name="check" className="h-4 w-4" /> : null}
          Ask me about it
        </button>
        <button type="button" className="lk-chip" aria-pressed={shared} onClick={() => setShared((v) => !v)}>
          {shared ? <Icon name="check" className="h-4 w-4" /> : null}
          Show on my profile
        </button>
      </div>
    </div>
  );
}

function MindCard({ look, compact = false }: { look: LookId; compact?: boolean }) {
  const [selected, setSelected] = useState("webhook");
  return (
    <section aria-labelledby={`mind-${compact ? "p" : "d"}`} className={`lk-card ${compact ? "p-4" : "p-6"}`}>
      <header className="flex items-end justify-between gap-4">
        <div>
          <h2 id={`mind-${compact ? "p" : "d"}`} className="lk-display text-[2rem]">
            On your mind
          </h2>
          <p className="lk-muted mt-1.5 text-[14px]">What Kata is keeping track of for you.</p>
        </div>
        <span className="lk-mono lk-muted shrink-0 text-[12px]">6 threads</span>
      </header>
      <div className={compact ? "-mx-1 mt-4" : "mt-5"}>
        <ThreadMap look={look} selected={selected} onSelect={setSelected} />
      </div>
      <div className="mt-4">
        <ThreadDetail key={selected} id={selected} />
      </div>
    </section>
  );
}

function Questions({ look, columns = false }: { look: LookId; columns?: boolean }) {
  return (
    <section aria-label="Today Kata asks" className="lk-card p-6">
      <h2 className="lk-display text-[2rem]">Today Kata asks</h2>
      <p className="lk-muted mt-1.5 text-[14px]">Three questions for today’s page, picked from what’s on your mind.</p>
      <ul className={`mt-6 grid gap-4 ${columns ? "grid-cols-3" : "grid-cols-1"}`}>
        {QUESTIONS.map((q) => (
          <li key={q.id} data-hue={q.hue} className="lk-q relative">
            {look === "sticker" ? <span className="lk-tape" aria-hidden /> : null}
            <span className="lk-tag">#{q.tag}</span>
            <p className="lk-voice lk-q-text mt-3">{q.text}</p>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="lk-muted text-[13px]">Answers are filed under their tags.</p>
        <button type="button" className="lk-btn lk-btn-primary">
          Write today’s page
          <Icon name="arrow" className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}

function Reactions({ id, counts }: { id: string; counts: Record<ReactionKind, number> }) {
  const [given, setGiven] = useState<ReactionKind[]>([]);
  return (
    <div className="lk-scale lk-scale-4 mt-3" role="group" aria-label="React">
      {REACTIONS.map((r) => {
        const on = given.includes(r.kind);
        const count = counts[r.kind] + (on ? 1 : 0);
        return (
          <button
            key={`${id}-${r.kind}`}
            type="button"
            className="lk-scale-step lk-scale-step-row"
            aria-pressed={on}
            onClick={() => setGiven((g) => (on ? g.filter((k) => k !== r.kind) : [...g, r.kind]))}
          >
            {r.label}
            {count ? <span className="tabular-nums opacity-65">{count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

function MomentItem({ m }: { m: (typeof MOMENTS)[number] }) {
  const p = PEOPLE[m.who];
  return (
    <>
      <div className="flex items-start gap-3">
        <Avatar hue={p.hue} name={p.name} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-tight">{p.name}</p>
          <p className="lk-muted truncate text-[13px]">
            {m.kind} · {m.when}
          </p>
        </div>
        <span className="lk-tag shrink-0" data-hue={p.hue}>
          #{m.tag}
        </span>
      </div>
      <p className="mt-3 text-[15.5px] leading-snug">{m.text}</p>
      <Reactions id={m.id} counts={m.reactions} />
    </>
  );
}

function People({ grid = false, compact = false }: { grid?: boolean; compact?: boolean }) {
  return (
    <section aria-label="Your people" className={`lk-card ${compact ? "p-4" : "p-6"}`}>
      <header className="flex items-end justify-between gap-4">
        <div>
          <h2 className="lk-display text-[2rem]">Your people</h2>
          <p className="lk-muted mt-1.5 text-[14px]">What the people you follow chose to share.</p>
        </div>
        <button type="button" className="min-h-11 shrink-0 text-[14px] font-semibold underline-offset-4 hover:underline">
          See everyone
        </button>
      </header>
      {grid ? (
        <ul className="mt-6 grid grid-cols-3 gap-4">
          {MOMENTS.map((m) => (
            <li key={m.id} className="lk-well p-4">
              <MomentItem m={m} />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="mt-2">
          {MOMENTS.map((m) => (
            <li key={m.id} className="border-t py-4 first:border-t-0" style={{ borderColor: "var(--lk-line)" }}>
              <MomentItem m={m} />
            </li>
          ))}
        </ul>
      )}
      {compact ? (
        <div className="border-t pt-4" style={{ borderColor: "var(--lk-line)" }}>
          <p className="lk-muted text-[13px]">Working on</p>
          <WorkingList />
        </div>
      ) : null}
    </section>
  );
}

function WorkingList() {
  return (
    <ul className="mt-2">
      {WORKING_ON.map((w) => {
        const p = PEOPLE[w.who];
        return (
          <li key={w.who} className="flex min-h-12 items-center gap-3 border-t py-2 first:border-t-0" style={{ borderColor: "var(--lk-line)" }}>
            <Avatar hue={p.hue} name={p.name} size={32} />
            <p className="min-w-0 flex-1 truncate">
              <span className="font-semibold">{p.name.split(" ")[0]}</span>
              <span className="lk-muted"> · </span>
              {w.title}
            </p>
            <span className="lk-status inline-flex shrink-0 items-center gap-1.5 text-[13px]" data-status={w.status}>
              <span className="lk-pip" aria-hidden />
              {STATUS_LABEL[w.status]}
            </span>
            <span className="lk-muted w-7 shrink-0 text-right text-[13px] tabular-nums">{w.when}</span>
          </li>
        );
      })}
    </ul>
  );
}

function Working() {
  return (
    <section aria-label="Working on" className="lk-card p-6">
      <h2 className="lk-display text-[1.6rem]">Working on</h2>
      <p className="lk-muted mt-1.5 text-[14px]">Threads your people chose to show.</p>
      <div className="mt-3">
        <WorkingList />
      </div>
    </section>
  );
}

const NAV: { label: string; icon: IconName }[] = [
  { label: "Home", icon: "home" },
  { label: "People", icon: "people" },
  { label: "Threads", icon: "threads" },
  { label: "Pages", icon: "history" },
  { label: "Letters", icon: "letter" },
];

export function HomeDesktop({ look, first, date }: HomeProps) {
  return (
    <div className="grid min-h-[960px] grid-cols-[252px_minmax(0,1fr)]">
      <aside className="flex flex-col gap-7 border-r px-5 py-7" style={{ borderColor: "var(--lk-line)" }}>
        <div className="flex items-center gap-2.5 px-1">
          <KataMark size={30} cut="ground" />
          <span className="lk-display text-[1.85rem]">Kata</span>
        </div>
        <nav aria-label="Main" className="grid gap-1">
          {NAV.map((n, i) => (
            <a key={n.label} href="#" className="lk-nav-item" aria-current={i === 0 ? "page" : undefined} onClick={(e) => e.preventDefault()}>
              <Icon name={n.icon} className="h-[1.2rem] w-[1.2rem]" />
              {n.label}
            </a>
          ))}
        </nav>
        <button type="button" className="lk-btn lk-btn-primary w-full">
          <Icon name="pen" className="h-4 w-4" />
          Write today’s page
        </button>
        <div className="mt-auto flex items-center gap-3 px-1">
          <Avatar hue={2} name={first || "You"} size={38} />
          <div className="min-w-0">
            <p className="truncate font-semibold leading-tight">{first || "You"}</p>
            <p className="lk-muted text-[13px]">@{(first || "you").toLowerCase()}</p>
          </div>
        </div>
      </aside>

      <main className="px-10 pb-14 pt-9">
        <header className="flex items-end justify-between gap-6">
          <div>
            <p className="lk-muted text-[14px] font-medium">{date}</p>
            <h1 className="lk-display mt-2 text-[4.4rem]">
              Good morning{first ? (
                <>
                  , <Name look={look}>{first}</Name>
                </>
              ) : null}
              .
            </h1>
          </div>
          <div className="flex items-center gap-2 pb-2">
            <button type="button" className="lk-chip !px-0 h-11 w-11 justify-center" aria-label="Search">
              <Icon name="search" className="h-5 w-5" />
            </button>
            <button type="button" className="lk-chip relative !px-0 h-11 w-11 justify-center" aria-label="Notifications, 3 new">
              <Icon name="bell" className="h-5 w-5" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full" style={{ background: "var(--lk-accent)" }} />
            </button>
          </div>
        </header>
        <div className="mt-9 grid grid-cols-12 gap-6">
          <div className="col-span-7 grid content-start gap-6">
            <Companion first={first} />
            <Questions look={look} columns />
          </div>
          <div className="col-span-5 grid content-start gap-6">
            <MindCard look={look} />
            <Working />
          </div>
          <div className="col-span-12">
            <People grid />
          </div>
        </div>
      </main>
    </div>
  );
}

const TABS: { label: string; icon: IconName }[] = [
  { label: "Home", icon: "home" },
  { label: "People", icon: "people" },
  { label: "Write", icon: "plus" },
  { label: "Threads", icon: "threads" },
  { label: "You", icon: "user" },
];

export function HomePhone({ look, first, date }: HomeProps) {
  return (
    <div className="relative flex min-h-full flex-col">
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-4 pb-2 pt-3"
        style={{ background: "color-mix(in srgb, var(--lk-ground) 88%, transparent)", backdropFilter: "blur(12px)" }}
      >
        <div className="flex items-center gap-2">
          <KataMark size={26} cut="ground" />
          <span className="lk-display text-[1.5rem]">Kata</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button type="button" className="lk-chip relative !px-0 h-10 w-10 justify-center" aria-label="Notifications, 3 new">
            <Icon name="bell" className="h-[1.15rem] w-[1.15rem]" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full" style={{ background: "var(--lk-accent)" }} />
          </button>
          <Avatar hue={2} name={first || "You"} size={38} />
        </div>
      </header>

      <main className="grid gap-5 px-4 pb-6 pt-3">
        <div>
          <p className="lk-muted text-[13px] font-medium">{date}</p>
          <h1 className="lk-display mt-1.5 text-[3rem]">
            Good morning{first ? (
              <>
                , <Name look={look}>{first}</Name>
              </>
            ) : null}
            .
          </h1>
        </div>
        <Companion first={first} compact />
        <MindCard look={look} compact />
        <Questions look={look} />
        <People compact />
      </main>

      <nav aria-label="Main" className="lk-tabbar sticky bottom-0 z-10 mt-auto grid grid-cols-5 px-1.5 pb-5 pt-1">
        {TABS.map((t, i) =>
          t.label === "Write" ? (
            <button key={t.label} type="button" className="grid place-items-center" aria-label="Write today’s page">
              <span className="lk-btn lk-btn-primary h-12 w-12 !px-0">
                <Icon name="plus" className="h-6 w-6" strokeWidth={2} />
              </span>
            </button>
          ) : (
            <button key={t.label} type="button" className="lk-tab" aria-current={i === 0 ? "page" : undefined}>
              <Icon name={t.icon} className="h-[1.3rem] w-[1.3rem]" />
              {t.label}
            </button>
          )
        )}
      </nav>
    </div>
  );
}

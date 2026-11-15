"use client";

import { useEffect, useId, useReducer, useRef, useState, type FormEvent, type RefObject } from "react";
import { Avatar } from "@/components/shared/Avatar";
import { Button } from "@/components/shared/Button";
import { useCompanion } from "@/components/shared/Companion";
import { Icon } from "@/components/shared/Icon";
import { KIND_LABEL, Status } from "@/components/shared/Status";
import { useToast } from "@/components/shared/Toast";
import { ThreadSteps } from "@/components/maru/ThreadSteps";
import { stepSaid } from "@/lib/companion/steps";
import type { ReactionKind, ThreadKind, ThreadStatus } from "@/lib/types";
import { CheerRow, Confirm, Dot, Faces, LineForm, NotHere, PeoplePicker, Private, TryBar, TryButton, ViewingAs, WhoSees, cheersLine, forSteps, someOf } from "./bits";
import { ALL_THREADS, ME, MY_THREADS, agoLabel, count, listOf, metaOf, verb, whoOf as lookup, withStep, type Cheers, type DemoThread, type Who } from "./data";

/*
 * Version three: no spaces at all. One thread is shared with the people you pick, and they add
 * their own updates and comments to it. You still set where it stands, and its notes from before
 * stay yours. Each thread is shared on its own, so sharing one says nothing about the rest.
 */

interface Comment {
  id: string;
  by: string;
  text: string;
  ago: number;
}

type Entry =
  | { id: string; kind: "update"; by: string; text: string; status: ThreadStatus | null; ago: number; cheers: Cheers; comments: Comment[] }
  | { id: string; kind: "note"; by: string; what: "shared" | "unshared" | "stopped" | "left"; people: string[]; ago: number };

type Update = Extract<Entry, { kind: "update" }>;

interface Shared extends DemoThread {
  with: string[];
  log: Entry[];
  played: number;
}

interface State {
  threads: Shared[];
  n: number;
  left: { title: string; owner: string } | null;
}

type Action =
  | { type: "share"; thread: string; people: string[] }
  | { type: "unshare"; thread: string; person: string }
  | { type: "stop"; thread: string }
  | { type: "leave"; thread: string }
  | { type: "post"; thread: string; text: string; status: ThreadStatus | null }
  | { type: "comment"; thread: string; entry: string; text: string }
  | { type: "cheer"; thread: string; entry: string; kind: ReactionKind }
  | { type: "make"; id: string; title: string; kind: ThreadKind; people: string[] }
  | { type: "play"; thread: string };

const H = 60;
const D = 24 * H;

/** What the others add next, one tap at a time. Without a name, it's whoever's turn it is. */
type Line = { by?: string; kind: "update" | "comment"; text: string; status?: ThreadStatus };

const LINES: Record<string, Line[]> = {
  lisbon: [
    { by: "arjun", kind: "update", text: "Booked flights for all four: TAP, 14 to 21 March." },
    { by: "mira", kind: "comment", text: "The flat in Graça said yes too." },
    { by: "lena", kind: "update", text: "Sintra on the Wednesday? There’s a walk from the station." },
    { by: "arjun", kind: "comment", text: "In. I’ll bring snacks for the train." },
  ],
  visa: [
    { kind: "comment", text: "Mine took three weeks. Hang in there." },
    { kind: "update", text: "The embassy takes walk-ins on Mondays, 9 to 1, if it helps." },
  ],
  portuguese: [
    { kind: "update", text: "Practise with me on Thursdays? Portuguese only." },
    { kind: "comment", text: "Your past tense is better than mine." },
  ],
  run: [
    { kind: "comment", text: "Join me Sunday morning?" },
    { kind: "update", text: "Ran 5 km at the same time as you. Counts." },
  ],
  portfolio: [
    { kind: "comment", text: "Send me the link when it’s up." },
    { kind: "update", text: "Left notes on the case studies: two are enough." },
  ],
  sleep: [
    { kind: "comment", text: "Same goal here. Lights out at 11:30?" },
    { kind: "update", text: "Phone in the kitchen tonight. Your idea." },
  ],
  c25k: [
    { by: "priya", kind: "update", text: "Week 5, run 2. Didn’t stop once.", status: "done" },
    { by: "kenji", kind: "comment", text: "Go on, nearly there." },
  ],
};
const ANY: Line[] = [
  { kind: "update", text: "Did my part today." },
  { kind: "comment", text: "Count me in." },
  { kind: "update", text: "Halfway there, I think." },
  { kind: "comment", text: "Nice one." },
];

const c25k = ALL_THREADS.find((t) => t.id === "c25k")!;

function initial(): State {
  const mine: Shared[] = MY_THREADS.map((t) => ({ ...t, with: [], log: [], played: 0 }));
  const lisbon = mine.find((t) => t.id === "lisbon")!;
  lisbon.with = ["mira", "arjun", "lena"];
  lisbon.log = [
    { id: "l1", kind: "note", by: ME, what: "shared", people: ["mira", "arjun", "lena"], ago: 3 * D + 5 * H },
    { id: "l2", kind: "update", by: ME, text: "Picked the week: 14 to 21 March.", status: null, ago: 3 * D + 4 * H, cheers: { go: ["mira"], nice: ["lena"] }, comments: [{ id: "l2c", by: "mira", text: "Finally.", ago: 3 * D + 3 * H }] },
    { id: "l3", kind: "update", by: "mira", text: "The flat in Graça has room for four. Asking about March.", status: null, ago: 2 * D + 2 * H, cheers: { nice: ["arjun"] }, comments: [{ id: "l3c", by: "lena", text: "That view though.", ago: 2 * D + H }] },
    { id: "l4", kind: "update", by: "arjun", text: "TAP is cheapest. Booking once Lena confirms.", status: null, ago: D + 3 * H, cheers: {}, comments: [] },
  ];
  const theirs: Shared = {
    ...c25k,
    with: [ME, "kenji"],
    played: 0,
    log: [
      { id: "c1", kind: "note", by: "priya", what: "shared", people: [ME, "kenji"], ago: 9 * D },
      { id: "c2", kind: "update", by: ME, text: "Ran with you in spirit: 5 km before work.", status: null, ago: 3 * D, cheers: { go: ["priya"] }, comments: [] },
      { id: "c3", kind: "update", by: "priya", text: "Week 5, run 1. Didn’t stop once.", status: null, ago: D + 4 * H, cheers: { go: ["kenji"] }, comments: [{ id: "c3c", by: "kenji", text: "Strong.", ago: D + 3 * H }] },
    ],
  };
  return { threads: [...mine, theirs], n: 0, left: null };
}

/** Everyone who sees a thread but you: its owner and the people it's shared with. */
const othersOn = (t: Shared) => [t.owner, ...t.with].filter((p) => p !== ME);

/** The next thing someone adds to a thread, if anything still makes sense. */
function nextLine(t: Shared): { at: number; line: Line; by: string } | null {
  const lines = LINES[t.id] ?? ANY;
  const others = othersOn(t);
  if (!t.with.length || !others.length) return null;
  for (let at = t.played; at < lines.length; at++) {
    const line = lines[at];
    const by = line.by ?? others[at % others.length];
    if (!others.includes(by)) continue;
    if (line.kind === "comment" && !t.log.some((e) => e.kind === "update")) continue;
    return { at, line, by };
  }
  return null;
}

function reduce(state: State, action: Action): State {
  const n = state.n + 1;
  const id = `e${n}`;
  const map = (tid: string, f: (t: Shared) => Shared): State => ({ ...state, n, left: null, threads: state.threads.map((t) => (t.id === tid ? f(t) : t)) });
  const note = (what: Extract<Entry, { kind: "note" }>["what"], people: string[], by = ME): Entry => ({ id, kind: "note", by, what, people, ago: 0 });
  switch (action.type) {
    case "share":
      return map(action.thread, (t) => ({ ...t, with: [...t.with, ...action.people.filter((p) => !t.with.includes(p))], log: [...t.log, note("shared", action.people)] }));
    case "unshare":
      return map(action.thread, (t) => ({ ...t, with: t.with.filter((p) => p !== action.person), log: [...t.log, note("unshared", [action.person])] }));
    case "stop":
      return map(action.thread, (t) => ({ ...t, with: [], log: [...t.log, note("stopped", t.with)] }));
    case "leave": {
      const t = state.threads.find((x) => x.id === action.thread);
      return { ...state, n, threads: state.threads.filter((x) => x.id !== action.thread), left: t ? { title: t.title, owner: t.owner } : null };
    }
    case "post":
      return map(action.thread, (t) => ({
        ...t,
        ...(action.status ? withStep(t, action.status) : {}),
        log: [...t.log, { id, kind: "update", by: ME, text: action.text, status: action.status, ago: 0, cheers: {}, comments: [] }],
      }));
    case "comment":
      return map(action.thread, (t) => ({
        ...t,
        log: t.log.map((e) => (e.id === action.entry && e.kind === "update" ? { ...e, comments: [...e.comments, { id, by: ME, text: action.text, ago: 0 }] } : e)),
      }));
    case "cheer":
      return {
        ...state,
        threads: state.threads.map((t) =>
          t.id !== action.thread
            ? t
            : {
                ...t,
                log: t.log.map((e) => {
                  if (e.id !== action.entry || e.kind !== "update") return e;
                  const who = e.cheers[action.kind] ?? [];
                  return { ...e, cheers: { ...e.cheers, [action.kind]: who.includes(ME) ? who.filter((w) => w !== ME) : [...who, ME] } };
                }),
              }
        ),
      };
    case "make": {
      const used = new Set(state.threads.filter((t) => t.owner === ME).map((t) => t.hue));
      const hue = [1, 7, 2, 3, 4, 5, 6, 0].find((h) => !used.has(h)) ?? n % 8;
      const t: Shared = {
        id: action.id,
        owner: ME,
        title: action.title,
        kind: action.kind,
        hue,
        status: "moving",
        meta: "",
        streak: 0,
        doneToday: false,
        notes: [],
        with: action.people,
        played: 0,
        log: [note("shared", action.people)],
      };
      return { ...state, n, left: null, threads: [t, ...state.threads] };
    }
    case "play": {
      const t = state.threads.find((x) => x.id === action.thread);
      const next = t ? nextLine(t) : null;
      if (!t || !next) return state;
      const { line, by } = next;
      if (line.kind === "comment") {
        // A comment goes under the newest update someone else wrote, or the newest at all.
        const updates = t.log.filter((e): e is Update => e.kind === "update");
        const target = [...updates].reverse().find((e) => e.by !== by) ?? updates[updates.length - 1];
        return map(t.id, (x) => ({
          ...x,
          played: next.at + 1,
          log: x.log.map((e) => (e.id === target.id && e.kind === "update" ? { ...e, comments: [...e.comments, { id, by, text: line.text, ago: 0 }] } : e)),
        }));
      }
      return map(t.id, (x) => ({
        ...x,
        ...(line.status && by === x.owner ? withStep(x, line.status) : {}),
        played: next.at + 1,
        log: [...x.log, { id, kind: "update", by, text: line.text, status: line.status && by === x.owner ? line.status : null, ago: 0, cheers: {}, comments: [] }],
      }));
    }
  }
}

export function OneThread({ me, today, tz, now }: { me: Who; today: string; tz: string; now: string }) {
  const { name: companion } = useCompanion();
  const { toast } = useToast();
  const [state, dispatch] = useReducer(reduce, undefined, initial);
  const [openId, setOpenId] = useState<string | null>("lisbon");
  const [making, setMaking] = useState(false);
  const [viewAs, setViewAs] = useState<string | null>(null);
  const [heard, setHeard] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);

  const whoOf = (who: string) => lookup(who, me);
  const names = (ids: string[]) => listOf(ids.map((x) => whoOf(x).first));
  const t = making ? null : (state.threads.find((x) => x.id === openId) ?? null);
  const next = t ? nextLine(t) : null;
  const viewer = viewAs ?? ME;
  const candidate = t ? (othersOn(t)[0] ?? null) : null;
  const preview = viewAs ? whoOf(viewAs) : null;
  const mine = state.threads.filter((x) => x.owner === ME);
  const theirs = state.threads.filter((x) => x.owner !== ME);

  function open(tid: string) {
    setOpenId(tid);
    setMaking(false);
    setViewAs(null);
  }

  function play() {
    if (!t || !next) return;
    dispatch({ type: "play", thread: t.id });
    setHeard(`${whoOf(next.by).first} ${next.line.kind === "comment" ? "commented on" : "added an update to"} ${t.title}: ${next.line.text}`);
  }

  function make(title: string, kind: ThreadKind, people: string[]) {
    const tid = `made-${state.n + 1}`;
    dispatch({ type: "make", id: tid, title, kind, people });
    setOpenId(tid);
    setMaking(false);
    toast(`${title} is shared with ${names(people)}.`, "success");
    requestAnimationFrame(() => heading.current?.focus());
  }

  function leave(x: Shared) {
    dispatch({ type: "leave", thread: x.id });
    setOpenId(state.threads.find((y) => y.id !== x.id)?.id ?? null);
  }

  return (
    <div className="grid grid-cols-1 gap-5">
      <TryBar>
        <TryButton who={next ? whoOf(next.by) : null} onClick={play} disabled={!next}>
          {next
            ? `${whoOf(next.by).first} ${next.line.kind === "comment" ? "comments" : "adds an update"}`
            : t && !t.with.length
              ? "Share it to see others add to it"
              : t
                ? "No more news to try here"
                : "Open a thread to try this"}
        </TryButton>
        <button type="button" className="chip chip-sm" aria-pressed={Boolean(viewAs)} disabled={!viewAs && !candidate} onClick={() => setViewAs(viewAs ? null : candidate)}>
          <Icon name="eye" className="h-4 w-4" />
          {viewAs ? "Back to yours" : candidate ? `See it as ${whoOf(candidate).first}` : "See it as someone it’s shared with"}
        </button>
      </TryBar>
      <p className="sr-only" aria-live="polite">
        {heard}
      </p>

      {state.left && !making ? (
        <p role="status" className="well appear flex items-start gap-2.5 px-4 py-3 text-[0.9375rem]">
          <Icon name="signout" className="mt-0.5 h-4 w-4" />
          <span>
            You left {whoOf(state.left.owner).first}’s {state.left.title}. What you added stays on it.
          </span>
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-start">
        <div className="min-w-0 lg:col-span-4">
          {preview && t ? (
            <ViewingAs who={preview} place={`${t.owner === ME ? "Your" : `${whoOf(t.owner).first}’s`} ${t.title}`} onBack={() => setViewAs(null)} />
          ) : (
            <nav aria-label="Threads" className="card p-2 sm:p-3">
              <h2 className="px-3 pb-2 pt-3 font-display text-display-s">Your threads</h2>
              <ul className="grid grid-cols-1 gap-1">
                {mine.map((x) => (
                  <ThreadRow key={x.id} t={x} on={!making && x.id === openId} whoOf={whoOf} onOpen={() => open(x.id)} />
                ))}
              </ul>
              {theirs.length ? (
                <>
                  <h2 className="px-3 pb-2 pt-5 font-display text-[1.35rem] leading-tight">Shared with you</h2>
                  <ul className="grid grid-cols-1 gap-1">
                    {theirs.map((x) => (
                      <ThreadRow key={x.id} t={x} on={!making && x.id === openId} whoOf={whoOf} onOpen={() => open(x.id)} />
                    ))}
                  </ul>
                </>
              ) : null}
              <div className="p-2 pt-3">
                <Button variant="secondary" className="w-full" aria-pressed={making} onClick={() => (setMaking(true), setViewAs(null))}>
                  <Icon name="plus" className="h-4 w-4" />
                  New thread to share
                </Button>
              </div>
            </nav>
          )}
        </div>

        <div className="min-w-0 lg:col-span-8">
          {making ? (
            <NewThread onMake={make} onCancel={() => setMaking(false)} />
          ) : t ? (
            <ThreadView
              key={t.id}
              t={t}
              viewer={viewer}
              whoOf={whoOf}
              headingRef={heading}
              today={today}
              tz={tz}
              now={now}
              dispatch={dispatch}
              onLeave={() => leave(t)}
              toast={toast}
            />
          ) : (
            <p className="well px-5 py-10 text-center text-ink/75">Pick a thread to see who it’s shared with.</p>
          )}
        </div>
      </div>

      {t && !making ? preview ? <NotHere who={preview} items={notHere(t, state, companion)} /> : <WhoSees {...threadSees(t, state, whoOf, companion)} /> : null}
    </div>
  );
}

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** What a preview of someone else's view leaves out. */
function notHere(t: Shared, state: State, companion: string): string[] {
  const rest = state.threads.filter((x) => x.owner === ME && x.id !== t.id).map((x) => x.title);
  return [
    t.owner === ME && t.notes.length ? `The ${count(t.notes.length, "note")} on ${t.title} from before you shared it` : "",
    rest.length ? `Your other threads: ${someOf(rest)}` : "",
    `Your pages, and what you tell ${companion}`,
    "Who else you share things with",
  ].filter(Boolean);
}

/** Who sees what on one thread, in true words. */
function threadSees(t: Shared, state: State, whoOf: (id: string) => Who, companion: string) {
  const others = othersOn(t).map(whoOf);
  const firsts = others.map((o) => o.first);
  const rest = state.threads.filter((x) => x.owner === ME && x.id !== t.id).map((x) => x.title);
  const footer = "No one else on Kata sees a shared thread, and it never shows on a profile. Each thread is shared on its own: sharing one shares nothing else.";
  if (t.owner !== ME) {
    return {
      people: others,
      title: `${listOf(firsts)} ${verb(firsts.length, "sees", "see")}`,
      they: ["What you add to it: your updates, comments and cheers", `That you follow ${whoOf(t.owner).first}’s ${t.title}`],
      kept: [`Your own threads, unless you share them`, `Your pages, and what you tell ${companion}`],
      footer,
    };
  }
  const shared = t.with.length > 0;
  return {
    people: others,
    title: shared ? `${listOf(firsts)} ${firsts.length === 1 ? "sees" : "see"}` : "No one else on Kata sees it",
    they: shared
      ? [`${t.title}: its name and where it is`, "Every update and comment on it since you shared it, and who wrote each", `Who it’s shared with: ${listOf(["you", ...firsts])}`]
      : ["Nothing yet. Share it and they see its name, where it is and everything added from then on."],
    kept: [
      t.notes.length ? (shared ? `The ${count(t.notes.length, "note")} on it from before you shared it` : `Its ${count(t.notes.length, "note")}: they stay yours once it’s shared`) : "",
      rest.length ? `Your other threads, unless you share them too: ${someOf(rest)}` : "",
      `Your pages, and what you tell ${companion}`,
      "Who you share your other threads with",
    ].filter(Boolean),
    footer,
  };
}

function ThreadRow({ t, on, whoOf, onOpen }: { t: Shared; on: boolean; whoOf: (id: string) => Who; onOpen: () => void }) {
  const owner = whoOf(t.owner);
  const others = t.with.filter((p) => p !== ME);
  return (
    <li>
      <button
        type="button"
        aria-current={on ? "true" : undefined}
        onClick={onOpen}
        className={`flex min-h-16 w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors duration-300 ${on ? "bg-sun text-on-sun" : "hover:bg-ink/[0.05]"}`}
      >
        {t.owner === ME ? <Dot hue={t.hue} size="h-5 w-5 mx-[5px]" /> : <Avatar name={owner.name} hue={owner.hue} size={30} />}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold leading-tight">{t.title}</span>
          <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[0.8125rem] opacity-80">
            {t.owner !== ME ? (
              <span className="truncate">
                {owner.first}’s · with you{others.length ? ` and ${listOf(others.map((p) => whoOf(p).first))}` : ""}
              </span>
            ) : t.with.length ? (
              <>
                <Faces people={t.with.map(whoOf)} size={18} max={3} />
                <span className="truncate">With {listOf(t.with.map((p) => whoOf(p).first))}</span>
              </>
            ) : (
              <>
                <Icon name="lock" className="h-3.5 w-3.5" strokeWidth={1.9} />
                <span className="truncate">Private</span>
              </>
            )}
          </span>
        </span>
      </button>
    </li>
  );
}

/** One thread as the people it's shared with see it: where it is, everyone's updates, comments and cheers. */
function ThreadView({
  t,
  viewer,
  whoOf,
  headingRef,
  today,
  tz,
  now,
  dispatch,
  onLeave,
  toast,
}: {
  t: Shared;
  viewer: string;
  whoOf: (id: string) => Who;
  headingRef: RefObject<HTMLHeadingElement | null>;
  today: string;
  tz: string;
  now: string;
  dispatch: (a: Action) => void;
  onLeave: () => void;
  toast: (msg: string, tone?: "default" | "success" | "danger") => void;
}) {
  const id = useId();
  const [panel, setPanel] = useState<"share" | "people" | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [asking, setAsking] = useState<string | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const owner = whoOf(t.owner);
  const ownerView = t.owner === viewer;
  const yours = t.owner === ME && viewer === ME;
  const shared = t.with.length > 0;
  const firsts = (ids: string[]) => listOf(ids.map((p) => (p === viewer ? "you" : whoOf(p).first)));
  const everyone = [viewer, ...[t.owner, ...t.with].filter((p) => p !== viewer)];
  const toggle = (p: string) => setPicked((ps) => (ps.includes(p) ? ps.filter((x) => x !== p) : [...ps, p]));
  const log = [...t.log].reverse();

  function share() {
    if (!picked.length) return;
    dispatch({ type: "share", thread: t.id, people: picked });
    toast(`${t.title} is shared with ${firsts(picked)}.`, "success");
    setPicked([]);
    setPanel(null);
  }

  return (
    <section data-hue={t.hue % 8} aria-labelledby={`${id}-title`} className="@container card p-4 sm:p-6" inert={viewer !== ME}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {ownerView ? <Dot hue={t.hue} size="h-5 w-5" /> : <Avatar name={owner.name} hue={owner.hue} size={30} />}
        <p className="min-w-0 flex-1 text-[0.875rem] font-semibold text-ink/75">
          {ownerView ? "Your" : `${owner.first}’s`} {KIND_LABEL[t.kind].toLowerCase()}
        </p>
        {t.kind !== "habit" ? <Status status={t.status} /> : null}
      </div>
      <h2 ref={headingRef} tabIndex={-1} id={`${id}-title`} className="mt-2 font-display text-display-m [overflow-wrap:anywhere]">
        {t.title}
      </h2>
      {metaOf(t) ? <p className="mt-2 text-ink/75">{metaOf(t)}</p> : null}

      <div className="well mt-5 p-4 sm:p-5">
        {shared ? (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <Faces people={everyone.map(whoOf)} size={34} max={5} />
              <p className="min-w-0 flex-1 basis-48 font-semibold leading-snug">
                {ownerView ? `Shared with ${firsts(t.with)}` : `${owner.first} shared it with ${firsts(t.with)}`}
              </p>
              {/* Whoever keeps it chooses who it's shared with; anyone else can leave it. */}
              {ownerView ? (
                <Button variant="secondary" size="sm" className="!h-11 aria-expanded:bg-sun aria-expanded:text-on-sun" aria-expanded={panel === "people"} onClick={() => (setPanel(panel === "people" ? null : "people"), setAsking(null))}>
                  <Icon name="people" className="h-4 w-4" />
                  People
                </Button>
              ) : (
                <Button variant="danger" size="sm" className="!h-11" aria-expanded={asking === "leave"} onClick={() => setAsking(asking === "leave" ? null : "leave")}>
                  Leave
                </Button>
              )}
            </div>
            <Private className="mt-3">
              No one else on Kata sees it. {ownerView ? "You set where it stands; they add updates and comments." : `${owner.first} sets where it stands; everyone adds updates and comments.`}
            </Private>
            {asking === "leave" ? (
              <div className="mt-4">
                <Confirm
                  title={`Leave ${owner.first}’s ${t.title}?`}
                  body={`You stop seeing it at once. What you added stays on it, for ${firsts(othersOn(t))}.`}
                  yes="Leave"
                  no="Stay"
                  onYes={onLeave}
                  onNo={() => setAsking(null)}
                />
              </div>
            ) : null}
            {panel === "people" && yours ? (
              <div className="appear mt-4">
                <ul>
                  {t.with.map((p) => {
                    const who = whoOf(p);
                    const added = t.log.filter((e) => e.kind === "update" && e.by === p).length + t.log.reduce((n, e) => n + (e.kind === "update" ? e.comments.filter((c) => c.by === p).length : 0), 0);
                    return (
                      <li key={p} className="rule border-t-2 py-2 first:border-t-0">
                        <div className="flex min-h-12 items-center gap-3">
                          <Avatar name={who.name} hue={who.hue} size={36} />
                          <p className="min-w-0 flex-1 leading-tight">
                            <span className="block truncate font-semibold">{who.name}</span>
                            <span className="mt-0.5 block text-[0.8125rem] text-ink/70">{added ? `Added ${count(added, "thing")} to it` : "Hasn’t added anything yet"}</span>
                          </p>
                          <button type="button" className="chip chip-sm !text-bad" aria-expanded={asking === p} onClick={() => setAsking(asking === p ? null : p)}>
                            Stop sharing
                          </button>
                        </div>
                        {asking === p ? (
                          <div className="mt-2">
                            <Confirm
                              title={`Stop sharing with ${who.first}?`}
                              body={`${who.first} stops seeing ${t.title} at once. What ${who.first} added stays on it.`}
                              yes="Stop sharing"
                              no="Keep"
                              onYes={() => {
                                dispatch({ type: "unshare", thread: t.id, person: p });
                                toast(`${who.first} doesn’t see ${t.title} any more.`);
                                setAsking(null);
                              }}
                              onNo={() => setAsking(null)}
                            />
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
                <div className="rule mt-2 grid gap-3 border-t-2 pt-4">
                  <PeoplePicker label="Share with someone else" picked={picked} exclude={t.with} onToggle={toggle} />
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" disabled={!picked.length} onClick={share}>
                      {picked.length === 1 ? `Share with ${whoOf(picked[0]).first}` : picked.length ? `Share with ${count(picked.length, "person", "people")}` : "Share"}
                    </Button>
                  </div>
                </div>
                <div className="rule mt-4 border-t-2 pt-4">
                  {asking === "all" ? (
                    <Confirm
                      title={`Make ${t.title} private again?`}
                      body={`${capital(firsts(t.with))} ${verb(t.with.length, "stops", "stop")} seeing it at once. What they added stays on it, and no one else on Kata sees it.`}
                      yes="Make it private"
                      no="Keep sharing"
                      onYes={() => {
                        dispatch({ type: "stop", thread: t.id });
                        toast(`${t.title} is private again.`);
                        setAsking(null);
                        setPanel(null);
                      }}
                      onNo={() => setAsking(null)}
                    />
                  ) : (
                    <button type="button" className="chip chip-sm !text-bad" onClick={() => setAsking("all")}>
                      <Icon name="lock" className="h-4 w-4" />
                      Make it private again
                    </button>
                  )}
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <>
            <p className="flex items-center gap-2 font-semibold">
              <Icon name="lock" className="h-4 w-4" strokeWidth={1.9} />
              Private: no one else on Kata sees it.
            </p>
            <p className="mt-1 text-[0.9375rem] text-ink/75">Share it with a few people and they can follow it, add their own updates and comment. You still set where it stands.</p>
            {panel === "share" ? (
              <div className="appear mt-4 grid gap-4">
                <PeoplePicker label="Who’s it for?" picked={picked} onToggle={toggle} />
                <p className="text-[0.875rem] text-ink/75">
                  {picked.length ? `${capital(firsts(picked))} will see` : "They’ll see"} its name, where it is and everything added from now on.
                  {t.notes.length ? ` Its ${count(t.notes.length, "note")} from before stay yours.` : ""}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button disabled={!picked.length} onClick={share}>
                    Share it
                  </Button>
                  <Button variant="quiet" onClick={() => (setPanel(null), setPicked([]))}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button className="mt-4" onClick={() => setPanel("share")}>
                <Icon name="people" className="h-4 w-4" />
                Share with a few people
              </Button>
            )}
          </>
        )}
      </div>

      {shared && ownerView ? (
        <div className="mt-6">
          <p className="mb-2 text-[0.875rem] font-semibold">Where it is</p>
          <ThreadSteps thread={forSteps(t, now)} today={today} tz={tz} paused={false} onStep={(step) => dispatch({ type: "post", thread: t.id, text: "", status: step })} />
        </div>
      ) : null}

      {shared ? (
        <div className="mt-6">
          <LineForm
            label="Add an update"
            placeholder={ownerView ? "What happened, what’s next" : `Something for ${owner.first}’s ${t.title}`}
            action="Post"
            onPost={(text) => dispatch({ type: "post", thread: t.id, text, status: null })}
          />
        </div>
      ) : null}

      {shared || log.length ? (
        <ol aria-label={`Updates on ${t.title}`} className="mt-6">
          {log.map((e) =>
            e.kind === "note" ? (
              <li key={e.id} className="rule appear border-t-2 py-3 first:border-t-0">
                <p className="text-center text-[0.8125rem] text-ink/70">
                  {noteWords(e, t, viewer, whoOf)} <span className="whitespace-nowrap">· {agoLabel(e.ago)}</span>
                </p>
              </li>
            ) : (
              <EntryRow key={e.id} e={e} t={t} viewer={viewer} whoOf={whoOf} dispatch={dispatch} />
            )
          )}
        </ol>
      ) : null}

      {yours && t.notes.length ? (
        <div className="mt-6 rounded-md border-2 border-dashed border-edge/50 p-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <Icon name="lock" className="h-4 w-4" strokeWidth={1.9} />
            <p className="min-w-0 flex-1 basis-52 text-[0.9375rem] leading-snug">
              <span className="font-semibold">{capital(count(t.notes.length, "note"))} {shared ? "from before you shared it." : "on it."}</span>{" "}
              {shared ? `They stay yours: ${firsts(t.with)} ${verb(t.with.length, "doesn’t", "don’t")} see them.` : "Private, like the thread."}
            </p>
            <button type="button" className="chip chip-sm" aria-expanded={showNotes} onClick={() => setShowNotes((s) => !s)}>
              {showNotes ? "Hide them" : "Show them"}
            </button>
          </div>
          {showNotes ? (
            <ul className="appear mt-3 grid gap-1.5 text-[0.9375rem] text-ink/85">
              {t.notes.map((note) => (
                <li key={note} className="flex gap-2.5">
                  <span aria-hidden className="mt-[0.55rem] h-2 w-2 shrink-0 rounded-full border border-edge bg-hue" />
                  {note}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function noteWords(e: Extract<Entry, { kind: "note" }>, t: Shared, viewer: string, whoOf: (id: string) => Who): string {
  const who = e.by === viewer ? "You" : whoOf(e.by).first;
  const people = listOf(e.people.map((p) => (p === viewer ? "you" : whoOf(p).first)));
  if (e.what === "shared") return `${who} shared ${t.title} with ${people}`;
  if (e.what === "unshared") return `${who} stopped sharing it with ${people}`;
  if (e.what === "stopped") return `${who} made it private again`;
  return `${who} left`;
}

/** One update: who, when, what, the cheers on it and its comments. */
function EntryRow({ e, t, viewer, whoOf, dispatch }: { e: Update; t: Shared; viewer: string; whoOf: (id: string) => Who; dispatch: (a: Action) => void }) {
  const [commenting, setCommenting] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const by = whoOf(e.by);
  const mine = e.by === viewer;
  const line = cheersLine(e.cheers, viewer, (p) => whoOf(p).first);
  useEffect(() => {
    if (commenting) input.current?.focus();
  }, [commenting]);
  return (
    <li className="rule appear border-t-2 py-4 first:border-t-0">
      <div className="flex items-center gap-3">
        <Avatar name={by.name} hue={by.hue} size={36} />
        <p className="flex min-w-0 flex-wrap items-center gap-x-2 text-[0.875rem] leading-tight">
          <span className="font-semibold">{mine ? "You" : by.first}</span>
          <span className="text-ink/70">· {agoLabel(e.ago)}</span>
          {e.ago === 0 && !mine ? (
            <span className="tag" data-hue="1">
              New
            </span>
          ) : null}
        </p>
      </div>
      <div className="mt-2 min-w-0 sm:-mt-0.5 sm:pl-12">
        <div className="min-w-0">
          <p className="text-[1.0625rem] leading-snug [overflow-wrap:anywhere]">{e.text || `${stepSaid(t, e.status ?? t.status)}.`}</p>
          {!mine ? (
            <div className="mt-3 max-w-[24rem]">
              <CheerRow cheers={e.cheers} viewer={viewer} author={by.first} onCheer={(kind) => dispatch({ type: "cheer", thread: t.id, entry: e.id, kind })} />
            </div>
          ) : null}
          {line ? <p className="mt-2 text-[0.8125rem] text-ink/75">{line}</p> : null}
          {e.comments.length ? (
            <ul aria-label="Comments" className="mt-3 grid gap-2">
              {e.comments.map((c) => {
                const who = whoOf(c.by);
                return (
                  <li key={c.id} className="well appear flex items-start gap-2.5 px-3 py-2.5">
                    <Avatar name={who.name} hue={who.hue} size={26} />
                    <div className="min-w-0">
                      <p className="text-[0.8125rem] leading-tight">
                        <span className="font-semibold">{c.by === viewer ? "You" : who.first}</span> <span className="text-ink/70">· {agoLabel(c.ago)}</span>
                      </p>
                      <p className="mt-0.5 text-[0.9375rem] leading-snug [overflow-wrap:anywhere]">{c.text}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}
          {commenting ? (
            <div className="mt-3">
              <CommentBox
                inputRef={input}
                onPost={(text) => {
                  dispatch({ type: "comment", thread: t.id, entry: e.id, text });
                  setCommenting(false);
                }}
                onCancel={() => setCommenting(false)}
              />
            </div>
          ) : (
            <button type="button" className="not-now mt-1 -ml-0.5" onClick={() => setCommenting(true)}>
              Comment
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

function CommentBox({ inputRef, onPost, onCancel }: { inputRef: RefObject<HTMLInputElement | null>; onPost: (text: string) => void; onCancel: () => void }) {
  const id = useId();
  const [value, setValue] = useState("");
  function submit(e: FormEvent) {
    e.preventDefault();
    if (value.trim()) onPost(value.trim());
  }
  return (
    <form onSubmit={submit} className="grid min-w-0 grid-cols-1 gap-2">
      <label htmlFor={id} className="sr-only">
        Your comment
      </label>
      <div className="flex min-w-0 items-center gap-2">
        <input
          ref={inputRef}
          id={id}
          className="control !min-h-11 min-w-0 !py-2"
          autoComplete="off"
          maxLength={200}
          placeholder="Write a comment"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onCancel();
          }}
        />
        <Button type="submit" variant="secondary" className="shrink-0" disabled={!value.trim()}>
          Comment
        </Button>
      </div>
    </form>
  );
}

/** A new thread, shared from the start: a name, a kind and the people it's with. */
function NewThread({ onMake, onCancel }: { onMake: (title: string, kind: ThreadKind, people: string[]) => void; onCancel: () => void }) {
  const id = useId();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<ThreadKind>("project");
  const [picked, setPicked] = useState<string[]>([]);
  const ready = Boolean(title.trim()) && picked.length > 0;
  const names = listOf(picked.map((p) => lookup(p, { id: ME, name: "", first: "", hue: 0 }).first));

  function submit(e: FormEvent) {
    e.preventDefault();
    if (ready) onMake(title.trim(), kind, picked);
  }

  return (
    <form onSubmit={submit} aria-labelledby={`${id}-h`} className="@container appear card p-4 sm:p-6">
      <h2 id={`${id}-h`} className="font-display text-display-s">
        New thread to share
      </h2>
      <p className="mt-1.5 text-[0.9375rem] text-ink/75">One thing you’re doing with a few people. It’s yours: you set where it stands, and they add updates and comments.</p>
      <label htmlFor={`${id}-name`} className="mt-5 block font-semibold">
        What is it?
      </label>
      <input
        id={`${id}-name`}
        className="control mt-2"
        placeholder="A trip, a challenge, a project…"
        maxLength={60}
        autoComplete="off"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <div role="radiogroup" aria-label="Kind" className="mt-3 flex flex-wrap gap-2">
        {(["project", "event", "goal", "habit"] as const).map((k) => (
          <button key={k} type="button" role="radio" aria-checked={kind === k} className="chip chip-sm" onClick={() => setKind(k)}>
            {KIND_LABEL[k]}
          </button>
        ))}
      </div>
      <div className="mt-5">
        <PeoplePicker label="Who’s it with?" picked={picked} onToggle={(p) => setPicked((ps) => (ps.includes(p) ? ps.filter((x) => x !== p) : [...ps, p]))} />
      </div>
      <Private className="mt-5">
        {picked.length ? `Shared with ${names}: no one else on Kata sees it, and it never shows on a profile.` : "Pick at least one person. No one else on Kata will see it."}
      </Private>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={!ready}>
          Start it
        </Button>
        <Button variant="quiet" onClick={onCancel}>
          Cancel
        </Button>
        {!ready ? <span className="text-[0.875rem] text-ink/70">{!title.trim() && !picked.length ? "Name it and pick someone first." : !title.trim() ? "Name it first." : "Pick someone first."}</span> : null}
      </div>
    </form>
  );
}

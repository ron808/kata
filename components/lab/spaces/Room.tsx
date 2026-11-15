"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { EmptyNote } from "@/components/shared/AppPage";
import { Avatar } from "@/components/shared/Avatar";
import { Button } from "@/components/shared/Button";
import { useCompanion } from "@/components/shared/Companion";
import { Icon } from "@/components/shared/Icon";
import { KIND_LABEL, STATUS_LABEL, Status } from "@/components/shared/Status";
import { useToast } from "@/components/shared/Toast";
import { ThreadSteps } from "@/components/maru/ThreadSteps";
import { stepSaid } from "@/lib/companion/steps";
import type { ReactionKind, ThreadStatus } from "@/lib/types";
import { CheerRow, Dot, Faces, LineForm, NotHere, Private, TryBar, TryButton, ViewingAs, WhoSees, cheersLine, forSteps, privateTo } from "./bits";
import { ME, agoLabel, dayLabel, listOf, metaOf, whoOf as lookup, type DemoThread, type Item, type Space, type Who } from "./data";
import { Members, NewSpace, ThreadPicker, spaceSees } from "./forms";
import { audienceOf, nextIn, useSpaces } from "./useSpaces";

/*
 * Version two: a space is a room. It's a conversation between the people in it, with the space's
 * threads pinned above. Talk is talk; an update on a thread arrives in the conversation as a patch
 * of the thread's colour, and anyone else can cheer it on.
 */

const KINDS: ("update" | "say" | "add")[] = ["update", "say", "add"];

export function Room({ me, today, tz, now, active }: { me: Who; today: string; tz: string; now: string; active: boolean }) {
  const { name: companion } = useCompanion();
  const { toast } = useToast();
  const id = useId();
  const [state, dispatch] = useSpaces();
  const [openId, setOpenId] = useState<string | null>("trip");
  const [making, setMaking] = useState(false);
  const [panel, setPanel] = useState<"pin" | "people" | null>(null);
  const [pinOpen, setPinOpen] = useState<string | null>(null);
  const [viewAs, setViewAs] = useState<string | null>(null);
  const [typing, setTyping] = useState<{ by: string; space: string } | null>(null);
  const [text, setText] = useState("");
  const [heard, setHeard] = useState("");
  const timer = useRef(0);
  const scroller = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  const whoOf = (who: string) => lookup(who, me);
  const space = making ? null : (state.spaces.find((s) => s.id === openId) ?? null);
  const items = space ? state.items.filter((i) => i.space === space.id) : [];
  const next = space ? nextIn(state, space.id, KINDS) : null;
  const viewer = viewAs ?? ME;
  const candidate = space?.members.find((m) => m !== ME) ?? null;
  const typer = typing && space && typing.space === space.id ? whoOf(typing.by) : null;
  const names = (ids: string[]) => listOf(ids.map((x) => whoOf(x).first));

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // The newest line in view: when something arrives, a room opens, or this version is shown.
  const spaceId = space?.id ?? null;
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [items.length, typer, spaceId, active, viewAs]);

  function open(sid: string) {
    setOpenId(sid);
    setMaking(false);
    setPanel(null);
    setPinOpen(null);
    setViewAs(null);
  }

  function make(name: string, members: string[]) {
    const sid = `made-${state.n + 1}`;
    dispatch({ type: "make", id: sid, name, members });
    setOpenId(sid);
    setMaking(false);
    setPanel(null);
    setPinOpen(null);
    toast(`${name} is made. ${names(members)} can write in it now.`, "success");
    requestAnimationFrame(() => heading.current?.focus());
  }

  function play() {
    if (!space || !next || typing) return;
    const e = next.event;
    const sid = space.id;
    const where = space.name;
    setTyping({ by: e.by, space: sid });
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    timer.current = window.setTimeout(
      () => {
        dispatch({ type: "play", space: sid, kinds: KINDS });
        setTyping(null);
        const who = whoOf(e.by).first;
        setHeard(e.kind === "say" ? `${who} in ${where}: ${e.text}` : `${who} ${e.kind === "add" ? "pinned" : "updated"} ${state.threads[e.thread]?.title ?? "a thread"}: ${e.text}`);
      },
      reduce ? 250 : 1100
    );
  }

  function send(e?: FormEvent) {
    e?.preventDefault();
    const words = text.trim();
    if (!words || !space) return;
    dispatch({ type: "say", space: space.id, text: words });
    setText("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  }

  function post(t: DemoThread, words: string, status: ThreadStatus | null) {
    dispatch({ type: "post", thread: t.id, text: words, status });
    const who = audienceOf(state, t.id);
    toast(`${status && !words ? stepSaid(t, status) : "Posted"}. ${who.length ? `${names(who)} ${who.length === 1 ? "sees" : "see"} it in the room.` : "No one else is in it yet."}`, "success");
  }

  function pin(tid: string) {
    if (!space) return;
    dispatch({ type: "add", space: space.id, thread: tid });
    const others = space.members.filter((m) => m !== ME);
    toast(`${state.threads[tid].title} is pinned. ${others.length ? `${names(others)} ${others.length === 1 ? "sees" : "see"} it now.` : ""}`, "success");
  }

  function unpin(tid: string) {
    if (!space) return;
    dispatch({ type: "out", space: space.id, thread: tid });
    if (pinOpen === tid) setPinOpen(null);
    const still = state.spaces.filter((s) => s.id !== space.id && s.threads.includes(tid));
    toast(`${state.threads[tid].title} is unpinned. ${still.length ? `It’s still in ${listOf(still.map((s) => s.name))}.` : "It’s private again."}`);
  }

  function leave() {
    if (!space) return;
    dispatch({ type: "leave", space: space.id });
    const rest = state.spaces.filter((s) => s.id !== space.id);
    setOpenId(rest[0]?.id ?? null);
    setPanel(null);
    setPinOpen(null);
  }

  const sees = space ? spaceSees(state, space, whoOf, companion, true) : null;
  const preview = viewAs ? whoOf(viewAs) : null;
  const openThread = pinOpen && space?.threads.includes(pinOpen) ? state.threads[pinOpen] : null;

  return (
    <div className="grid grid-cols-1 gap-5">
      <TryBar>
        <TryButton who={next ? whoOf(next.event.by) : null} onClick={play} disabled={!next || Boolean(typing)}>
          {typer
            ? `${typer.first} is writing…`
            : next
              ? `${whoOf(next.event.by).first} ${next.event.kind === "say" ? "writes" : next.event.kind === "add" ? "pins a thread" : "posts an update"}`
              : space
                ? "No more news to try here"
                : "Open a space to try this"}
        </TryButton>
        <button
          type="button"
          className="chip chip-sm"
          aria-pressed={Boolean(viewAs)}
          disabled={!viewAs && !candidate}
          onClick={() => {
            setViewAs(viewAs ? null : candidate);
            setPanel(null);
            setPinOpen(null);
          }}
        >
          <Icon name="eye" className="h-4 w-4" />
          {viewAs ? "Back to yours" : candidate ? `See it as ${whoOf(candidate).first}` : "See it as someone in it"}
        </button>
      </TryBar>
      <p className="sr-only" aria-live="polite">
        {heard}
      </p>

      {state.left && !making ? (
        <p role="status" className="well appear flex items-start gap-2.5 px-4 py-3 text-[0.9375rem]">
          <Icon name="signout" className="mt-0.5 h-4 w-4" />
          <span>
            You left {state.left.name}. What you said stays there.
            {state.left.mine.length ? ` ${listOf(state.left.mine)} ${state.left.mine.length === 1 ? "is" : "are"} private again.` : ""}
          </span>
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-start">
        <div className="min-w-0 lg:col-span-4">
          {preview && space ? (
            <ViewingAs who={preview} place={space.name} onBack={() => setViewAs(null)} />
          ) : (
            <nav aria-label="Your spaces" className="card p-2 sm:p-3">
              <h2 className="px-3 pb-2 pt-3 font-display text-display-s">Your spaces</h2>
              <ul className="grid grid-cols-1 gap-1">
                {state.spaces.map((s) => {
                  const on = !making && s.id === openId;
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        aria-current={on ? "true" : undefined}
                        onClick={() => open(s.id)}
                        className={`flex min-h-16 w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors duration-300 ${on ? "bg-sun text-on-sun" : "hover:bg-ink/[0.05]"}`}
                      >
                        <Faces people={s.members.filter((m) => m !== ME).map(whoOf)} size={28} max={3} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold leading-tight">{s.name}</span>
                          <span className="mt-0.5 block truncate text-[0.8125rem] opacity-80">{summary(state.items, s, state.threads, whoOf)}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="p-2 pt-3">
                <Button variant="secondary" className="w-full" aria-pressed={making} onClick={() => (setMaking(true), setPanel(null), setPinOpen(null))}>
                  <Icon name="plus" className="h-4 w-4" />
                  New space
                </Button>
              </div>
            </nav>
          )}
        </div>

        <div className="min-w-0 lg:col-span-8">
          {making ? (
            <NewSpace onMake={make} onCancel={state.spaces.length ? () => setMaking(false) : null} />
          ) : space ? (
            <section data-hue={space.hue} aria-labelledby={`${id}-name`} className="card flex flex-col p-3 sm:p-4" inert={Boolean(viewAs)}>
              <header className="flex items-start gap-3 px-1 pb-3">
                <div className="min-w-0 flex-1">
                  <h2 ref={heading} tabIndex={-1} id={`${id}-name`} className="font-display text-display-s [overflow-wrap:anywhere]">
                    {space.name}
                  </h2>
                  <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                    <Faces people={[viewer, ...space.members.filter((m) => m !== viewer)].map(whoOf)} size={26} max={6} />
                    <Private className="!text-[0.8125rem]">{privateTo(space.members.length, "room")}</Private>
                  </div>
                </div>
                {!viewAs ? (
                  <button type="button" className="chip chip-sm shrink-0 aria-expanded:bg-sun aria-expanded:text-on-sun" aria-expanded={panel === "people"} onClick={() => setPanel(panel === "people" ? null : "people")}>
                    <Icon name="people" className="h-4 w-4" />
                    People
                  </button>
                ) : null}
              </header>

              {panel === "people" ? (
                <div className="px-1 pb-3">
                  <Members
                    space={space}
                    threads={state.threads}
                    whoOf={whoOf}
                    room
                    onRemove={(pid) => {
                      dispatch({ type: "remove", space: space.id, person: pid });
                      toast(`${whoOf(pid).first} is out of ${space.name}.`);
                    }}
                    onInvite={(ids) => {
                      dispatch({ type: "invite", space: space.id, people: ids });
                      toast(`${names(ids)} ${ids.length === 1 ? "is" : "are"} in ${space.name} now.`, "success");
                    }}
                    onLeave={leave}
                    onClose={() => setPanel(null)}
                  />
                </div>
              ) : null}

              <div className="rule border-t-2 px-1 pb-3 pt-3">
                <p className="text-[0.8125rem] font-semibold text-ink/70">{space.threads.length ? "Pinned threads" : "No threads pinned yet"}</p>
                {/* On a phone the pins are one strip to swipe along (the next one peeking in); wider, they wrap. */}
                <ul className="no-scrollbar relative -mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-2 pt-0.5 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
                  {space.pins.map((tid) => {
                    const t = state.threads[tid];
                    if (!t || !space.threads.includes(tid)) return null;
                    const owner = whoOf(t.owner);
                    return (
                      <li key={tid} className="shrink-0 sm:min-w-0 sm:max-w-full sm:shrink">
                        <button
                          type="button"
                          aria-expanded={pinOpen === tid}
                          onClick={() => (setPinOpen(pinOpen === tid ? null : tid), setPanel(null))}
                          className="chip max-w-[15rem] !pl-1.5 aria-expanded:bg-sun aria-expanded:text-on-sun sm:max-w-full"
                        >
                          <Avatar name={owner.name} hue={owner.hue} size={28} />
                          <Dot hue={t.hue} size="h-3 w-3" />
                          <span className="min-w-0 truncate">{t.title}</span>
                          <span className="sr-only">, {t.owner === viewer ? "yours" : `${owner.first}’s`}</span>
                        </button>
                      </li>
                    );
                  })}
                  {!viewAs ? (
                    <li className="shrink-0">
                      <button type="button" className="chip aria-expanded:bg-sun aria-expanded:text-on-sun" aria-expanded={panel === "pin"} onClick={() => (setPanel(panel === "pin" ? null : "pin"), setPinOpen(null))}>
                        <Icon name="plus" className="h-4 w-4" />
                        Pin a thread
                      </button>
                    </li>
                  ) : null}
                </ul>
                {panel === "pin" ? <ThreadPicker space={space} threads={state.threads} room onAdd={pin} onOut={unpin} onClose={() => setPanel(null)} /> : null}
                {openThread ? (
                  <Pinned
                    key={openThread.id}
                    t={openThread}
                    viewer={viewer}
                    whoOf={whoOf}
                    today={today}
                    tz={tz}
                    now={now}
                    onPost={post}
                    onUnpin={() => unpin(openThread.id)}
                    onClose={() => setPinOpen(null)}
                  />
                ) : null}
              </div>

              <div
                ref={scroller}
                tabIndex={0}
                aria-label={`Conversation in ${space.name}`}
                className="rule -mx-1 flex h-[26rem] flex-col overflow-y-auto overscroll-contain border-y-2 px-2 py-4 [scrollbar-width:thin] sm:h-[30rem]"
              >
                <ol className="mt-auto grid grid-cols-1 gap-2.5">
                  {items.map((item, i) => (
                    <RoomLine
                      key={item.id}
                      item={item}
                      before={items[i - 1] ?? null}
                      viewer={viewer}
                      space={space}
                      threads={state.threads}
                      whoOf={whoOf}
                      onCheer={(kind) => dispatch({ type: "cheer", item: item.id, kind })}
                    />
                  ))}
                  {typer ? (
                    <li className="flex items-start gap-2" role="status">
                      <Avatar name={typer.name} hue={typer.hue} size={30} />
                      <p data-hue={typer.hue} className="rounded-[22px] rounded-tl-[6px] border-2 border-edge bg-tint px-4 py-3.5 text-deep">
                        <span className="sr-only">{typer.first} is writing</span>
                        <span aria-hidden className="typing">
                          <i />
                          <i />
                          <i />
                        </span>
                      </p>
                    </li>
                  ) : null}
                </ol>
              </div>

              <form onSubmit={send} className="mt-3 flex items-end gap-2">
                <label htmlFor={`${id}-say`} className="sr-only">
                  Write to {space.name}
                </label>
                <textarea
                  id={`${id}-say`}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={onKeyDown}
                  maxLength={1000}
                  rows={1}
                  placeholder={`Write to ${space.name}`}
                  className="control max-h-40 !min-h-12 min-w-0 resize-none !rounded-[1.5rem] !py-3 leading-snug [field-sizing:content]"
                />
                <button
                  type="submit"
                  disabled={!text.trim()}
                  aria-label="Send"
                  className="press grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-edge bg-sun text-on-sun transition-[transform,box-shadow,opacity] duration-300 disabled:opacity-45"
                >
                  <Icon name="send" className="h-5 w-5" />
                </button>
              </form>
            </section>
          ) : (
            <EmptyNote
              action={
                <Button onClick={() => setMaking(true)}>
                  <Icon name="plus" className="h-4 w-4" />
                  New space
                </Button>
              }
            >
              You’re not in any spaces now. Make one with a few people you pick.
            </EmptyNote>
          )}
        </div>
      </div>

      {space && sees ? preview ? <NotHere who={preview} items={sees.kept} /> : <WhoSees {...sees} /> : null}
    </div>
  );
}

/** The last thing said or done in a space, for its row in the list. */
function summary(items: Item[], s: Space, threads: Record<string, DemoThread>, whoOf: (id: string) => Who): string {
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i];
    if (it.space !== s.id || it.kind === "note") continue;
    const who = it.by === ME ? "You" : whoOf(it.by).first;
    if (it.kind === "say") return `${who}: ${it.text}`;
    return `${who} updated ${threads[it.thread]?.title ?? "a thread"}`;
  }
  return "Nothing yet";
}

/** One line of the room: a day line when the day changes, then talk, an update or a quiet note. */
function RoomLine({
  item,
  before,
  viewer,
  space,
  threads,
  whoOf,
  onCheer,
}: {
  item: Item;
  before: Item | null;
  viewer: string;
  space: Space;
  threads: Record<string, DemoThread>;
  whoOf: (id: string) => Who;
  onCheer: (kind: ReactionKind) => void;
}) {
  const day = !before || dayLabel(before.ago) !== dayLabel(item.ago) ? dayLabel(item.ago) : null;
  const by = whoOf(item.by);
  const mine = item.by === viewer;
  const name = mine ? "You" : by.first;
  const dayLine = day ? <p className="mb-1.5 mt-2 text-center text-[0.8125rem] font-semibold text-ink/65">{day}</p> : null;

  if (item.kind === "note") {
    const title = item.thread ? (threads[item.thread]?.title ?? "a thread") : "";
    const person = item.person ? (item.person === viewer ? "you" : whoOf(item.person).first) : "";
    const words =
      item.what === "made"
        ? `${name} made ${space.name}`
        : item.what === "added"
          ? `${name} pinned ${title}`
          : item.what === "out"
            ? `${name} unpinned ${title}`
            : item.what === "removed"
              ? `${name} removed ${person}`
              : item.what === "invited"
                ? `${name} added ${person}`
                : `${name} left`;
    return (
      <li className="appear grid grid-cols-1">
        {dayLine}
        <p className="text-center text-[0.8125rem] text-ink/70">{words}</p>
      </li>
    );
  }

  if (item.kind === "say") {
    return (
      <li className="appear grid grid-cols-1">
        {dayLine}
        <div className={`flex items-start gap-2 ${mine ? "justify-end" : ""}`}>
          {!mine ? <Avatar name={by.name} hue={by.hue} size={30} className="mt-0.5" /> : null}
          <div className={`flex min-w-0 max-w-[85%] flex-col ${mine ? "items-end" : "items-start"}`}>
            {!mine ? <p className="mb-1 px-1 text-[0.8125rem] font-semibold">{by.first}</p> : null}
            <p
              data-hue={mine ? undefined : by.hue}
              className={`whitespace-pre-line px-4 py-2.5 leading-snug [overflow-wrap:anywhere] ${mine ? "bubble-you" : "rounded-[22px] rounded-tl-[6px] border-2 border-edge bg-tint text-deep"}`}
            >
              {item.text}
            </p>
            {item.ago === 0 ? <p className="mt-1 px-1 text-[0.75rem] text-ink/65">Just now</p> : null}
          </div>
        </div>
      </li>
    );
  }

  const t = threads[item.thread];
  if (!t) return null;
  const line = cheersLine(item.cheers, viewer, (pid) => whoOf(pid).first);
  return (
    <li className="appear grid grid-cols-1">
      {dayLine}
      <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
        <div data-hue={t.hue % 8} className="piece w-full max-w-[25rem]">
          <div className="flex items-center gap-2">
            <Avatar name={by.name} hue={by.hue} size={28} />
            <p className="min-w-0 flex-1 text-[0.875rem] leading-tight">
              <span className="font-semibold">{name}</span> updated <span className="font-display text-[1.05rem]">{t.title}</span>
            </p>
            {item.status && t.kind !== "habit" ? <Status status={item.status} /> : null}
          </div>
          <p className="mt-2 text-[1.0125rem] font-medium leading-snug [overflow-wrap:anywhere]">{item.text || `${stepSaid(t, item.status ?? t.status)}.`}</p>
          {!mine ? (
            <div className="mt-2.5">
              <CheerRow cheers={item.cheers} viewer={viewer} author={by.first} onCheer={onCheer} />
            </div>
          ) : null}
          {line ? <p className="mt-2 text-[0.8125rem]">{line}</p> : null}
          {item.ago === 0 ? <p className="mt-1.5 text-[0.75rem] font-semibold opacity-80">{agoLabel(0)}</p> : null}
        </div>
      </div>
    </li>
  );
}

/** A pinned thread opened: where it is, and for your own, the steps and a line to post. */
function Pinned({
  t,
  viewer,
  whoOf,
  today,
  tz,
  now,
  onPost,
  onUnpin,
  onClose,
}: {
  t: DemoThread;
  viewer: string;
  whoOf: (id: string) => Who;
  today: string;
  tz: string;
  now: string;
  onPost: (t: DemoThread, text: string, status: ThreadStatus | null) => void;
  onUnpin: () => void;
  onClose: () => void;
}) {
  const owner = whoOf(t.owner);
  const yours = t.owner === viewer && viewer === ME;
  return (
    <div data-hue={t.hue % 8} className="piece appear mt-3">
      <div className="flex items-start gap-2.5">
        <Dot hue={t.hue} size="mt-1.5 h-3.5 w-3.5" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-[1.25rem] leading-tight [overflow-wrap:anywhere]">{t.title}</p>
          <p className="mt-1 text-[0.8125rem] font-semibold">
            {t.owner === viewer ? "Yours" : `${owner.first}’s`} · {KIND_LABEL[t.kind]}
            {t.kind !== "habit" ? ` · ${STATUS_LABEL[t.status]}` : ""}
            {metaOf(t) ? ` · ${metaOf(t)}` : ""}
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label={`Close ${t.title}`} className="-mr-2 -mt-2 grid h-11 w-11 shrink-0 place-items-center rounded-full transition-colors hover:bg-ink/[0.06]">
          <Icon name="close" className="h-5 w-5" />
        </button>
      </div>
      {yours ? (
        <div className="mt-3 grid grid-cols-1 gap-3">
          <ThreadSteps thread={forSteps(t, now)} today={today} tz={tz} paused={false} onStep={(step) => onPost(t, "", step)} />
          <LineForm label="What’s new on it?" placeholder="What happened, what’s next" action="Post" onPost={(words) => onPost(t, words, null)} />
          <button type="button" className="not-now justify-self-start" onClick={onUnpin}>
            Unpin it
          </button>
        </div>
      ) : (
        <p className="mt-2 text-[0.875rem]">
          {owner.first} sets where it is and posts its updates. They arrive in the conversation, where anyone can cheer them on.
        </p>
      )}
    </div>
  );
}

"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { EmptyNote } from "@/components/shared/AppPage";
import { Avatar } from "@/components/shared/Avatar";
import { Button } from "@/components/shared/Button";
import { useCompanion } from "@/components/shared/Companion";
import { Icon } from "@/components/shared/Icon";
import { KIND_LABEL } from "@/components/shared/Status";
import { useToast } from "@/components/shared/Toast";
import { ThreadSteps } from "@/components/maru/ThreadSteps";
import { stepSaid } from "@/lib/companion/steps";
import type { ReactionKind, ThreadStatus } from "@/lib/types";
import { CheerRow, Dot, Faces, LineForm, NotHere, Private, ThreadState, TryBar, TryButton, ViewingAs, WhoSees, cheersLine, forSteps, privateTo } from "./bits";
import { ME, agoLabel, listOf, verb, whoOf as lookup, type DemoThread, type Item, type Space, type Who } from "./data";
import { Members, NewSpace, ThreadPicker, spaceSees } from "./forms";
import { audienceOf, latestUpdate, nextIn, useSpaces } from "./useSpaces";

/*
 * Version one: a space is a board. Each thread in it is a card with whose it is, where it is and
 * its owner's latest update; everyone else can cheer that update on. Only the owner posts on a
 * thread, so a card is always one person's.
 */

const KINDS: ("update" | "add")[] = ["update", "add"];

type Update = Extract<Item, { kind: "update" }>;

export function Board({ me, today, tz, now }: { me: Who; today: string; tz: string; now: string }) {
  const { name: companion } = useCompanion();
  const { toast } = useToast();
  const [state, dispatch] = useSpaces();
  const [openId, setOpenId] = useState<string | null>("trip");
  const [making, setMaking] = useState(false);
  const [panel, setPanel] = useState<"add" | "people" | null>(null);
  const [viewAs, setViewAs] = useState<string | null>(null);
  const [heard, setHeard] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const chips = useRef<(HTMLButtonElement | null)[]>([]);

  const whoOf = (id: string) => lookup(id, me);
  const space = making ? null : (state.spaces.find((s) => s.id === openId) ?? null);
  const next = space ? nextIn(state, space.id, KINDS) : null;
  const viewer = viewAs ?? ME;
  const candidate = space?.members.find((m) => m !== ME) ?? null;
  const names = (ids: string[]) => listOf(ids.map((id) => whoOf(id).first));

  function open(id: string) {
    setOpenId(id);
    setMaking(false);
    setPanel(null);
    setViewAs(null);
  }

  // Arrow keys move along the spaces, as in any radio group.
  function onSpaceKey(e: KeyboardEvent<HTMLDivElement>) {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step || !state.spaces.length) return;
    e.preventDefault();
    const at = state.spaces.findIndex((s) => s.id === openId);
    const next = (Math.max(0, at) + step + state.spaces.length) % state.spaces.length;
    open(state.spaces[next].id);
    chips.current[next]?.focus();
  }

  function make(name: string, members: string[]) {
    const id = `made-${state.n + 1}`;
    dispatch({ type: "make", id, name, members });
    setOpenId(id);
    setMaking(false);
    setPanel(null);
    toast(`${name} is made. Add a thread and ${names(members)} ${verb(members.length, "sees", "see")} it.`, "success");
    requestAnimationFrame(() => heading.current?.focus());
  }

  function play() {
    if (!space || !next || next.event.kind === "say") return;
    const e = next.event;
    dispatch({ type: "play", space: space.id, kinds: KINDS });
    const title = state.threads[e.thread]?.title ?? "a thread";
    setHeard(e.kind === "add" ? `${whoOf(e.by).first} added ${title} to ${space.name}.` : `${whoOf(e.by).first} posted an update on ${title}.`);
  }

  function post(t: DemoThread, text: string, status: ThreadStatus | null) {
    dispatch({ type: "post", thread: t.id, text, status });
    const who = audienceOf(state, t.id);
    toast(`${status && !text ? stepSaid(t, status) : "Posted"}. ${who.length ? `${names(who)} ${who.length === 1 ? "sees" : "see"} it.` : "No one else is in the space yet."}`, "success");
  }

  function takeOut(t: DemoThread) {
    if (!space) return;
    dispatch({ type: "out", space: space.id, thread: t.id });
    const still = state.spaces.filter((s) => s.id !== space.id && s.threads.includes(t.id));
    toast(`${t.title} is out of ${space.name}. ${still.length ? `It’s still in ${listOf(still.map((s) => s.name))}.` : "It’s private again."}`);
  }

  function addThread(id: string) {
    if (!space) return;
    dispatch({ type: "add", space: space.id, thread: id });
    const others = space.members.filter((m) => m !== ME);
    toast(`${state.threads[id].title} is in ${space.name}. ${others.length ? `${names(others)} ${others.length === 1 ? "sees" : "see"} it now.` : ""}`, "success");
  }

  function leave() {
    if (!space) return;
    dispatch({ type: "leave", space: space.id });
    const rest = state.spaces.filter((s) => s.id !== space.id);
    setOpenId(rest[0]?.id ?? null);
    setPanel(null);
  }

  const sees = space ? spaceSees(state, space, whoOf, companion, false) : null;
  const preview = viewAs ? whoOf(viewAs) : null;
  const order = space ? [viewer, ...space.members.filter((m) => m !== viewer)] : [];

  return (
    <div className="grid grid-cols-1 gap-5">
      <TryBar>
        <TryButton who={next ? whoOf(next.event.by) : null} onClick={play} disabled={!next}>
          {next ? `${whoOf(next.event.by).first} ${next.event.kind === "add" ? "adds a thread" : "posts an update"}` : space ? "No more news to try here" : "Open a space to try this"}
        </TryButton>
        <button
          type="button"
          className="chip chip-sm"
          aria-pressed={Boolean(viewAs)}
          disabled={!viewAs && !candidate}
          onClick={() => {
            setViewAs(viewAs ? null : candidate);
            setPanel(null);
          }}
        >
          <Icon name="eye" className="h-4 w-4" />
          {viewAs ? "Back to yours" : candidate ? `See it as ${whoOf(candidate).first}` : "See it as someone in it"}
        </button>
      </TryBar>
      <p className="sr-only" aria-live="polite">
        {heard}
      </p>

      {preview && space ? (
        <ViewingAs who={preview} place={space.name} onBack={() => setViewAs(null)} />
      ) : (
        <div className="flex flex-wrap gap-2">
          {state.spaces.length ? (
            <div role="radiogroup" aria-label="Your spaces" className="flex flex-wrap gap-2" onKeyDown={onSpaceKey}>
              {state.spaces.map((s, i) => {
                const on = !making && s.id === openId;
                const focusable = on || (!state.spaces.some((x) => !making && x.id === openId) && i === 0);
                return (
                  <button
                    key={s.id}
                    ref={(el) => {
                      chips.current[i] = el;
                    }}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    tabIndex={focusable ? 0 : -1}
                    className="chip"
                    onClick={() => open(s.id)}
                  >
                    <Dot hue={s.hue} />
                    {s.name}
                  </button>
                );
              })}
            </div>
          ) : null}
          <button type="button" className="chip" aria-pressed={making} onClick={() => (setMaking(true), setPanel(null), setViewAs(null))}>
            <Icon name="plus" className="h-4 w-4" />
            New space
          </button>
        </div>
      )}

      {state.left && !making ? (
        <p role="status" className="well appear flex items-start gap-2.5 px-4 py-3 text-[0.9375rem]">
          <Icon name="signout" className="mt-0.5 h-4 w-4" />
          <span>
            You left {state.left.name}.
            {state.left.mine.length ? ` ${listOf(state.left.mine)} ${state.left.mine.length === 1 ? "is" : "are"} private again.` : ""}
          </span>
        </p>
      ) : null}

      {making ? (
        <NewSpace onMake={make} onCancel={state.spaces.length ? () => setMaking(false) : null} />
      ) : space ? (
        <>
          <section data-hue={space.hue} aria-labelledby="board-space" className="card relative p-4 sm:p-6">
            <span aria-hidden className="tape" />
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
              <div className="min-w-0 max-w-2xl">
                <h2 ref={heading} tabIndex={-1} id="board-space" className="font-display text-display-m [overflow-wrap:anywhere]">
                  {space.name}
                </h2>
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                  <Faces people={order.map(whoOf)} size={34} />
                  <p className="text-[0.9375rem]">{listOf(order.map((id) => (id === viewer ? "You" : whoOf(id).first)))}</p>
                </div>
                <Private className="mt-2.5">{privateTo(space.members.length, "space")}</Private>
              </div>
              {!viewAs ? (
                <div className="flex flex-wrap gap-2">
                  <Button aria-expanded={panel === "add"} onClick={() => setPanel(panel === "add" ? null : "add")}>
                    <Icon name="plus" className="h-4 w-4" />
                    Add a thread
                  </Button>
                  <Button variant="secondary" className="aria-expanded:bg-sun aria-expanded:text-on-sun" aria-expanded={panel === "people"} onClick={() => setPanel(panel === "people" ? null : "people")}>
                    <Icon name="people" className="h-4 w-4" />
                    People
                  </Button>
                </div>
              ) : null}
            </div>
            {panel === "add" ? (
              <ThreadPicker
                space={space}
                threads={state.threads}
                room={false}
                onAdd={addThread}
                onOut={(id) => takeOut(state.threads[id])}
                onClose={() => setPanel(null)}
              />
            ) : panel === "people" ? (
              <Members
                space={space}
                threads={state.threads}
                whoOf={whoOf}
                room={false}
                onRemove={(id) => {
                  dispatch({ type: "remove", space: space.id, person: id });
                  toast(`${whoOf(id).first} is out of ${space.name}.`);
                }}
                onInvite={(ids) => {
                  dispatch({ type: "invite", space: space.id, people: ids });
                  toast(`${names(ids)} ${ids.length === 1 ? "is" : "are"} in ${space.name} now.`, "success");
                }}
                onLeave={leave}
                onClose={() => setPanel(null)}
              />
            ) : null}
          </section>

          {space.threads.length ? (
            <div className="@container" inert={Boolean(viewAs)}>
              <ul className="grid grid-cols-1 gap-x-5 gap-y-8 pt-2 @2xl:grid-cols-2 @5xl:grid-cols-3">
                {space.threads.map((id) => {
                  const t = state.threads[id];
                  return t ? (
                    <li key={id} className="min-w-0">
                      <BoardCard
                        t={t}
                        space={space}
                        latest={latestUpdate(state.items, space.id, id)}
                        viewer={viewer}
                        whoOf={whoOf}
                        today={today}
                        tz={tz}
                        now={now}
                        onCheer={(item, kind) => dispatch({ type: "cheer", item, kind })}
                        onPost={post}
                        onOut={takeOut}
                      />
                    </li>
                  ) : null;
                })}
              </ul>
            </div>
          ) : (
            <EmptyNote
              action={
                viewAs ? undefined : (
                  <Button onClick={() => setPanel("add")}>
                    <Icon name="plus" className="h-4 w-4" />
                    Add a thread
                  </Button>
                )
              }
            >
              Nothing in {space.name} yet. Add one of your threads and {space.members.length > 1 ? names(space.members.filter((m) => m !== ME)) : "whoever you add"} {verb(Math.max(1, space.members.length - 1), "sees", "see")} it. Theirs show up here too.
            </EmptyNote>
          )}

          {preview && sees ? <NotHere who={preview} items={sees.kept} /> : sees ? <WhoSees {...sees} /> : null}
        </>
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
  );
}

/** One thread on the board: whose it is, where it is, the owner's latest update and the cheers on it. */
function BoardCard({
  t,
  space,
  latest,
  viewer,
  whoOf,
  today,
  tz,
  now,
  onCheer,
  onPost,
  onOut,
}: {
  t: DemoThread;
  space: Space;
  latest: Update | null;
  viewer: string;
  whoOf: (id: string) => Who;
  today: string;
  tz: string;
  now: string;
  onCheer: (item: string, kind: ReactionKind) => void;
  onPost: (t: DemoThread, text: string, status: ThreadStatus | null) => void;
  onOut: (t: DemoThread) => void;
}) {
  const [writing, setWriting] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const owner = whoOf(t.owner);
  const mine = t.owner === viewer;
  const yours = mine && viewer === ME;
  const fresh = latest && latest.ago === 0 && latest.by !== viewer;
  const line = latest ? cheersLine(latest.cheers, viewer, (id) => whoOf(id).first) : "";
  const id = `card-${space.id}-${t.id}`;

  return (
    <article data-hue={t.hue % 8} aria-labelledby={id} className="card relative flex h-full flex-col p-4 sm:p-5">
      <span aria-hidden className="tape" />
      <header className="flex items-center gap-2.5">
        <Avatar name={owner.name} hue={owner.hue} size={34} />
        <p className="min-w-0 flex-1 truncate text-[0.875rem]">
          <span className="font-semibold">{mine ? "Yours" : `${owner.first}’s`}</span>
          <span className="text-ink/70"> · {KIND_LABEL[t.kind]}</span>
        </p>
        {fresh ? (
          <span className="tag" data-hue="1">
            New
          </span>
        ) : null}
      </header>
      <h3 id={id} className="mt-3 font-display text-[1.65rem] leading-[0.95] [overflow-wrap:anywhere]">
        {t.title}
      </h3>
      <ThreadState t={t} className="mt-2" />

      {latest ? (
        <div key={latest.id} className="piece appear mt-4">
          <p className="text-[1.0625rem] font-medium leading-snug [overflow-wrap:anywhere]">{latest.text || `${stepSaid(t, latest.status ?? t.status)}.`}</p>
          <p className="mt-1.5 text-[0.8125rem] font-semibold opacity-80">
            {latest.by === viewer ? "You" : whoOf(latest.by).first} · {agoLabel(latest.ago)}
          </p>
        </div>
      ) : (
        <p className="well mt-4 px-3 py-3 text-[0.9375rem] text-ink/75">{mine ? "Nothing posted here yet. Your next update shows here." : `${owner.first} hasn’t posted here yet.`}</p>
      )}

      {latest && !mine ? (
        <div className="mt-3">
          <CheerRow cheers={latest.cheers} viewer={viewer} author={owner.first} onCheer={(kind) => onCheer(latest.id, kind)} />
        </div>
      ) : null}
      {line ? <p className="mt-2 text-[0.8125rem] text-ink/75">{line}</p> : null}

      {yours ? (
        writing ? (
          <div className="rule appear mt-4 grid grid-cols-1 gap-4 border-t-2 pt-4">
            <div>
              <p className="mb-2 text-[0.875rem] font-semibold">Where it is</p>
              <ThreadSteps thread={forSteps(t, now)} today={today} tz={tz} paused={false} onStep={(step) => onPost(t, "", step)} />
            </div>
            <LineForm
              label="What’s new?"
              placeholder="What happened, what’s next"
              action="Post"
              inputRef={input}
              onPost={(text) => {
                onPost(t, text, null);
                setWriting(false);
              }}
            />
            <div className="flex flex-wrap items-center justify-between gap-x-4">
              <button type="button" className="not-now" onClick={() => setWriting(false)}>
                Close
              </button>
              <button type="button" className="not-now" onClick={() => onOut(t)}>
                Take it out of {space.name}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-auto pt-4">
            <button
              type="button"
              className="chip chip-sm"
              onClick={() => {
                setWriting(true);
                requestAnimationFrame(() => input.current?.focus());
              }}
            >
              <Icon name="pen" className="h-4 w-4" />
              Post an update
            </button>
          </div>
        )
      ) : null}
    </article>
  );
}

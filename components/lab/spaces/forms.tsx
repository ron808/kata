"use client";

import { useId, useState, type FormEvent } from "react";
import { Avatar } from "@/components/shared/Avatar";
import { Button } from "@/components/shared/Button";
import { Icon } from "@/components/shared/Icon";
import { Confirm, Dot, PeoplePicker, Private, someOf } from "./bits";
import { FRIENDS, ME, MY_THREADS, count, listOf, metaOf, type DemoThread, type Space, type Who } from "./data";
import type { SpacesState } from "./useSpaces";

/* Making a space, choosing what's in it and who: the board and the room share these. */

const firstOf = (id: string) => FRIENDS.find((f) => f.id === id)?.first ?? id;

/** A name and a few people: everything a space needs to start. */
export function NewSpace({ onMake, onCancel }: { onMake: (name: string, members: string[]) => void; onCancel: (() => void) | null }) {
  const id = useId();
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const ready = Boolean(name.trim()) && picked.length > 0;
  const names = picked.map(firstOf);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (ready) onMake(name.trim(), picked);
  }

  return (
    <form onSubmit={submit} aria-labelledby={`${id}-h`} className="@container appear card p-4 sm:p-6">
      <h2 id={`${id}-h`} className="font-display text-display-s">
        New space
      </h2>
      <p className="mt-1.5 text-[0.9375rem] text-ink/75">A few people you pick, and the threads each of you puts in it. Nothing goes in until someone adds it.</p>
      <label htmlFor={`${id}-name`} className="mt-5 block font-semibold">
        What’s it for?
      </label>
      <input
        id={`${id}-name`}
        className="control mt-2"
        placeholder="A trip, a challenge, a project…"
        maxLength={40}
        autoComplete="off"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <div className="mt-5">
        <PeoplePicker label="Who’s in it?" picked={picked} onToggle={(p) => setPicked((ps) => (ps.includes(p) ? ps.filter((x) => x !== p) : [...ps, p]))} />
      </div>
      <Private className="mt-5">
        {picked.length
          ? `Private to ${listOf(["you", ...names])}: no one else on Kata sees it, and it never shows on a profile.`
          : "Pick at least one person. No one else on Kata will see it, and it never shows on a profile."}
      </Private>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={!ready} aria-describedby={ready ? undefined : `${id}-why`}>
          Make the space
        </Button>
        {onCancel ? (
          <Button variant="quiet" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        {!ready ? (
          <span id={`${id}-why`} className="text-[0.875rem] text-ink/70">
            {!name.trim() && !picked.length ? "Name it and pick someone first." : !name.trim() ? "Name it first." : "Pick someone first."}
          </span>
        ) : null}
      </div>
    </form>
  );
}

/** Your threads, and which are in this space: add one and the others see it, take it out and it's private again. */
export function ThreadPicker({
  space,
  threads,
  room,
  onAdd,
  onOut,
  onClose,
}: {
  space: Space;
  threads: Record<string, DemoThread>;
  room: boolean;
  onAdd: (id: string) => void;
  onOut: (id: string) => void;
  onClose: () => void;
}) {
  const others = space.members.filter((m) => m !== ME).map(firstOf);
  const mine = MY_THREADS.map((t) => threads[t.id] ?? t);
  return (
    <div className="well appear mt-5 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">{room ? "Pin one of your threads" : "Add one of your threads"}</h3>
          <p className="mt-0.5 text-[0.875rem] text-ink/75">
            {others.length ? `${listOf(others)} ${others.length === 1 ? "sees" : "see"}` : "Whoever’s in it sees"} its name, where it is and the updates you post {room ? "on it in the room" : "here"}. What you noted on it before stays yours.
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 -mt-2 grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink/70 transition-colors hover:bg-ink/[0.06] hover:text-ink">
          <Icon name="close" className="h-5 w-5" />
        </button>
      </div>
      <ul className="mt-3 grid grid-cols-1 gap-2">
        {mine.map((t) => {
          const inIt = space.threads.includes(t.id);
          return (
            <li key={t.id} className="flex min-h-14 items-center gap-3 rounded-md bg-surface px-3 py-2">
              <Dot hue={t.hue} size="h-4 w-4" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold leading-tight">{t.title}</span>
                <span className="block truncate text-[0.8125rem] text-ink/70">{inIt ? (room ? "Pinned here" : "In this space") : "Private"} · {metaOf(t)}</span>
              </span>
              {inIt ? (
                <button type="button" className="chip chip-sm" onClick={() => onOut(t.id)} aria-label={`${room ? "Unpin" : "Take out"} ${t.title}`}>
                  {room ? "Unpin" : "Take out"}
                </button>
              ) : (
                <button type="button" className="chip chip-sm" onClick={() => onAdd(t.id)} aria-label={`${room ? "Pin" : "Add"} ${t.title}`}>
                  <Icon name="plus" className="h-4 w-4" />
                  {room ? "Pin" : "Add"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Who's in a space. Whoever made it adds and removes people; anyone can leave. A removed
 * person's threads come out with them; in the room, what they said stays.
 */
export function Members({
  space,
  threads,
  whoOf,
  room,
  onRemove,
  onInvite,
  onLeave,
  onClose,
}: {
  space: Space;
  threads: Record<string, DemoThread>;
  whoOf: (id: string) => Who;
  room: boolean;
  onRemove: (id: string) => void;
  onInvite: (ids: string[]) => void;
  onLeave: () => void;
  onClose: () => void;
}) {
  const [asking, setAsking] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const mine = space.maker === ME;
  const maker = whoOf(space.maker);
  const others = space.members.filter((m) => m !== ME);
  const myThreads = space.threads.filter((t) => threads[t]?.owner === ME).map((t) => threads[t].title);
  const after = others.map((o) => whoOf(o).first);

  const leaveBody = !others.length
    ? `Nobody else is in it, so it goes${myThreads.length ? `, and ${listOf(myThreads)} ${myThreads.length === 1 ? "is" : "are"} private again` : ""}.`
    : `${myThreads.length ? `Your ${listOf(myThreads)} ${myThreads.length === 1 ? "comes" : "come"} out of it, and you` : "You"} stop seeing everyone else’s threads.${room ? " What you said stays in the room." : ""} ${listOf(after)} ${others.length === 1 ? "keeps it and sees" : "keep it and see"} that you left.${mine ? ` ${after[0]} looks after it from then on.` : ""}`;

  return (
    <div className="@container well appear mt-5 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <h3 className="min-w-0 flex-1 font-semibold">
          People in {space.name} <span className="font-normal text-ink/70">· {space.members.length}</span>
        </h3>
        <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 -mt-2 grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink/70 transition-colors hover:bg-ink/[0.06] hover:text-ink">
          <Icon name="close" className="h-5 w-5" />
        </button>
      </div>
      <ul className="mt-1">
        {space.members.map((id) => {
          const p = whoOf(id);
          const theirs = space.threads.filter((t) => threads[t]?.owner === id).map((t) => threads[t].title);
          return (
            <li key={id} className="rule border-t-2 py-2 first:border-t-0">
              <div className="flex min-h-12 items-center gap-3">
                <Avatar name={p.name} hue={p.hue} size={36} />
                <p className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate font-semibold">{id === ME ? `${p.name} (you)` : p.name}</span>
                  <span className="mt-0.5 block text-[0.8125rem] text-ink/70">
                    {[id === space.maker ? "Made it" : "", theirs.length ? `${count(theirs.length, "thread")} in it` : "no threads in it yet"]
                      .filter(Boolean)
                      .join(" · ")
                      .replace(/^./, (c) => c.toUpperCase())}
                  </span>
                </p>
                {mine && id !== ME ? (
                  <button type="button" className="chip chip-sm !text-bad" aria-expanded={asking === id} onClick={() => setAsking(asking === id ? null : id)}>
                    Remove
                  </button>
                ) : null}
              </div>
              {asking === id ? (
                <div className="mt-2">
                  <Confirm
                    title={`Remove ${p.first}?`}
                    body={`${p.first} stops seeing ${space.name} at once${theirs.length ? `, and ${p.first}’s ${listOf(theirs)} ${theirs.length === 1 ? "comes" : "come"} out of it` : ""}.${room ? ` What ${p.first} said stays in the room.` : ""}`}
                    yes={`Remove ${p.first}`}
                    no="Keep"
                    onYes={() => {
                      setAsking(null);
                      onRemove(id);
                    }}
                    onNo={() => setAsking(null)}
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      {mine ? (
        inviting ? (
          <div className="rule mt-2 grid gap-3 border-t-2 pt-4">
            <PeoplePicker label="Add someone" picked={picked} exclude={space.members} onToggle={(p) => setPicked((ps) => (ps.includes(p) ? ps.filter((x) => x !== p) : [...ps, p]))} />
            <p className="text-[0.875rem] text-ink/75">They see everything in it, earlier updates too.</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                disabled={!picked.length}
                onClick={() => {
                  onInvite(picked);
                  setPicked([]);
                  setInviting(false);
                }}
              >
                {picked.length === 1 ? `Add ${firstOf(picked[0])}` : picked.length ? `Add ${count(picked.length, "person", "people")}` : "Add"}
              </Button>
              <Button variant="quiet" onClick={() => (setInviting(false), setPicked([]))}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <button type="button" className="chip mt-2" onClick={() => setInviting(true)}>
            <Icon name="plus" className="h-4 w-4" />
            Add someone
          </button>
        )
      ) : (
        <p className="mt-2 text-[0.875rem] text-ink/75">
          {maker.first} made this space, so {maker.first} adds and removes people. Anyone can leave.
        </p>
      )}

      <div className="rule mt-4 border-t-2 pt-4">
        {asking === "leave" ? (
          <Confirm
            title={`Leave ${space.name}?`}
            body={leaveBody}
            yes="Leave"
            no="Stay"
            onYes={() => {
              setAsking(null);
              onLeave();
            }}
            onNo={() => setAsking(null)}
          />
        ) : (
          <button type="button" className="chip chip-sm !text-bad" onClick={() => setAsking("leave")}>
            <Icon name="signout" className="h-4 w-4" />
            Leave this space
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Who sees what in a space, in true words: what the others see of yours, and what stays
 * private. The same list says what a preview of their view leaves out.
 */
export function spaceSees(state: SpacesState, space: Space, whoOf: (id: string) => Who, companion: string, room: boolean) {
  const others = space.members.filter((m) => m !== ME).map(whoOf);
  const mineIn = space.threads.map((t) => state.threads[t]).filter((t): t is DemoThread => t?.owner === ME);
  const mineOut = MY_THREADS.filter((t) => !space.threads.includes(t.id)).map((t) => t.title);
  const elsewhere = state.spaces.filter((s) => s.id !== space.id).map((s) => s.name);
  const notes = mineIn.reduce((n, t) => n + t.notes.length, 0);
  const names = mineIn.map((t) => t.title);
  const verb = room ? "pinned" : "added";
  const they = [
    `Who’s in it: ${listOf(["you", ...others.map((o) => o.first)])}`,
    names.length
      ? `${listOf(names)}: ${names.length === 1 ? "its name, where it is" : "their names, where they are"} and the updates you post ${room ? "in the room" : "here"}`
      : `None of your threads yet. ${room ? "Pin" : "Add"} one and they see it.`,
    room ? "What you write in the room, and your cheers" : "Your cheers on their updates",
  ];
  const kept = [
    mineOut.length ? `Your other threads: ${someOf(mineOut)}` : "",
    notes ? `The ${count(notes, "note")} on ${listOf(names)} from before you ${verb} ${names.length === 1 ? "it" : "them"}` : "",
    `Your pages, and what you tell ${companion}`,
    elsewhere.length ? `${listOf(elsewhere)}, and everything in ${elsewhere.length === 1 ? "it" : "them"}` : "",
  ].filter(Boolean);
  return {
    people: others,
    title: others.length ? `${listOf(others.map((o) => o.first))} ${others.length === 1 ? "sees" : "see"}` : "Nobody else is in it yet",
    they,
    kept,
    footer: `No one else on Kata sees anything in a space, and nothing in it shows on a profile. Everyone in it sees everything in it, from before they joined too, and ${companion} never puts anything in a space for you.`,
  };
}

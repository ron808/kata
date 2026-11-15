"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Avatar } from "@/components/shared/Avatar";
import { Button } from "@/components/shared/Button";
import { Icon } from "@/components/shared/Icon";
import { Status } from "@/components/shared/Status";
import { useToast } from "@/components/shared/Toast";
import { ThreadSteps } from "@/components/maru/ThreadSteps";
import { Ago } from "@/components/people/time";
import { habitRun } from "@/lib/companion/fields";
import { stepSaid } from "@/lib/companion/steps";
import { dayDiff, monthDayOf, weekdayOf } from "@/lib/companion/time";
import type { FriendT, ReactionKind, SharedThreadT, ThreadKind, ThreadStatus, ThreadUpdateT, Who } from "@/lib/types";
import { CheerRow, Confirm, Faces, LineForm, PeoplePicker, Private, cheersLine, firstOf, listOf } from "./SharingBits";

/**
 * A thread shared with a few friends, as its writer and they see it: where it stands, and
 * everyone's updates, comments and cheers. Its writer shares it, sets where it stands and picks
 * who's on it; anyone on it adds updates and comments, cheers, or leaves. News about it while it's
 * open refreshes the page (the shell's pulse), and the new props replace what's shown.
 */

type Body =
  | { action: "share"; people: string[] }
  | { action: "unshare"; person: string }
  | { action: "private" }
  | { action: "post"; text: string }
  | { action: "comment"; update: string; text: string }
  | { action: "cheer"; update: string; kind: ReactionKind };

const KIND_WORD: Partial<Record<ThreadKind, string>> = { project: "project", task: "task", goal: "goal", habit: "habit", event: "event" };

/** Where it is in a few words: a date, or a habit's run and today. */
function metaOf(t: SharedThreadT, today: string): string {
  if (t.kind === "habit") {
    if (t.status === "paused") return "Paused for now";
    return `${t.streak > 1 ? `${habitRun(t.streak, t.title)} · ` : ""}${t.doneToday ? "Done today" : "Not yet today"}`;
  }
  if (!t.dueAt || t.status === "done") return "";
  const due = t.dueAt.slice(0, 10);
  const d = dayDiff(due, today);
  if (d < 0) return `Was due ${monthDayOf(due)}`;
  if (d === 0) return "Due today";
  if (d === 1) return "Due tomorrow";
  return d < 7 ? `Due ${weekdayOf(due)}` : `Due ${monthDayOf(due)}`;
}

/** A step its writer set, said as a line: "Lisbon trip is done.", "Done yesterday." */
function stepWords(u: ThreadUpdateT, t: SharedThreadT, today: string): string {
  const status = u.status ?? t.status;
  if (t.kind === "habit" && status === "done") {
    const d = u.day ? dayDiff(today, u.day) : 0;
    return d <= 0 ? "Done today." : d === 1 ? "Done yesterday." : `Done on ${weekdayOf(u.day!)}.`;
  }
  if (t.kind === "habit" && status === "moving") return "Going again.";
  return `${stepSaid(t, status)}.`;
}

export function SharedThread({
  initial,
  friends,
  today,
  tz,
  companion,
  sharing = false,
}: {
  initial: SharedThreadT;
  friends: FriendT[];
  today: string;
  tz: string;
  companion: string;
  /** Open with the people to share it with showing (?share=1, from the Threads page). */
  sharing?: boolean;
}) {
  const id = useId();
  const router = useRouter();
  const { toast } = useToast();
  const [t, setT] = useState(initial);
  const [seen, setSeen] = useState(initial);
  if (initial !== seen) {
    setSeen(initial);
    setT(initial);
  }
  // What was here when the page opened: anything newer from someone else is marked new.
  const [known] = useState(() => new Set(initial.updates.map((u) => u._id)));
  const [older, setOlder] = useState<ThreadUpdateT[]>([]);
  const [more, setMore] = useState(initial.more);
  const [busy, setBusy] = useState<string | null>(null);
  const [pending, setPending] = useState<ThreadStatus | null>(null);
  const [panel, setPanel] = useState<"share" | "people" | null>(sharing && initial.mine && !initial.with.length ? "share" : null);
  const [picked, setPicked] = useState<string[]>([]);
  const [asking, setAsking] = useState<string | null>(null);

  const who = (h: string): Who => t.people[h] ?? { handle: h, name: h, hue: 2 };
  const name = (h: string) => (h === t.me ? "you" : firstOf(who(h).name));
  // "you and Arjun": the viewer first wherever they're named.
  const names = (hs: string[]) => listOf([...hs.filter((h) => h === t.me), ...hs.filter((h) => h !== t.me)].map(name));
  const owner = who(t.owner);
  const ownerFirst = firstOf(owner.name);
  const shared = t.with.length > 0;
  const canAdd = shared && !t.archived;
  const everyone = [t.me, ...[t.owner, ...t.with].filter((h) => h !== t.me)];
  const updates = [...t.updates, ...older.filter((o) => !t.updates.some((u) => u._id === o._id))];
  const meta = metaOf(t, today);
  const toggle = (h: string) => setPicked((ps) => (ps.includes(h) ? ps.filter((x) => x !== h) : [...ps, h]));

  async function call(init: RequestInit, query = ""): Promise<SharedThreadT | null> {
    const res = await fetch(`/api/threads/${t._id}/sharing${query}`, { ...init, headers: { "Content-Type": "application/json" }, cache: "no-store" }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { thread?: SharedThreadT; error?: string } | null;
    if (!res?.ok || !data?.thread) {
      toast(data?.error ?? "That didn’t go through. Try again.", "danger");
      return null;
    }
    return data.thread;
  }

  async function act(body: Body, done?: string): Promise<boolean> {
    setBusy(body.action);
    const next = await call({ method: "POST", body: JSON.stringify(body) });
    setBusy(null);
    if (!next) return false;
    setT(next);
    if (done) toast(done, "success");
    return true;
  }

  async function share() {
    if (!picked.length) return;
    const names = listOf(picked.map((h) => firstOf(friends.find((f) => f.handle === h)?.name ?? h)));
    if (await act({ action: "share", people: picked }, `${t.title} is shared with ${names}.`)) {
      setPicked([]);
      setPanel(null);
    }
  }

  // Where it stands goes through the thread's own rule (stepChange), then the page reads it back.
  async function step(s: ThreadStatus) {
    setPending(s);
    const res = await fetch(`/api/threads/${t._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: s }) }).catch(() => null);
    if (res?.ok) {
      const next = await call({ method: "GET" });
      if (next) setT(next);
    } else toast("That didn’t save. Try again.", "danger");
    setPending(null);
  }

  async function bringBack() {
    setBusy("back");
    const res = await fetch(`/api/threads/${t._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ archived: false }) }).catch(() => null);
    const next = res?.ok ? await call({ method: "GET" }) : null;
    setBusy(null);
    if (next) {
      setT(next);
      toast(`${t.title} is back.`, "success");
    } else if (!res?.ok) toast("That didn’t save. Try again.", "danger");
  }

  async function leave() {
    setBusy("leave");
    const res = await fetch(`/api/threads/${t._id}/sharing`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "leave" }) }).catch(() => null);
    setBusy(null);
    if (!res?.ok) {
      toast("That didn’t go through. Try again.", "danger");
      return;
    }
    toast(`You left ${ownerFirst}’s ${t.title}. What you added stays on it.`);
    router.push("/threads");
    router.refresh();
  }

  async function showOlder() {
    const last = updates.at(-1);
    if (!last) return;
    setBusy("older");
    const next = await call({ method: "GET" }, `?before=${encodeURIComponent(last.at)}`);
    setBusy(null);
    if (!next) return;
    setOlder((o) => [...o, ...next.updates]);
    setMore(next.more);
    setT((cur) => ({ ...cur, people: { ...next.people, ...cur.people } }));
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
      <div className="grid min-w-0 grid-cols-1 gap-4 lg:col-span-8">
        <Link href="/threads" className="link inline-flex min-h-11 w-fit items-center gap-1.5 text-[0.9375rem] font-semibold">
          <Icon name="arrow-left" className="h-4 w-4" />
          Threads
        </Link>

        <section data-hue={t.hue % 8} aria-labelledby={`${id}-title`} className="@container card p-4 sm:p-6">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {t.mine ? (
              <span aria-hidden className="h-5 w-5 shrink-0 rounded-full border-2 border-edge bg-hue" />
            ) : (
              <Avatar name={owner.name} hue={owner.hue} size={30} />
            )}
            <p className="min-w-0 flex-1 text-[0.875rem] font-semibold text-ink/75">
              {t.mine ? "Your" : `${ownerFirst}’s`} {KIND_WORD[t.kind] ?? "thread"}
            </p>
            {t.kind !== "habit" ? <Status status={t.status} /> : null}
            {t.mine ? (
              <Link href={`/threads?t=${t._id}`} className="chip chip-sm">
                <Icon name="pen" className="h-4 w-4" />
                Edit
              </Link>
            ) : null}
          </div>
          <h1 id={`${id}-title`} className="mt-2 font-display text-display-m [overflow-wrap:anywhere]">
            {t.title}
          </h1>
          {meta ? <p className="mt-2 text-ink/75">{meta}</p> : null}

          <div className="well mt-5 p-4 sm:p-5">
            {t.archived ? (
              <>
                <p className="flex items-center gap-2 font-semibold">
                  <Icon name="lock" className="h-4 w-4" strokeWidth={1.9} />
                  Archived: no one else sees it.
                </p>
                <p className="mt-1 text-[0.9375rem] text-ink/75">
                  {shared ? `${listOf(t.with.map(name)).replace(/^./, (c) => c.toUpperCase())} see it again once it’s back.` : "Bring it back to share it."}
                </p>
                <Button variant="secondary" className="mt-4" onClick={bringBack} disabled={busy === "back"}>
                  Bring it back
                </Button>
              </>
            ) : shared ? (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <Faces people={everyone.map(who)} size={34} max={5} />
                  <p className="min-w-0 flex-1 basis-48 font-semibold leading-snug">
                    {t.mine ? `Shared with ${names(t.with)}` : `${ownerFirst} shared it with ${names(t.with)}`}
                  </p>
                  {/* Whoever keeps it chooses who it's shared with; anyone else can leave it. */}
                  {t.mine ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="!h-11 aria-expanded:bg-sun aria-expanded:text-on-sun"
                      aria-expanded={panel === "people"}
                      onClick={() => (setPanel(panel === "people" ? null : "people"), setAsking(null), setPicked([]))}
                    >
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
                  No one else on Kata sees its updates. {t.mine ? "You set where it stands; everyone adds updates and comments." : `${ownerFirst} sets where it stands; everyone adds updates and comments.`}
                </Private>
                {asking === "leave" ? (
                  <div className="mt-4">
                    <Confirm
                      title={`Leave ${ownerFirst}’s ${t.title}?`}
                      body={`You stop seeing it at once. What you added stays on it, for ${listOf(everyone.filter((h) => h !== t.me).map(name))}.`}
                      yes="Leave"
                      no="Stay"
                      busy={busy === "leave"}
                      onYes={leave}
                      onNo={() => setAsking(null)}
                    />
                  </div>
                ) : null}
                {panel === "people" && t.mine ? (
                  <div className="appear mt-4">
                    <ul>
                      {t.with.map((h) => {
                        const p = who(h);
                        const added = updates.filter((u) => u.kind === "update" && u.by === h).length + updates.reduce((n, u) => n + u.comments.filter((c) => c.by === h).length, 0);
                        return (
                          <li key={h} className="rule border-t-2 py-2 first:border-t-0">
                            <div className="flex min-h-12 items-center gap-3">
                              <Avatar name={p.name} hue={p.hue} size={36} />
                              <p className="min-w-0 flex-1 leading-tight">
                                <span className="block truncate font-semibold">{p.name}</span>
                                <span className="mt-0.5 block text-[0.8125rem] text-ink/70">{added ? `Added ${added === 1 ? "one thing" : `${added} things`} to it` : "Hasn’t added anything yet"}</span>
                              </p>
                              <button type="button" className="chip chip-sm !text-bad" aria-expanded={asking === h} onClick={() => setAsking(asking === h ? null : h)}>
                                Stop sharing
                              </button>
                            </div>
                            {asking === h ? (
                              <div className="mt-2">
                                <Confirm
                                  title={`Stop sharing with ${firstOf(p.name)}?`}
                                  body={`${firstOf(p.name)} stops seeing ${t.title} at once. What ${firstOf(p.name)} added stays on it.`}
                                  yes="Stop sharing"
                                  no="Keep"
                                  busy={busy === "unshare"}
                                  onYes={async () => {
                                    if (await act({ action: "unshare", person: h }, `${firstOf(p.name)} doesn’t see ${t.title} any more.`)) setAsking(null);
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
                      <PeoplePicker label="Share with someone else" friends={friends} picked={picked} exclude={t.with} onToggle={toggle} handle={t.me} />
                      {picked.length ? (
                        <div className="flex flex-wrap gap-2">
                          <Button variant="secondary" disabled={busy === "share"} onClick={share}>
                            {picked.length === 1 ? `Share with ${firstOf(friends.find((f) => f.handle === picked[0])?.name ?? picked[0])}` : `Share with ${picked.length} people`}
                          </Button>
                        </div>
                      ) : null}
                    </div>
                    <div className="rule mt-4 border-t-2 pt-4">
                      {asking === "all" ? (
                        <Confirm
                          title={`Make ${t.title} private again?`}
                          body={`${listOf(t.with.map(name)).replace(/^./, (c) => c.toUpperCase())} ${t.with.length === 1 ? "stops" : "stop"} seeing it at once. What they added stays on it, and no one else on Kata sees it.`}
                          yes="Make it private"
                          no="Keep sharing"
                          busy={busy === "private"}
                          onYes={async () => {
                            if (await act({ action: "private" }, `${t.title} is private again.`)) {
                              setAsking(null);
                              setPanel(null);
                            }
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
                <p className="mt-1 text-[0.9375rem] text-ink/75">
                  Share it with a few friends and they can follow it, add their own updates and comment. You still set where it stands, and its notes stay yours.
                </p>
                {panel === "share" ? (
                  <div className="appear mt-4 grid gap-4">
                    <PeoplePicker label="Who’s it for?" friends={friends} picked={picked} onToggle={toggle} handle={t.me} />
                    {friends.some((f) => f.mutual) && t.me ? (
                      <>
                        <p className="text-[0.875rem] text-ink/75">
                          {picked.length ? `${listOf(picked.map((h) => firstOf(friends.find((f) => f.handle === h)?.name ?? h)))} will see` : "They’ll see"} its name, where it stands and everything added from
                          now on. They hear that you shared it.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Button disabled={!picked.length || busy === "share"} onClick={share}>
                            Share it
                          </Button>
                          <Button variant="quiet" onClick={() => (setPanel(null), setPicked([]))}>
                            Cancel
                          </Button>
                        </div>
                      </>
                    ) : null}
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

          {canAdd && t.mine ? (
            <div className="mt-6">
              <p className="mb-2 text-[0.875rem] font-semibold">Where it is</p>
              <ThreadSteps thread={t} today={today} tz={tz} pending={pending} disabled={Boolean(pending)} onStep={step} />
            </div>
          ) : null}

          {canAdd ? (
            <div className="mt-6">
              <LineForm
                label="Add an update"
                placeholder={t.mine ? "What happened, what’s next" : "What you did or found"}
                action="Post"
                busy={busy === "post"}
                onPost={(text) => act({ action: "post", text })}
              />
            </div>
          ) : null}

          {updates.length ? (
            <ol aria-label={`Updates on ${t.title}`} className={shared || t.mine ? "mt-6" : "mt-2"}>
              {updates.map((u) =>
                u.kind === "note" ? (
                  <li key={u._id} className="rule border-t-2 py-3 first:border-t-0">
                    <p className="text-center text-[0.8125rem] text-ink/70">
                      {noteWords(u, t, name, names)} <span className="whitespace-nowrap">· <Ago iso={u.at} /></span>
                    </p>
                  </li>
                ) : (
                  <UpdateRow
                    key={u._id}
                    u={u}
                    t={t}
                    today={today}
                    fresh={!known.has(u._id) && u.by !== t.me}
                    canAdd={canAdd}
                    busy={busy}
                    who={who}
                    name={name}
                    act={act}
                  />
                )
              )}
            </ol>
          ) : null}
          {more ? (
            <div className="mt-2 flex justify-center">
              <button type="button" className="chip chip-sm" onClick={showOlder} disabled={busy === "older"}>
                Show older
              </button>
            </div>
          ) : null}
        </section>
      </div>

      <aside className="min-w-0 lg:col-span-4 lg:mt-[3.75rem]">
        <WhoSees t={t} who={who} name={name} companion={companion} />
      </aside>
    </div>
  );
}

function noteWords(u: ThreadUpdateT, t: SharedThreadT, name: (h: string) => string, names: (hs: string[]) => string): string {
  const by = u.by === t.me ? "You" : name(u.by);
  const people = names(u.people);
  if (u.what === "shared") return `${by} shared ${t.title} with ${people}`;
  if (u.what === "unshared") return `${by} stopped sharing it with ${people}`;
  if (u.what === "private") return `${by} made it private again`;
  return `${by} left`;
}

/** One update: who, when, what, the cheers on it and its comments. */
function UpdateRow({
  u,
  t,
  today,
  fresh,
  canAdd,
  busy,
  who,
  name,
  act,
}: {
  u: ThreadUpdateT;
  t: SharedThreadT;
  today: string;
  fresh: boolean;
  canAdd: boolean;
  busy: string | null;
  who: (h: string) => Who;
  name: (h: string) => string;
  act: (body: Body) => Promise<boolean>;
}) {
  const [commenting, setCommenting] = useState(false);
  const by = who(u.by);
  const mine = u.by === t.me;
  const line = cheersLine(u.cheers, t.me, (h) => firstOf(who(h).name));
  const status = u.status ?? t.status;
  return (
    <li className="rule appear border-t-2 py-4 first:border-t-0">
      <div className="flex items-center gap-3">
        <Avatar name={by.name} hue={by.hue} size={36} />
        <p className="flex min-w-0 flex-wrap items-center gap-x-2 text-[0.875rem] leading-tight">
          <span className="font-semibold">{mine ? "You" : firstOf(by.name)}</span>
          <span className="text-ink/70">
            · <Ago iso={u.at} />
          </span>
          {fresh ? (
            <span className="tag" data-hue="1">
              New
            </span>
          ) : null}
        </p>
      </div>
      <div className="mt-2 min-w-0 sm:-mt-0.5 sm:pl-12">
        {u.text ? (
          <p className="text-[1.0625rem] leading-snug [overflow-wrap:anywhere]">{u.text}</p>
        ) : (
          <p className={`status-${status} flex items-center gap-2 text-[1.0625rem] leading-snug`}>
            <span className="pip" aria-hidden />
            <span className="text-ink">{stepWords(u, t, today)}</span>
          </p>
        )}
        {!mine && canAdd ? (
          <div className="mt-3 max-w-[24rem]">
            <CheerRow cheers={u.cheers} me={t.me} author={firstOf(by.name)} disabled={busy === "cheer"} onCheer={(kind) => void act({ action: "cheer", update: u._id, kind })} />
          </div>
        ) : null}
        {line ? <p className="mt-2 text-[0.8125rem] text-ink/75">{line}</p> : null}
        {u.comments.length ? (
          <ul aria-label="Comments" className="mt-3 grid gap-2">
            {u.comments.map((c) => {
              const p = who(c.by);
              return (
                <li key={c._id} className="well flex items-start gap-2.5 px-3 py-2.5">
                  <Avatar name={p.name} hue={p.hue} size={26} />
                  <div className="min-w-0">
                    <p className="text-[0.8125rem] leading-tight">
                      <span className="font-semibold">{c.by === t.me ? "You" : name(c.by)}</span>{" "}
                      <span className="text-ink/70">
                        · <Ago iso={c.at} />
                      </span>
                    </p>
                    <p className="mt-0.5 text-[0.9375rem] leading-snug [overflow-wrap:anywhere]">{c.text}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
        {canAdd ? (
          commenting ? (
            <div className="mt-3">
              <CommentBox
                busy={busy === "comment"}
                onPost={async (text) => {
                  const ok = await act({ action: "comment", update: u._id, text });
                  if (ok) setCommenting(false);
                  return ok;
                }}
                onCancel={() => setCommenting(false)}
              />
            </div>
          ) : (
            <button type="button" className="not-now mt-1 -ml-0.5" onClick={() => setCommenting(true)}>
              Comment
            </button>
          )
        ) : null}
      </div>
    </li>
  );
}

function CommentBox({ onPost, onCancel, busy }: { onPost: (text: string) => Promise<boolean>; onCancel: () => void; busy: boolean }) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  useEffect(() => {
    input.current?.focus();
  }, []);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (value.trim() && !busy) await onPost(value.trim());
  }
  return (
    <form onSubmit={submit} className="grid min-w-0 grid-cols-1 gap-2">
      <label htmlFor={id} className="sr-only">
        Your comment
      </label>
      <div className="flex min-w-0 items-center gap-2">
        <input
          ref={input}
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
        <Button type="submit" variant="secondary" className="shrink-0" disabled={!value.trim() || busy}>
          Comment
        </Button>
      </div>
    </form>
  );
}

/** Who sees what on this thread, in true words. */
function WhoSees({ t, who, name, companion }: { t: SharedThreadT; who: (h: string) => Who; name: (h: string) => string; companion: string }) {
  const id = useId();
  const others = [t.owner, ...t.with].filter((h) => h !== t.me);
  const firsts = others.map(name);
  const shared = t.with.length > 0 && !t.archived;
  const title = shared ? `${listOf(firsts)} ${firsts.length === 1 ? "sees" : "see"}` : "No one else on Kata sees it";
  const they = !t.mine
    ? ["What you add to it: your updates, comments and cheers", "That you’re on it"]
    : shared
      ? [`${t.title}: its name and where it stands`, "Every update and comment on it, and who wrote each", "Who it’s shared with"]
      : ["Nothing. Share it and they see its name, where it stands and everything added from then on."];
  const kept = t.mine
    ? ["Its notes, next step, tags and numbers", "Your other threads, unless you share them too", `Your pages, and what you tell ${companion}`]
    : ["Your own threads, unless you share them", `Your pages, and what you tell ${companion}`];
  return (
    <section aria-labelledby={id} className="card p-4 sm:p-6">
      <h2 id={id} className="font-display text-display-s">
        Who sees what
      </h2>
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-1">
        <div className="well p-4">
          <div className="flex min-h-9 items-center gap-3">
            {shared && others.length ? <Faces people={others.map(who)} size={30} max={4} /> : null}
            <h3 className="font-semibold leading-tight">{title}</h3>
          </div>
          <ul className="mt-3 grid gap-2 text-[0.9375rem]">
            {they.map((x) => (
              <li key={x} className="flex gap-2.5">
                <Icon name="eye" className="mt-[0.2rem] h-4 w-4 shrink-0 text-ink/70" />
                <span className="min-w-0">{x}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="well p-4">
          <div className="flex min-h-9 items-center gap-3">
            <span aria-hidden className="grid h-[30px] w-[30px] place-items-center rounded-full border-2 border-edge bg-surface">
              <Icon name="lock" className="h-4 w-4" strokeWidth={1.9} />
            </span>
            <h3 className="font-semibold leading-tight">Stays private</h3>
          </div>
          <ul className="mt-3 grid gap-2 text-[0.9375rem]">
            {kept.map((x) => (
              <li key={x} className="flex gap-2.5">
                <Icon name="lock" className="mt-[0.2rem] h-4 w-4 shrink-0 text-ink/70" strokeWidth={1.9} />
                <span className="min-w-0">{x}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="mt-4 text-[0.875rem] text-ink/70">
        Each thread is shared on its own: sharing one shares nothing else. {companion} never adds anything to a shared thread.
      </p>
    </section>
  );
}

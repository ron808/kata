"use client";

/**
 * Your people: the few the writer wants to see every time. Until they pick any, everyone they
 * follow counts; once they've picked some, the People feed and home show only those. Picking is
 * a star on someone they follow (here, or on that person's profile); everyone else stays followed.
 *
 *   <YourPeopleBar following={people} onChange={…} />   the strip above the feed, and the chooser
 *   <YourPeopleStar person={p} onChange={…} />           the star on its own
 */

import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/shared/Avatar";
import { Button } from "@/components/shared/Button";
import { Icon } from "@/components/shared/Icon";
import { useToast } from "@/components/shared/Toast";
import type { PersonT } from "@/lib/types";
import { api, failure } from "./api";
import { ShareProfile } from "./ShareProfile";

export function YourPeopleStar({
  person,
  onChange,
  compact = false,
}: {
  person: PersonT;
  onChange?: (person: PersonT) => void;
  compact?: boolean;
}) {
  const { toast } = useToast();
  const [p, setP] = useState(person);
  const [prev, setPrev] = useState(person);
  const [busy, setBusy] = useState(false);
  if (person !== prev) {
    setPrev(person);
    setP(person);
  }
  if (!p.isFollowing || p.isMe) return null;

  async function toggle() {
    const want = !p.isClose;
    const guess = { ...p, isClose: want };
    setP(guess);
    onChange?.(guess);
    setBusy(true);
    const r = await api<{ person: PersonT }>("/api/follow", { method: "PATCH", body: { handle: p.handle, close: want } });
    setBusy(false);
    if (r.ok) {
      setP(r.data.person);
      onChange?.(r.data.person);
    } else {
      setP(p);
      onChange?.(p);
      toast(failure(r, "That didn’t save. Try again."), "danger");
    }
  }

  const first = p.name.trim().split(/\s+/)[0] || p.name;
  if (compact) {
    return (
      <button
        type="button"
        aria-pressed={p.isClose}
        aria-label={p.isClose ? `Take ${first} out of your people` : `Add ${first} to your people`}
        disabled={busy}
        onClick={toggle}
        className="chip !h-11 !w-11 shrink-0 !px-0"
      >
        <Icon name="star" className="h-5 w-5" strokeWidth={p.isClose ? 2.4 : 1.8} />
      </button>
    );
  }
  return (
    <button type="button" aria-pressed={p.isClose} disabled={busy} onClick={toggle} className="chip shrink-0">
      <Icon name="star" className="h-4 w-4" strokeWidth={2.2} />
      {p.isClose ? "In your people" : "Add to your people"}
    </button>
  );
}

/** Up to a handful of faces, overlapping like stickers. */
function Faces({ people }: { people: PersonT[] }) {
  const shown = people.slice(0, 6);
  return (
    <ul className="flex shrink-0 items-center" aria-hidden>
      {shown.map((p, i) => (
        <li key={p.handle} className={i ? "-ml-3" : ""} style={{ zIndex: shown.length - i }}>
          <Avatar name={p.name} hue={p.hue} size={40} className="shadow-sticker-sm" />
        </li>
      ))}
    </ul>
  );
}

export function YourPeopleBar({
  following,
  handle,
  name,
  onChange,
  onDone,
  onFind,
}: {
  following: PersonT[];
  /** The writer's own handle, for sharing their profile; null until they pick one. */
  handle: string | null;
  name: string;
  onChange: (person: PersonT) => void;
  /** The chooser closed after a change: the feed should show the new people. */
  onDone: () => void;
  onFind: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [changed, setChanged] = useState(false);
  const close = following.filter((p) => p.isClose);
  const chosen = close.length > 0;
  const yours = chosen ? close : following;

  function change(p: PersonT) {
    setChanged(true);
    onChange(p);
  }

  function done() {
    setOpen(false);
    if (changed) onDone();
    setChanged(false);
  }

  if (!following.length) {
    return (
      <section aria-labelledby="yours-heading" className="well p-4 sm:p-5">
        <h2 id="yours-heading" className="font-semibold">
          Your people
        </h2>
        <p className="mt-1 text-[0.9375rem] text-ink/75">
          They’re the people you follow. Look someone up by name, or share your profile so friends can follow you.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" className="!h-11" onClick={onFind}>
            <Icon name="search" className="h-4 w-4" />
            Find people
          </Button>
          {handle ? <ShareProfile handle={handle} name={name} variant="quiet" className="!h-11" /> : null}
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="yours-heading" className="well p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <Faces people={yours} />
        <div className="min-w-0 flex-1 basis-56">
          <h2 id="yours-heading" className="font-semibold">
            Your people{" "}
            <span className="font-normal text-ink/65">
              · {yours.length} {yours.length === 1 ? "person" : "people"}
            </span>
          </h2>
          <p className="mt-0.5 text-[0.875rem] text-ink/75">
            {chosen ? "Only the people you picked show up here." : "Everyone you follow, for now. Pick the ones you want to see every time."}
          </p>
        </div>
        <Button variant="secondary" size="sm" className="!h-11" aria-expanded={open} onClick={() => (open ? done() : setOpen(true))}>
          <Icon name="star" className="h-4 w-4" />
          {open ? "Done" : chosen ? "Change" : "Choose your people"}
        </Button>
      </div>

      {open ? (
        <div className="appear mt-4">
          <p className="text-[0.875rem] text-ink/70">Star the people you want to see every time. Everyone else stays followed; they just don’t fill your feed.</p>
          <ul className="mt-2 max-h-[min(26rem,60svh)] overflow-y-auto overscroll-contain rounded-md bg-surface px-3 [scrollbar-width:thin]">
            {following.map((p) => (
              <li key={p.handle} className="rule flex min-h-14 items-center gap-3 border-t-2 py-1.5 first:border-t-0">
                <Avatar name={p.name} hue={p.hue} size={36} />
                <Link href={`/u/${p.handle}`} className="min-w-0 flex-1 py-1">
                  <span className="block truncate font-semibold leading-tight">{p.name}</span>
                  <span className="block truncate text-[0.8125rem] text-ink/65">@{p.handle}</span>
                </Link>
                <YourPeopleStar person={p} compact onChange={change} />
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-end">
            <Button variant="secondary" size="sm" className="!h-11" onClick={done}>
              Done
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

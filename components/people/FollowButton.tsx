"use client";

/**
 * FollowButton — follows or unfollows one person, optimistically.
 *
 *   <FollowButton person={person} onChange={setPerson} />
 *
 * Props: person (a PersonT, or at least handle, name, isFollowing, followsYou, isMe);
 * size? ("md" | "sm"; sm is smaller only with a fine pointer, phones keep 44px);
 * onChange?(person) (called at once with the guess, then with what the server says); className?.
 * Reads Follow, Follow back, Following, or Friends once you follow each other. Renders nothing for
 * yourself. Without a handle it asks for one in a small dialog, then follows.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/shared/Icon";
import { useToast } from "@/components/shared/Toast";
import type { PersonT } from "@/lib/types";
import { api, failure } from "./api";
import { HandleClaim } from "./HandleClaim";
import { useViewerHandle } from "./viewer";

export type Followable = Pick<PersonT, "handle" | "name" | "isFollowing" | "followsYou" | "isMe"> & Partial<PersonT>;

export function followLabel(p: Pick<PersonT, "isFollowing" | "followsYou">): string {
  if (p.isFollowing) return p.followsYou ? "Friends" : "Following";
  return p.followsYou ? "Follow back" : "Follow";
}

export function FollowButton<T extends Followable>({
  person,
  size = "md",
  onChange,
  className = "",
}: {
  person: T;
  size?: "md" | "sm";
  onChange?: (person: T) => void;
  className?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const handle = useViewerHandle();
  const [state, setState] = useState(person);
  const [prev, setPrev] = useState(person);
  if (person !== prev) {
    setPrev(person);
    setState(person);
  }
  const [asking, setAsking] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  // Requests run one at a time; when the last one lands, the server's word stands.
  const queue = useRef<Promise<void>>(Promise.resolve());
  const pending = useRef(0);
  const confirmed = useRef<T>(person);
  const refresh = useRef(false);
  useEffect(() => {
    // Hosts echo the guess back as a new prop; only a settled prop is the server's word.
    if (pending.current === 0) confirmed.current = person;
  }, [person]);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (asking && !d.open) d.showModal();
    if (!asking && d.open) d.close();
  }, [asking]);

  if (state.isMe) return null;

  function show(next: T) {
    setState(next);
    onChange?.(next);
  }

  function toggle(current: T, knownHandle = false) {
    if (handle === null && !knownHandle) {
      setAsking(true);
      return;
    }
    const want = !current.isFollowing;
    const count = current.followerCount;
    show({ ...current, isFollowing: want, ...(typeof count === "number" ? { followerCount: Math.max(0, count + (want ? 1 : -1)) } : {}) });
    pending.current += 1;
    queue.current = queue.current.then(async () => {
      const r = await api<{ person: PersonT | null }>("/api/follow", {
        method: want ? "POST" : "DELETE",
        body: { handle: current.handle },
      });
      pending.current -= 1;
      if (r.ok && r.data.person) confirmed.current = { ...confirmed.current, ...r.data.person };
      else if (!r.ok && r.needsHandle) setAsking(true);
      else if (!r.ok) toast(failure(r, `Couldn’t ${want ? "follow" : "unfollow"} ${current.name}. Try again.`), "danger");
      if (pending.current === 0) {
        show(confirmed.current);
        if (refresh.current) {
          refresh.current = false;
          router.refresh();
        }
      }
    });
  }

  const label = followLabel(state);
  const small = size === "sm" ? "lg:min-h-9 lg:px-3 lg:text-[0.8125rem]" : "";
  const first = state.name.trim().split(/\s+/)[0] || state.name;

  return (
    <>
      <button
        type="button"
        aria-pressed={state.isFollowing}
        onClick={() => toggle(state)}
        className={`chip shrink-0 ${small} ${className}`}
      >
        <Icon name={state.isFollowing ? "check" : "plus"} className="h-4 w-4" strokeWidth={2.2} />
        {label}
        <span className="sr-only">
          {state.isFollowing && state.followsYou ? " with " : " "}
          {state.name}
        </span>
      </button>
      <dialog
        ref={dialog}
        aria-label={`Pick a handle to follow ${first}`}
        onClose={() => setAsking(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setAsking(false);
        }}
        className="fixed inset-0 m-auto h-fit max-h-[calc(100svh-2rem)] w-[min(27rem,calc(100vw-2rem))] overflow-visible border-0 bg-transparent p-0 text-ink backdrop:bg-[rgb(22_18_14/0.55)]"
      >
        {asking ? (
          <HandleClaim
            purpose={`to follow ${first}`}
            framed="dialog"
            onCancel={() => setAsking(false)}
            onClaimed={() => {
              setAsking(false);
              refresh.current = true;
              toggle(state, true);
            }}
          />
        ) : null}
      </dialog>
    </>
  );
}

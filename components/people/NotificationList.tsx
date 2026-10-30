"use client";

/**
 * NotificationList — /notifications under its header: who followed you, reacted or replied,
 * newest first, each linking to the person or the moment. Viewing the page marks everything
 * read (then refreshes, so the bell clears); what was new stays marked until "Mark all read".
 * Props: items, unread, myHandle (for links to your moments), extras (follow-back people and
 * reply texts, from app/(app)/notifications/extras.ts).
 */

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { EmptyNote, PageHeader } from "@/components/shared/AppPage";
import { Avatar } from "@/components/shared/Avatar";
import { Button, buttonClass } from "@/components/shared/Button";
import { Icon, type IconName } from "@/components/shared/Icon";
import type { NotificationT, PersonT, ReactionKind } from "@/lib/types";
import { api } from "./api";
import { FollowButton } from "./FollowButton";
import { REACTION_LABEL } from "./labels";
import { Ago } from "./time";

const BADGE: Record<NotificationT["kind"], IconName> = { follow: "user", reaction: "star", reply: "chat" };

function reactionPhrase(kind: ReactionKind | null) {
  if (kind === "hug") return { before: "sent a", after: "for" };
  return { before: "said", after: "to" };
}

export function NotificationList({
  items,
  unread,
  myHandle,
  extras,
}: {
  items: NotificationT[];
  unread: number;
  myHandle: string | null;
  extras: { people: Record<string, PersonT>; replies: Record<string, string> };
}) {
  const router = useRouter();
  const [fresh, setFresh] = useState<Set<string>>(() => new Set(items.filter((n) => !n.read).map((n) => n._id)));
  const marked = useRef(false);

  // Seen is read: tell the server once, then refresh so the bell's count goes.
  useEffect(() => {
    if (marked.current || !unread) return;
    marked.current = true;
    api("/api/notifications", { method: "POST", body: { read: "all" } }).then((r) => {
      if (r.ok) router.refresh();
      else marked.current = false;
    });
  }, [unread, router]);

  function markAll() {
    setFresh(new Set());
    if (unread) {
      api("/api/notifications", { method: "POST", body: { read: "all" } }).then((r) => {
        if (r.ok) router.refresh();
      });
    }
  }

  const newer = items.filter((n) => fresh.has(n._id));
  const older = items.filter((n) => !fresh.has(n._id));

  return (
    <>
      <PageHeader
        title="Notifications"
        lede="Who followed you, and who answered what you shared."
        actions={
          items.length ? (
            <Button variant="secondary" onClick={markAll} disabled={!fresh.size}>
              <Icon name="check" className="h-4 w-4" strokeWidth={2.2} />
              Mark all read
            </Button>
          ) : null
        }
      />

      {items.length ? (
        <div className="mt-10 space-y-10">
          {newer.length ? <Group title="New" count={newer.length} items={newer} fresh myHandle={myHandle} extras={extras} /> : null}
          {older.length ? <Group title={newer.length ? "Earlier" : undefined} items={older} myHandle={myHandle} extras={extras} /> : null}
        </div>
      ) : (
        <div className="mt-10">
          <EmptyNote
            action={
              <Link href="/people?tab=find" className={buttonClass({ variant: "secondary" })}>
                Find people
              </Link>
            }
          >
            Nothing here yet. When someone follows you, reacts to a moment or replies, you’ll see it here.
          </EmptyNote>
        </div>
      )}
    </>
  );
}

function Group({
  title,
  count,
  items,
  fresh = false,
  myHandle,
  extras,
}: {
  title?: string;
  count?: number;
  items: NotificationT[];
  fresh?: boolean;
  myHandle: string | null;
  extras: { people: Record<string, PersonT>; replies: Record<string, string> };
}) {
  const id = title ? `notes-${title.toLowerCase().replace(/\s+/g, "-")}` : undefined;
  return (
    <section aria-labelledby={id} aria-label={title ? undefined : "All notifications"}>
      {title ? (
        <h2 id={id} className="mb-4 flex items-center gap-2.5 font-display text-display-s">
          {title}
          {count ? (
            <span className="grid h-7 min-w-7 place-items-center rounded-full border-2 border-edge bg-accent px-1.5 font-sans text-[0.875rem] font-bold leading-none tracking-normal text-on-accent tabular-nums">
              {count}
            </span>
          ) : null}
        </h2>
      ) : null}
      <ol className="card px-4 sm:px-6">
        {items.map((n) => (
          <Row key={n._id} n={n} fresh={fresh} myHandle={myHandle} person={extras.people[n.actor.handle]} reply={extras.replies[n._id]} />
        ))}
      </ol>
    </section>
  );
}

function Row({
  n,
  fresh,
  myHandle,
  person,
  reply,
}: {
  n: NotificationT;
  fresh: boolean;
  myHandle: string | null;
  person?: PersonT;
  reply?: string;
}) {
  const href =
    n.kind === "follow" || !n.momentId ? `/u/${n.actor.handle}` : myHandle ? `/u/${myHandle}/m/${n.momentId}` : "/people";
  const excerpt = n.momentText ? <q className="font-medium text-ink/85 [quotes:'‘'_'’']">{n.momentText}</q> : null;

  let what: ReactNode;
  if (n.kind === "follow") {
    what = <> followed you.</>;
  } else if (n.kind === "reaction") {
    const { before, after } = reactionPhrase(n.reaction);
    what = (
      <>
        {" "}
        {before} <span className="tag mx-0.5 align-[0.1em]">{n.reaction ? REACTION_LABEL[n.reaction] : "a reaction"}</span> {after}{" "}
        {excerpt ?? "your moment"}
      </>
    );
  } else {
    what = reply ? (
      <>
        {" "}
        replied: <q className="text-ink [quotes:'‘'_'’']">{reply}</q>
      </>
    ) : (
      <> replied to {excerpt ?? "your moment"}</>
    );
  }

  return (
    <li className="rule relative flex items-start gap-3 border-t-2 py-4 first:border-t-0 sm:gap-4">
      <span className="relative mt-0.5 shrink-0">
        <Avatar name={n.actor.name} hue={n.actor.hue} size={46} />
        <span
          aria-hidden
          className="absolute -bottom-1 -right-1.5 grid h-6 w-6 place-items-center rounded-full border-2 border-edge bg-surface text-ink"
        >
          <Icon name={BADGE[n.kind]} className="h-3.5 w-3.5" strokeWidth={2} />
        </span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-3 leading-snug [overflow-wrap:anywhere]">
          <Link href={href} className="font-semibold underline-offset-4 after:absolute after:inset-0 after:content-[''] hover:underline">
            {n.actor.name}
          </Link>
          {what}
        </p>
        {n.kind === "reply" && reply && n.momentText ? (
          <p className="mt-1 line-clamp-1 text-[0.875rem] text-ink/65">
            on <q className="[quotes:'‘'_'’']">{n.momentText}</q>
          </p>
        ) : null}
        <p className="mt-1.5 flex items-center gap-2 text-[0.8125rem] text-ink/65">
          <Ago iso={n.createdAt} />
          {fresh ? (
            <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
              <span aria-hidden className="h-2 w-2 rounded-full bg-accent" />
              New
            </span>
          ) : null}
        </p>
      </div>
      {n.kind === "follow" && person && !person.isMe ? (
        <div className="relative z-10 shrink-0 self-center">
          <FollowButton size="sm" person={person} />
        </div>
      ) : null}
    </li>
  );
}

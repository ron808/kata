"use client";

/**
 * MomentCard — one shared moment: who, what kind, when, the text, its thread and tags, the
 * Reactions row and the Replies thread. A sticker card on the page; `compact` makes it a .well
 * to sit inside another card (the home page's people row).
 *
 *   <MomentCard moment={m} />
 *   <MomentCard moment={m} compact />
 *
 * Props: moment: MomentT; compact?: boolean. Optional: followable? (true, or what's known of
 * the viewer and the author, puts a FollowButton by the author's name, as on Discover) with
 * onFollow?(person); repliesOpen? + initialReplies? (open the thread at once, as on the moment's
 * own page); onTag?(tag) (filter in place instead of following the tag's link to Discover);
 * onDelete?(id) (after the viewer deletes their own moment; the card hides itself).
 *
 * Someone else's moment has an "Ask Maru" button, which opens the companion about it (to
 * draft a reply, say), and every card is marked with its id so the companion can read the
 * posts in view when asked about "this one".
 */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar, MaruMark } from "@/components/shared/Avatar";
import { Button } from "@/components/shared/Button";
import { askAbout, useCompanion } from "@/components/shared/Companion";
import { Icon } from "@/components/shared/Icon";
import { useToast } from "@/components/shared/Toast";
import type { MomentT, PersonT, ReplyT } from "@/lib/types";
import { api, failure } from "./api";
import { FollowButton, type Followable } from "./FollowButton";
import { MOMENT_LABEL, hue8 } from "./labels";
import { Reactions } from "./Reactions";
import { Replies } from "./Replies";
import { Ago } from "./time";
import { tagHref } from "./view";

export function MomentCard({
  moment,
  compact = false,
  followable = false,
  onFollow,
  repliesOpen = false,
  initialReplies,
  onTag,
  onDelete,
}: {
  moment: MomentT;
  compact?: boolean;
  followable?: boolean | Pick<PersonT, "isFollowing" | "followsYou">;
  onFollow?: (person: Followable) => void;
  repliesOpen?: boolean;
  initialReplies?: ReplyT[];
  onTag?: (tag: string) => void;
  onDelete?: (id: string) => void;
}) {
  const { toast } = useToast();
  const { name: companion } = useCompanion();
  const [gone, setGone] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const keep = useRef<HTMLButtonElement>(null);
  // Asking moves focus to the safe answer, so a keyboard can't delete by accident.
  useEffect(() => {
    if (confirming) keep.current?.focus();
  }, [confirming]);
  const a = moment.author;
  const known = typeof followable === "object" ? followable : null;
  const author = useMemo<Followable>(
    () => ({
      handle: a.handle,
      name: a.name,
      isFollowing: known?.isFollowing ?? false,
      followsYou: known?.followsYou ?? false,
      isMe: moment.isMine,
    }),
    [a.handle, a.name, known?.isFollowing, known?.followsYou, moment.isMine]
  );
  if (gone) return null;

  const profile = `/u/${a.handle}`;
  const permalink = `/u/${a.handle}/m/${moment._id}`;
  const hue = hue8(a.hue);
  // Short moments read big; longer ones at reading size.
  const big = !compact && moment.text.length <= 110 && !moment.text.includes("\n");

  async function remove() {
    setDeleting(true);
    const r = await api(`/api/moments/${moment._id}`, { method: "DELETE" });
    setDeleting(false);
    if (!r.ok && r.status !== 404) {
      toast(failure(r, "Couldn’t delete that moment. Try again."), "danger");
      return;
    }
    toast("Moment deleted.");
    setGone(true);
    onDelete?.(moment._id);
  }

  return (
    <article
      aria-label={moment.isMine ? "Your moment" : `Moment from ${a.name}`}
      data-screen-post={moment._id}
      className={compact ? "well flex h-full flex-col p-4" : "card flex flex-col p-4 sm:p-6"}
    >
      <header className="flex flex-wrap items-start gap-x-3 gap-y-2">
        <Link href={profile} tabIndex={-1} aria-hidden className="shrink-0">
          <Avatar name={a.name} hue={a.hue} size={compact ? 38 : 46} />
        </Link>
        <div className="min-w-0 flex-1 basis-[8.5rem] pt-0.5">
          <p className="flex min-w-0 items-baseline gap-x-1.5 leading-tight">
            <Link href={profile} className="-mx-2 -my-3 max-w-full shrink-0 truncate px-2 py-3 font-semibold underline-offset-4 hover:underline">
              {a.name}
            </Link>
            <span className="min-w-0 truncate text-[0.875rem] text-ink/65">@{a.handle}</span>
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[0.8125rem] text-ink/65">
            <span className="font-semibold text-ink/80">{MOMENT_LABEL[moment.kind]}</span>
            <span aria-hidden>·</span>
            <span className="sr-only">, </span>
            <Link href={permalink} className="-mx-3 -my-3 inline-flex min-w-11 justify-center px-3 py-3 underline-offset-4 hover:text-ink hover:underline">
              <Ago iso={moment.createdAt} />
            </Link>
            {moment.visibility === "friends" ? (
              <>
                <span aria-hidden>·</span>
                <span className="sr-only">, </span>
                <span className="inline-flex items-center gap-1" title="Only friends see this: people who follow each other">
                  <Icon name="lock" className="h-3.5 w-3.5" strokeWidth={1.9} />
                  Friends<span className="sr-only"> only</span>
                </span>
              </>
            ) : null}
          </p>
        </div>
        {!moment.isMine ? (
          <div className="-mr-1.5 -mt-1 ml-auto flex shrink-0 items-center gap-1">
            {followable ? <FollowButton size="sm" person={author} onChange={onFollow} /> : null}
            <button
              type="button"
              onClick={() => askAbout({ id: moment._id, label: `${a.name}’s post`, text: moment.text.replace(/\s+/g, " ").slice(0, 80) })}
              aria-label={`Ask ${companion} about ${a.name}’s post`}
              title={`Ask ${companion} about this`}
              className="grid h-11 w-11 place-items-center rounded-full transition-transform duration-300 hover:-translate-y-px"
            >
              <MaruMark size={compact ? 28 : 30} />
            </button>
          </div>
        ) : null}
        {moment.isMine ? (
          <button
            type="button"
            onClick={() => setConfirming((c) => !c)}
            aria-expanded={confirming}
            aria-label="Delete this moment"
            className="-mr-2 -mt-1 ml-auto grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink/60 transition-colors hover:bg-ink/[0.06] hover:text-ink"
          >
            <Icon name="trash" className="h-[1.15rem] w-[1.15rem]" />
          </button>
        ) : null}
      </header>

      <p
        className={`whitespace-pre-line [overflow-wrap:anywhere] ${
          big
            ? "mt-3.5 text-[clamp(1.2rem,1.1rem+0.45vw,1.45rem)] font-medium leading-[1.3] tracking-[-0.01em]"
            : compact
              ? "mt-3 text-[0.9375rem] leading-snug"
              : "mt-3.5 text-prose"
        }`}
      >
        {moment.text}
      </p>

      {moment.threadTitle || moment.tags.length ? (
        <div className="mt-2 flex flex-wrap items-center gap-x-3">
          {moment.threadTitle ? (
            <p className="flex min-h-11 min-w-0 items-center gap-1.5 text-[0.875rem] font-medium text-ink/70">
              <Icon name="threads" className="h-4 w-4" />
              <span className="sr-only">Thread: </span>
              <span className="truncate">{moment.threadTitle}</span>
            </p>
          ) : null}
          {moment.tags.length ? (
            <ul aria-label="Tags" className="flex flex-wrap gap-x-1.5" data-hue={hue}>
              {moment.tags.map((t) => (
                <li key={t}>
                  <Link
                    href={tagHref(t)}
                    onClick={
                      onTag
                        ? (e) => {
                            e.preventDefault();
                            onTag(t);
                          }
                        : undefined
                    }
                    className="group inline-flex min-h-11 min-w-11 items-center justify-center"
                  >
                    <span className="tag transition-transform duration-300 group-hover:-translate-y-px">#{t}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {confirming ? (
        <div data-hue="0" className="appear mt-4 rounded-md border-2 border-edge bg-tint p-3 sm:p-4" role="group" aria-label="Delete this moment?">
          <p className="font-semibold text-deep">Delete this moment?</p>
          <p className="mt-0.5 text-[0.875rem] text-ink/75">Its reactions and replies go with it. This can’t be undone.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="danger" onClick={remove} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
            <Button ref={keep} variant="quiet" onClick={() => setConfirming(false)} disabled={deleting}>
              Keep it
            </Button>
          </div>
        </div>
      ) : null}

      <div className={`mt-auto ${moment.threadTitle || moment.tags.length ? "pt-2" : "pt-4"}`}>
        <Reactions momentId={moment._id} reactions={moment.reactions} mine={moment.mine} author={a.name} />
        <Replies
          momentId={moment._id}
          count={moment.replyCount}
          momentIsMine={moment.isMine}
          author={a.name}
          open={repliesOpen}
          initial={initialReplies}
          compact={compact}
        />
      </div>
    </article>
  );
}

"use client";

/**
 * PersonCard — a person as a sticker card: their avatar in their hue, name, @handle, role, bio,
 * follower count and a FollowButton. The whole card opens their profile.
 *
 *   <PersonCard person={p} />
 *   <PersonCard person={p} compact />   a row (avatar, name, @handle · role, Follow) for lists
 *                                       inside another card
 *
 * Props: person: PersonT; compact?: boolean; onChange?(person) (after a follow or unfollow).
 */

import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/shared/Avatar";
import type { PersonT } from "@/lib/types";
import { FollowButton } from "./FollowButton";
import { hue8 } from "./labels";

export function PersonCard({
  person,
  compact = false,
  onChange,
}: {
  person: PersonT;
  compact?: boolean;
  onChange?: (person: PersonT) => void;
}) {
  const [p, setP] = useState(person);
  const [prev, setPrev] = useState(person);
  if (person !== prev) {
    setPrev(person);
    setP(person);
  }
  const href = `/u/${p.handle}`;
  const change = (next: PersonT) => {
    setP(next);
    onChange?.(next);
  };

  if (compact) {
    return (
      <div className="relative flex min-h-16 items-center gap-3 py-2">
        <Avatar name={p.name} hue={p.hue} size={42} />
        <div className="min-w-0 flex-1">
          <Link
            href={href}
            className="-my-3 block truncate py-3 font-semibold leading-tight underline-offset-4 after:absolute after:inset-0 after:content-[''] hover:underline"
          >
            {p.name}
          </Link>
          <p className="mt-0.5 truncate text-[0.8125rem] text-ink/65">
            @{p.handle}
            {p.role && p.role !== "Custom" ? ` · ${p.role}` : ""}
          </p>
        </div>
        <div className="relative z-10">
          <FollowButton size="sm" person={p} onChange={change} />
        </div>
      </div>
    );
  }

  return (
    <article className="card flex h-full flex-col p-5 transition-[transform,box-shadow] duration-300 ease-out hover:-translate-x-px hover:-translate-y-px hover:shadow-[6px_6px_0_var(--edge)]" data-hue={hue8(p.hue)}>
      <div className="flex items-start gap-4">
        <Avatar name={p.name} hue={p.hue} size={60} className="shadow-sticker-sm" />
        <div className="min-w-0 flex-1 pt-1">
          <h3 className="font-display text-[1.5rem] leading-[0.95] tracking-[-0.03em]">
            <Link href={href} className="-mx-1.5 -my-3 inline-block px-1.5 py-3 outline-offset-0 after:absolute after:inset-0 after:rounded-lg after:content-['']">
              {p.name}
            </Link>
          </h3>
          <p className="mt-1.5 truncate text-[0.875rem] text-ink/65">@{p.handle}</p>
        </div>
      </div>
      {p.role && p.role !== "Custom" ? (
        <p className="mt-3">
          <span className="tag">{p.role}</span>
        </p>
      ) : null}
      {p.bio ? <p className="mt-3 line-clamp-3 text-[0.9375rem] leading-snug text-ink/80">{p.bio}</p> : null}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pt-4">
        <p className="text-[0.8125rem] text-ink/65">
          <span className="font-semibold text-ink tabular-nums">{p.followerCount}</span> {p.followerCount === 1 ? "follower" : "followers"}
          <span aria-hidden> · </span>
          <span className="sr-only">, </span>
          <span className="font-semibold text-ink tabular-nums">{p.followingCount}</span> following
        </p>
        <div className="relative z-10">
          <FollowButton person={p} onChange={change} />
        </div>
      </div>
    </article>
  );
}

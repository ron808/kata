"use client";

/**
 * ProfileHeader — the top of /u/[handle]: a big avatar sticker in their hue, name, @handle,
 * role, bio, follower and following counts, and Follow and Message (or Edit profile on your own).
 * Props: person: PersonT; unlisted? (your own profile isn't listed in Discover or Find people).
 */

import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/shared/Avatar";
import { buttonClass } from "@/components/shared/Button";
import { Icon } from "@/components/shared/Icon";
import type { PersonT } from "@/lib/types";
import { FollowButton } from "./FollowButton";
import { hue8 } from "./labels";

export function ProfileHeader({ person, unlisted = false }: { person: PersonT; unlisted?: boolean }) {
  const [p, setP] = useState(person);
  const [prev, setPrev] = useState(person);
  if (person !== prev) {
    setPrev(person);
    setP(person);
  }
  const role = p.role && p.role !== "Custom" ? p.role : null;

  return (
    <section aria-labelledby="profile-name" data-hue={hue8(p.hue)} className="card bg-tint p-5 sm:p-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-9">
        <div className="shrink-0 self-start sm:self-center">
          <Avatar
            name={p.name}
            hue={p.hue}
            size={148}
            className="-rotate-3 shadow-sticker max-sm:!h-[6.5rem] max-sm:!w-[6.5rem] max-sm:!text-[2.9rem]"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
            <div className="min-w-0">
              <h1 id="profile-name" className="font-display text-display-m [overflow-wrap:anywhere]">
                {p.name}
              </h1>
              <p className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[0.9375rem]">
                <span className="font-semibold text-deep">@{p.handle}</span>
                {role ? <span className="tag">{role}</span> : null}
              </p>
            </div>
            {p.isMe ? (
              <Link href="/settings#profile" className={buttonClass({ variant: "secondary" })}>
                <Icon name="pen" className="h-4 w-4" />
                Edit profile
              </Link>
            ) : (
              <div className="flex flex-wrap items-center gap-2.5">
                <FollowButton person={p} onChange={setP} />
                <Link href={`/messages/${p.handle}`} className={buttonClass({ variant: "secondary" })}>
                  <Icon name="chat" className="h-4 w-4" />
                  Message
                </Link>
              </div>
            )}
          </div>

          {p.bio ? (
            <p className="mt-4 max-w-[40rem] text-lede">{p.bio}</p>
          ) : p.isMe ? (
            <p className="mt-4 max-w-[40rem] text-[0.9375rem] text-ink/70">
              No bio yet.{" "}
              <Link href="/settings#profile" className="link font-semibold text-ink">
                Add a line about yourself
              </Link>
            </p>
          ) : null}

          <dl className="mt-5 flex flex-wrap gap-3">
            {(
              [
                [p.followerCount === 1 ? "follower" : "followers", p.followerCount],
                ["following", p.followingCount],
              ] as const
            ).map(([label, n]) => (
              <div key={label} className="flex flex-col-reverse rounded-md border-2 border-edge bg-surface px-4 py-2.5">
                <dt className="text-[0.8125rem] font-medium text-ink/70">{label}</dt>
                <dd className="font-display text-[1.9rem] leading-none tabular-nums">{n}</dd>
              </div>
            ))}
          </dl>

          {p.isMe && unlisted ? (
            <p className="mt-5 flex max-w-[40rem] gap-2 text-[0.875rem] text-ink/75">
              <Icon name="lock" className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Your profile is unlisted: you don’t show up in Discover or Find people, though anyone with your handle can open
                this page.{" "}
                <Link href="/settings#profile" className="link font-semibold text-ink">
                  List it in settings
                </Link>
              </span>
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

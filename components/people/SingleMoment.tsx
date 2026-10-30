"use client";

/**
 * SingleMoment — a moment on its own page (/u/[handle]/m/[id]): the card with its replies open.
 * Deleting it there sends you back to your profile. Props: moment, replies.
 */

import { useRouter } from "next/navigation";
import type { MomentT, ReplyT } from "@/lib/types";
import { MomentCard } from "./MomentCard";

export function SingleMoment({ moment, replies }: { moment: MomentT; replies: ReplyT[] }) {
  const router = useRouter();
  return (
    <MomentCard
      moment={moment}
      repliesOpen
      initialReplies={replies}
      onDelete={() => router.replace(`/u/${moment.author.handle}`)}
    />
  );
}

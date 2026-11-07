import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth/authOptions";
import { shareCard } from "@/lib/social/share";
import { Avatar } from "@/components/shared/Avatar";
import { buttonClass } from "@/components/shared/Button";
import { Logo } from "@/components/shared/Logo";

/*
 * A profile link someone shared (kata-day.vercel.app/@handle, rewritten here by the proxy, or
 * /u/handle opened signed out). Anyone can see it, and chats show its picture
 * (./opengraph-image). Signed in, it's their profile instead.
 */

type Props = { params: Promise<{ handle: string }> };

const firstOf = (name: string) => name.trim().split(/\s+/)[0] || name;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const card = await shareCard((await params).handle);
  if (!card) return { title: "Kata", robots: { index: false } };
  const title = `${card.name} (@${card.handle}) on Kata`;
  const description = card.bio || `Follow ${firstOf(card.name)} on Kata, a daily journal with a companion.`;
  return {
    title,
    description,
    // Shared on purpose, not to be found by search engines.
    robots: { index: false, follow: false },
    openGraph: { title, description, type: "profile", url: `/@${card.handle}` },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function SharePage({ params }: Props) {
  const [{ handle }, session] = await Promise.all([params, auth()]);
  const card = await shareCard(handle);
  if (!card) notFound();
  if (session?.user?.id) redirect(`/u/${card.handle}`);
  const first = firstOf(card.name);
  const back = `/u/${card.handle}`;

  return (
    <div className="min-h-svh bg-ground px-margin">
      <header className="mx-auto flex h-[var(--header-h)] max-w-[64rem] items-center justify-between gap-4">
        <Link href="/" aria-label="Kata, home" className="-mx-1 flex min-h-11 items-center px-1">
          <Logo cut="ground" />
        </Link>
        <Link href={`/login?from=${encodeURIComponent(back)}`} className={buttonClass({ variant: "quiet" })}>
          Log in
        </Link>
      </header>
      <main id="main" className="mx-auto max-w-[38rem] pb-16 pt-[clamp(1.5rem,7svh,4.5rem)]">
        <article data-hue={card.hue} aria-labelledby="card-name" className="card relative bg-tint px-5 pb-8 pt-10 text-center sm:px-10 sm:pb-10">
          <span aria-hidden data-hue={(card.hue + 3) % 8} className="tape !w-28" />
          <Avatar name={card.name} hue={card.hue} size={132} className="mx-auto -rotate-3 shadow-sticker max-sm:!h-28 max-sm:!w-28 max-sm:!text-[3rem]" />
          <h1 id="card-name" className="mt-6 font-display text-display-m [overflow-wrap:anywhere]">
            {card.name}
          </h1>
          <p className="mt-3 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1.5 text-[0.9375rem]">
            <span className="font-semibold text-deep">@{card.handle}</span>
            {card.role ? <span className="tag">{card.role}</span> : null}
          </p>
          {card.bio ? <p className="mx-auto mt-5 max-w-[30rem] text-lede [overflow-wrap:anywhere]">{card.bio}</p> : null}
          <p className="mx-auto mt-6 max-w-[30rem] text-[0.9375rem] text-ink/75">
            {first} is on Kata, a daily journal with a companion. Follow {first} to see what they share. Once you follow each other, you can write.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href={`/register?follow=${card.handle}`} className={buttonClass({ size: "lg", className: "max-w-full" })}>
              <span className="truncate">Join Kata to follow {first}</span>
            </Link>
            <Link href={`/login?from=${encodeURIComponent(back)}`} className={buttonClass({ variant: "secondary", size: "lg" })}>
              I have an account
            </Link>
          </div>
        </article>
      </main>
    </div>
  );
}

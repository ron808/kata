import Link from "next/link";
import { Avatar } from "@/components/shared/Avatar";
import { MomentCard } from "@/components/people/MomentCard";
import type { MomentT, PersonT } from "@/lib/types";

/** The latest from the people you follow, or people to follow when there's nothing yet. */
export function PeopleRow({ moments, suggested }: { moments: MomentT[]; suggested: PersonT[] }) {
  return (
    <section aria-labelledby="people-heading" className="card p-4 sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div>
          <h2 id="people-heading" className="font-display text-display-s">
            Your people
          </h2>
          <p className="mt-1.5 text-[0.875rem] text-ink/65">
            {moments.length ? "What the people you follow chose to share." : "Follow a few people to see their wins and ships here."}
          </p>
        </div>
        <Link href={moments.length ? "/people" : "/people?tab=find"} className="link inline-flex min-h-11 items-center text-[0.875rem] font-semibold">
          {moments.length ? "See everyone" : "Find people"}
        </Link>
      </header>
      {moments.length ? (
        <ul className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          {moments.map((m) => (
            <li key={m._id} className="flex">
              <MomentCard moment={m} compact />
            </li>
          ))}
        </ul>
      ) : suggested.length ? (
        <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {suggested.map((p) => (
            <li key={p.handle}>
              <Link href={`/u/${p.handle}`} className="well flex min-h-16 items-center gap-3 p-3 transition-colors hover:bg-tint" data-hue={p.hue % 8}>
                <Avatar name={p.name} hue={p.hue} size={40} />
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{p.name}</span>
                  <span className="block truncate text-[0.8125rem] text-ink/65">{p.role}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

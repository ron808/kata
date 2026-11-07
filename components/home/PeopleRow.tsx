import Link from "next/link";
import { MomentCard } from "@/components/people/MomentCard";
import type { MomentT } from "@/lib/types";

/** The latest from your people: the ones you picked, or everyone you follow until you pick. */
export function PeopleRow({ moments }: { moments: MomentT[] }) {
  return (
    <section aria-labelledby="people-heading" className="card p-4 sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div>
          <h2 id="people-heading" className="font-display text-display-s">
            Your people
          </h2>
          <p className="mt-1.5 text-[0.875rem] text-ink/65">
            {moments.length ? "What your people chose to share." : "Follow a friend, or send them your profile, to see what they share here."}
          </p>
        </div>
        <Link href={moments.length ? "/people" : "/people?tab=find"} className="link inline-flex min-h-11 items-center text-[0.875rem] font-semibold">
          {moments.length ? "See all" : "Find people"}
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
      ) : null}
    </section>
  );
}

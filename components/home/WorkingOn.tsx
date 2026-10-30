import Link from "next/link";
import { Avatar } from "@/components/shared/Avatar";
import { Status } from "@/components/shared/Status";
import type { WorkingOnT } from "@/lib/social/working";
import { touchedPhrase } from "./meta";

/** Threads the people you follow chose to show. */
export function WorkingOn({ items, today, tz }: { items: WorkingOnT[]; today: string; tz: string }) {
  return (
    <section aria-labelledby="working-heading" className="card p-4 sm:p-6">
      <h2 id="working-heading" className="font-display text-display-s">
        Working on
      </h2>
      <p className="mt-1.5 text-[0.875rem] text-ink/65">Threads your people chose to show.</p>
      {items.length ? (
        <ul className="mt-3">
          {items.map((w) => (
            <li key={w.handle} className="rule border-t-2 first:border-t-0">
              <Link href={`/u/${w.handle}`} className="flex min-h-14 items-center gap-3 py-2 transition-colors hover:text-accent">
                <Avatar name={w.name} hue={w.hue} size={34} />
                <p className="min-w-0 flex-1 truncate">
                  <span className="font-semibold">{w.name.split(" ")[0]}</span>
                  <span className="text-ink/60"> · </span>
                  {w.title}
                </p>
                <Status status={w.status} />
                <span className="hidden w-[4.5rem] shrink-0 text-right text-[0.8125rem] text-ink/65 sm:block">
                  {touchedPhrase(w.lastTouchedAt, today, tz)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="well mt-4 p-4 text-[0.9375rem] text-ink/75">
          When people you follow show a thread on their profile, it appears here.{" "}
          <Link href="/people?tab=find" className="link font-semibold text-ink">
            Find people
          </Link>
        </p>
      )}
    </section>
  );
}

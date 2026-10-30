import { Avatar } from "@/components/shared/Avatar";
import { Status } from "@/components/shared/Status";
import { MOMENTS, PEOPLE, WORKING_ON } from "./content";
import { Stamps } from "./Stamps";

// Desktop collage: two staggered columns, each sticker put down a little off straight.
const PLACE = ["lg:-rotate-[1.4deg]", "lg:translate-y-14 lg:rotate-[1.2deg]", "lg:rotate-[0.8deg]", "lg:translate-y-14 lg:-rotate-[0.6deg]"];

/** Moments from people you follow, the stamps they get, and the threads they chose to show. */
export function PeopleSection() {
  return (
    <section id="people" aria-labelledby="people-title" className="bg-raised px-margin py-section">
      <div className="mx-auto grid max-w-[90rem] grid-cols-1 gap-x-14 gap-y-10 xl:grid-cols-12">
        <div className="xl:col-span-5">
          <h2 id="people-title" data-split className="font-display text-display-l">
            Share the good bits with your people.
          </h2>
          <p className="mt-6 max-w-xl text-lede text-ink/75 xl:max-w-md">
            Follow friends, teammates, anyone doing similar work. When something goes well,
            post it as a moment and they stamp it back. Your pages never leave your journal.
          </p>
          <p className="mt-8 text-[0.875rem] text-ink/65">Example people and moments. Try a stamp.</p>
        </div>

        <div
          data-scene="people"
          className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-x-6 lg:gap-y-8 lg:pb-14 xl:col-span-7"
        >
          <ul className="no-scrollbar -mx-margin flex snap-x snap-mandatory scroll-px-margin gap-4 overflow-x-auto px-margin pb-4 pt-5 lg:contents">
            {MOMENTS.map((m, i) => {
              const p = PEOPLE[m.who];
              return (
                <li
                  key={m.id}
                  data-moment
                  className={`w-[86%] max-w-[26rem] shrink-0 snap-start sm:w-[58%] lg:w-auto lg:max-w-none lg:self-start ${PLACE[i]}`}
                >
                  <article aria-label={`${p.name}: ${m.kind}`} className="card h-full p-5">
                    <header className="flex items-start gap-3 pr-12">
                      <Avatar name={p.name} hue={p.hue} size={42} />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold leading-tight">{p.name}</p>
                        <p className="truncate text-[0.8125rem] text-ink/65">
                          @{p.handle} · {m.kind} · {m.when}
                        </p>
                      </div>
                    </header>
                    <p className="mt-3.5 text-[1.0625rem] leading-snug">{m.text}</p>
                    <p className="mt-3">
                      <span className="tag" data-hue={p.hue}>
                        #{m.tag}
                      </span>
                    </p>
                    <Stamps label={`Stamp ${p.name.split(" ")[0]}’s moment`} />
                  </article>
                </li>
              );
            })}
          </ul>

          <section aria-labelledby="working-title" data-moment className={`self-start ${PLACE[3]}`}>
            <div className="card p-5">
              <h3 id="working-title" className="font-display text-display-s">
                Working on
              </h3>
              <p className="mt-1.5 text-[0.9375rem] text-ink/65">Threads they chose to show on their profile.</p>
              <ul className="mt-3">
                {WORKING_ON.map((w) => {
                  const p = PEOPLE[w.who];
                  return (
                    <li key={w.who} className="rule flex min-h-14 items-center gap-3 border-t-2 py-2 first:border-t-0">
                      <Avatar name={p.name} hue={p.hue} size={34} />
                      <p className="min-w-0 flex-1 truncate">
                        <span className="font-semibold">{p.name.split(" ")[0]}</span>
                        <span className="text-ink/65"> · </span>
                        {w.title}
                      </p>
                      <Status status={w.status} />
                      <span className="w-7 shrink-0 text-right text-[0.8125rem] tabular-nums text-ink/65">{w.when}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}

import { Icon } from "@/components/shared/Icon";
import s from "./landing.module.css";

const YOURS = [
  ["Your pages", "No one on Kata sees them, and no setting shares them. An AI model run by Groq reads them so Maru can keep track."],
  ["Your threads", "Maru’s map of what you’re working on is for you alone."],
  ["Maru’s check-ins, questions and letters", "Written to you, kept with your pages."],
] as const;

const SHARED = [
  ["Moments you post", "A win, a ship, a thought or a line from a page. For everyone, or only friends."],
  ["Threads you mark", "Their title and status, on your profile as what you’re working on. Unmark one and it’s gone."],
  ["Your profile and replies", "Name, @handle, role, bio and follower counts, and the stamps and replies you leave."],
] as const;

/** Plainly: what stays in the journal and what other people can see. */
export function PrivateSection() {
  return (
    <section id="private" aria-labelledby="private-title" className={`chapter ${s.mat} px-margin py-section`}>
      <div className="mx-auto max-w-[90rem]">
        <div className="grid grid-cols-1 items-end gap-x-12 gap-y-6 lg:grid-cols-12">
          <h2 id="private-title" data-split className="font-display text-display-l lg:col-span-7">
            Private, unless you <span className="text-accent">share it.</span>
          </h2>
          <p className="max-w-md text-lede text-ink/75 lg:col-span-5 lg:justify-self-end">
            Kata is a journal first. Here is what other people can see, and what they
            never can.
          </p>
        </div>

        <div data-scene="private" className="card mt-14 grid grid-cols-1 lg:mt-20 lg:grid-cols-2">
          <Column icon="lock" title="Stays yours" items={YOURS} />
          <Column
            icon="share"
            title="Yours to share"
            items={SHARED}
            className="border-t-2 border-dashed border-edge lg:border-l-2 lg:border-t-0"
          />
        </div>
      </div>
    </section>
  );
}

function Column({
  icon,
  title,
  items,
  className = "",
}: {
  icon: "lock" | "share";
  title: string;
  items: readonly (readonly [string, string])[];
  className?: string;
}) {
  return (
    <div className={`p-[clamp(1.25rem,3.5vw,2.75rem)] ${className}`}>
      <p className="flex items-center gap-3">
        <span
          data-badge
          data-hue={icon === "lock" ? 1 : 3}
          className="grid size-12 shrink-0 place-items-center rounded-full border-2 border-edge bg-hue text-on-hue"
        >
          <Icon name={icon} className="h-[1.35rem] w-[1.35rem]" strokeWidth={2} />
        </span>
        <span className="font-display text-display-s">{title}</span>
      </p>
      <ul className="mt-7 space-y-5">
        {items.map(([name, line]) => (
          <li key={name} className="rule border-t-2 pt-5 first:border-t-0 first:pt-0">
            <p className="font-semibold">{name}</p>
            <p className="mt-1 max-w-[42ch] text-ink/75">{line}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

import { Icon, type IconName } from "@/components/shared/Icon";
import { ROLE_PRESETS } from "@/lib/roles";
import type { FieldType, RoleKey } from "@/lib/types";
import { StartLink } from "./StartLink";

const FIELD_ICON: Record<FieldType, IconName> = {
  short_text: "text-short",
  long_text: "text-long",
  mood_slider: "smile",
  energy: "bolt",
  number: "hash",
  tags: "tag",
  yes_no: "toggle",
  rating: "star",
  link: "link",
  divider: "divider",
};

// Five of the starters, from work and the rest of life, so the page reads as for anyone.
const LOOK: Partial<Record<RoleKey, { hue: number; tilt: number }>> = {
  developer: { hue: 2, tilt: -2 },
  teacher: { hue: 7, tilt: 1.5 },
  creative: { hue: 5, tilt: -1 },
  parent: { hue: 3, tilt: 1.8 },
  athlete: { hue: 4, tilt: -1.4 },
};

const STARTERS = ROLE_PRESETS.filter((r) => r.key in LOOK);

/** The role starters as a sheet of stickers: each one a page people start from. */
export function RolesSection() {
  return (
    <section id="pages" aria-labelledby="pages-title" className="px-margin py-section">
      <div className="mx-auto max-w-[90rem]">
        <div className="grid grid-cols-1 items-end gap-x-12 gap-y-6 lg:grid-cols-12">
          <h2 id="pages-title" data-split className="font-display text-display-l lg:col-span-7">
            Start from a page that fits your days.
          </h2>
          <p className="max-w-md text-lede text-ink/75 lg:col-span-5 lg:justify-self-end">
            Fifteen starters, for teaching, shifts, raising kids, training, making things and more.
            Each is a handful of good questions: change any, add your own, and Maru adds its
            questions on top.
          </p>
        </div>

        {/* A swipe strip on phones, so it takes focus there for the keyboard. */}
        <ul
          data-scene="roles"
          tabIndex={0}
          aria-label="Starter pages"
          className="no-scrollbar -mx-margin mt-12 flex snap-x snap-mandatory scroll-px-margin gap-4 overflow-x-auto px-margin pb-8 pt-4 lg:mx-0 lg:mt-16 lg:grid lg:grid-cols-3 lg:gap-6 lg:overflow-visible lg:p-0 xl:grid-cols-5"
        >
          {STARTERS.map((role) => {
            const look = LOOK[role.key]!;
            return (
              <li
                key={role.key}
                data-hue={look.hue}
                className="w-[78%] max-w-[19rem] shrink-0 snap-start sm:w-[46%] lg:w-auto lg:max-w-none"
              >
                <div data-role className="h-full lg:[rotate:var(--tilt)]" style={{ ["--tilt" as string]: `${look.tilt}deg` }}>
                  <article aria-labelledby={`role-${role.key}`} className="card flex h-full flex-col">
                    <div className="rounded-t-[22px] border-b-2 border-edge bg-hue px-5 pb-5 pt-5 text-on-hue">
                      <h3 id={`role-${role.key}`} className="font-display text-display-s">
                        {role.name}
                      </h3>
                      <p className="mt-2 text-[0.9375rem] font-medium leading-snug">{role.description}</p>
                    </div>
                    <ul className="flex-1 space-y-3 px-5 py-5">
                      {role.fields.slice(0, 4).map((f) => (
                        <li key={f.label} className="flex items-start gap-2.5 text-[0.9375rem] leading-snug text-ink/80">
                          <Icon name={FIELD_ICON[f.type]} className="mt-0.5 h-[1.05rem] w-[1.05rem] text-ink/65" />
                          {f.label}
                        </li>
                      ))}
                    </ul>
                  </article>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4 lg:mt-14">
          <StartLink variant="secondary" label="Pick yours when you sign up" arrow />
          <p className="text-[0.9375rem] text-ink/65">Or start blank and build your own, block by block.</p>
        </div>
      </div>
    </section>
  );
}

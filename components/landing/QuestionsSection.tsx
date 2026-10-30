import { KataMark } from "@/components/shared/Avatar";
import { Today } from "@/components/shared/Today";
import { INTERESTS, QUESTIONS } from "./content";

const TILT = [-2.2, 1.6, -1];

/** Today's page with Kata's questions taped on, each filed under a tag. */
export function QuestionsSection({ todayLong }: { todayLong: string }) {
  return (
    <section id="questions" aria-labelledby="questions-title" className="px-margin py-section">
      <div className="mx-auto grid max-w-[90rem] grid-cols-1 gap-x-12 gap-y-14 xl:grid-cols-12">
        <div className="xl:col-span-4 xl:col-start-9 xl:row-start-1 xl:pt-4">
          <h2 id="questions-title" data-split className="font-display text-display-l">
            Every page comes with a few good questions.
          </h2>
          <p className="mt-6 max-w-xl text-lede text-ink/75 xl:max-w-md">
            Maru adds two or three to today’s page, picked from your threads and the things
            you’re into. Each answer is filed under its tag, so a thread reads back like a story.
          </p>
          <dl className="mt-10 space-y-5">
            <div>
              <dt className="text-[0.9375rem] font-semibold">From your threads</dt>
              <dd className="mt-2 flex flex-wrap gap-2">
                {QUESTIONS.map((q) => (
                  <span key={q.id} className="tag" data-hue={q.hue}>
                    #{q.tag}
                  </span>
                ))}
              </dd>
            </div>
            <div>
              <dt className="text-[0.9375rem] font-semibold">From what you’re into</dt>
              <dd className="mt-2 flex flex-wrap gap-2">
                {INTERESTS.map((t) => (
                  <span key={t.tag} className="tag" data-hue={t.hue}>
                    #{t.tag}
                  </span>
                ))}
              </dd>
            </div>
          </dl>
        </div>

        <article
          data-scene="questions"
          aria-labelledby="today-page-title"
          className="card self-start p-[clamp(1.1rem,3vw,2.25rem)] xl:col-span-8 xl:col-start-1 xl:row-start-1"
        >
          <header className="rule flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b-2 pb-5">
            <div>
              <p className="text-[0.9375rem] text-ink/65">
                <Today initial={todayLong} style="long" />
              </p>
              <h3 id="today-page-title" className="mt-1 font-display text-display-m">
                Today’s page
              </h3>
            </div>
            <p className="flex items-center gap-2.5 text-[0.9375rem] text-ink/70">
              <KataMark size={30} />
              Three questions from Maru
            </p>
          </header>

          <ol className="mt-10 grid grid-cols-1 gap-x-5 gap-y-9 md:grid-cols-3">
            {QUESTIONS.map((q, i) => (
              <li
                key={q.id}
                data-question
                data-tilt={TILT[i]}
                data-hue={q.hue}
                style={{ rotate: `${TILT[i]}deg` }}
                className="relative flex flex-col rounded-md border-2 border-edge bg-tint p-5 pt-6"
              >
                <span aria-hidden className="tape" />
                <p className="flex flex-wrap items-center justify-between gap-2">
                  <span className="tag">#{q.tag}</span>
                  <span className="text-[0.8125rem] font-medium text-deep">{q.from}</span>
                </p>
                <p className="mt-4 flex-1 text-prompt font-semibold leading-[1.22] text-ink md:max-lg:text-[1.125rem]">{q.text}</p>
                <p className="ruled mt-4 text-[0.9375rem] text-ink/85 [--rule:1.85rem] [min-height:calc(var(--rule)*2)]">
                  {q.answer || <span className="sr-only">Not answered yet</span>}
                </p>
              </li>
            ))}
          </ol>

          <footer className="rule mt-10 flex flex-wrap items-center justify-between gap-3 border-t-2 pt-5">
            <p className="text-[0.9375rem] text-ink/70">Answer one, or none. Answers are filed under their tags.</p>
            <span className="tag" data-hue="1">
              Example page
            </span>
          </footer>
        </article>
      </div>
    </section>
  );
}

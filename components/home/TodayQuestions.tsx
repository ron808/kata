import Link from "next/link";
import { buttonClass } from "@/components/shared/Button";
import { Icon } from "@/components/shared/Icon";
import { hueForTag, threadTagHues } from "@/components/entry/hue";
import type { DailyQuestion, ThreadT } from "@/lib/types";

const TILT = ["-rotate-[1.4deg]", "rotate-[1deg]", "-rotate-[0.5deg]"];

/** The question's thread's hue, else the hue its tag has everywhere else (today's page, Pages). */
function hueFor(q: DailyQuestion, threads: ThreadT[], tagHues: Record<string, number>) {
  const t = q.threadId ? threads.find((x) => x._id === q.threadId) : null;
  return t ? t.hue % 8 : hueForTag(q.tag, tagHues);
}

/** Today's questions from Kata, taped up, with the way into today's page. */
export function TodayQuestions({
  questions,
  threads,
  todayEntryId,
  companionName,
}: {
  questions: DailyQuestion[];
  threads: ThreadT[];
  todayEntryId: string | null;
  companionName: string;
}) {
  const tagHues = threadTagHues(threads);
  return (
    <section aria-labelledby="asks-heading" className="card p-4 sm:p-6">
      <h2 id="asks-heading" className="font-display text-display-s">
        Today {companionName} asks
      </h2>
      <p className="mt-1.5 text-[0.875rem] text-ink/65">
        {questions.length
          ? "Questions for today’s page, picked from what’s on your mind."
          : `Once ${companionName} knows what you’re working on, its questions for today’s page appear here.`}
      </p>
      {questions.length ? (
        <ul className={`mt-6 grid grid-cols-1 gap-4 ${questions.length > 1 ? "sm:grid-cols-2 xl:grid-cols-3" : ""}`}>
          {questions.map((q, i) => (
            <li
              key={q.id}
              data-hue={hueFor(q, threads, tagHues)}
              className={`relative rounded-md border-2 border-edge bg-tint px-4 pb-4 pt-5 ${TILT[i % 3]}`}
            >
              <span className="tape" aria-hidden />
              <span className="tag">#{q.tag}</span>
              <p className="mt-3 font-semibold leading-snug">{q.text}</p>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[0.8125rem] text-ink/65">
          {todayEntryId ? "Today’s page is written. You can still add to it." : "Answers are filed under their tags."}
        </p>
        {todayEntryId ? (
          <Link href={`/entry/${todayEntryId}`} className={buttonClass({ variant: "secondary" })}>
            Read today’s page
          </Link>
        ) : (
          <Link href="/entry/new" className={buttonClass()}>
            Write today’s page
            <Icon name="arrow" className="h-4 w-4" />
          </Link>
        )}
      </div>
    </section>
  );
}

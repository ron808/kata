import Link from "next/link";
import { Icon } from "@/components/shared/Icon";
import { MaruMark } from "@/components/shared/Avatar";
import { formatRange } from "@/lib/utils/dates";
import { firstSentences } from "@/lib/utils/excerpt";
import type { DigestSummary } from "@/lib/types";

/** An unread letter from Kata, or a note about when the next one comes. */
export function LetterCard({ digest, companionName }: { digest: DigestSummary | null; companionName: string }) {
  if (!digest) {
    return (
      <aside className="flex items-start gap-4 rounded-lg border-2 border-dashed border-edge/50 p-4 sm:p-6">
        <MaruMark size={40} className="-rotate-6 opacity-70" />
        <div>
          <p className="font-display text-[1.5rem] leading-[0.95]">Your next letter comes on Sunday.</p>
          <p className="mt-2 text-ink/65">
            {companionName} reads the week’s pages and writes back. Monthly letters arrive on the first.
          </p>
          <Link href="/digest/weekly" className="link mt-3 inline-flex min-h-11 items-center text-[0.9375rem] font-semibold">
            Past letters
          </Link>
        </div>
      </aside>
    );
  }
  const weekly = digest.type === "weekly";
  return (
    <Link
      href={weekly ? "/digest/weekly" : "/digest/monthly"}
      className="group chapter card press flex flex-col p-4 transition-[transform,box-shadow] duration-300 sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-ink/70">{weekly ? "Weekly letter" : "Monthly letter"} · unread</p>
          <p className="mt-1 font-display text-display-s">A letter for you</p>
        </div>
        <MaruMark size={44} className="-rotate-6" />
      </div>
      <p className="mt-5 line-clamp-4 text-[1.0625rem] leading-[1.6] text-ink/85">
        {firstSentences(digest.content)}
      </p>
      <p className="mt-auto flex items-center justify-between gap-4 pt-5 text-sm text-ink/70">
        <span>
          {formatRange(digest.periodStart, digest.periodEnd, !weekly)} · {digest.entryCount} pages
        </span>
        <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
          Read it
          <Icon name="arrow" className="h-4 w-4 transition-transform duration-500 ease-out group-hover:translate-x-1" />
        </span>
      </p>
    </Link>
  );
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "now", "5m", "2h", "3d", "2w", then a date: how long ago, in as few characters as it takes. */
export function ago(iso: string, now: number = Date.now()): { short: string; long: string } {
  const at = Date.parse(iso);
  const ms = Math.max(0, now - at);
  const unit = (n: number, s: string, word: string) => ({ short: `${n}${s}`, long: `${n} ${word}${n === 1 ? "" : "s"} ago` });
  if (ms < MINUTE) return { short: "now", long: "just now" };
  if (ms < HOUR) return unit(Math.floor(ms / MINUTE), "m", "minute");
  if (ms < DAY) return unit(Math.floor(ms / HOUR), "h", "hour");
  if (ms < 7 * DAY) return unit(Math.floor(ms / DAY), "d", "day");
  if (ms < 35 * DAY) return unit(Math.floor(ms / (7 * DAY)), "w", "week");
  const date = new Date(at);
  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  const short = date.toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }) });
  return { short, long: `on ${date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}` };
}

/**
 * A relative time ("2h"), with the long form for screen readers and the full date on hover.
 * Server and browser clocks can disagree by a minute, so the text is allowed to differ on hydration.
 */
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "28 October 2026, 05:39 UTC": the same string on the server and in every browser. */
function stamp(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
}

export function Ago({ iso, className = "" }: { iso: string; className?: string }) {
  const { short, long } = ago(iso);
  return (
    <time dateTime={iso} title={stamp(iso)} className={className}>
      <span aria-hidden suppressHydrationWarning>
        {short}
      </span>
      <span className="sr-only" suppressHydrationWarning>
        {long}
      </span>
    </time>
  );
}

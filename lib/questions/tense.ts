/**
 * When a question can be answered, read from its own words, since pages hold anyone's wording:
 * "How did today go?" needs a day behind it, and "What did you eat for dinner?" needs a dinner.
 * Pure, so the page can use it in the browser.
 */

// Present or future, so it works before the day has happened: "What am I inspired by today?"
const LOOKS_AHEAD = /\b(?:what['’]s|what is|what are|what am|are you|am i|is your|is my|could|can|will|would|should|going to|want to|need to|my plan|the plan|plan for|hope|does)\b/i;
const THE_DAY = /\b(?:today(?:['’]s)?|your day|my day)\b/i;
const FINISHED = /\b(?:did|didn['’]t)\s+(?:i|you|we)\b|\bwhat didn['’]t\b|\bi did\b|\bconfused me\b|\bhow was\b|\bwas (?:it|there)\b|\b(?:worked|trained|spent|used)\b/i;

/** Whether it asks about a day that has already happened. */
export function looksBack(text: string): boolean {
  if (/\bfrom today\b|\bredo\b|\bdifferently\b/i.test(text)) return true;
  if (/\bthis week\b/i.test(text)) return false;
  return (THE_DAY.test(text) || FINISHED.test(text)) && !LOOKS_AHEAD.test(text);
}

/** The hour from which a question makes sense on today's page. */
export function readyAt(text: string): number {
  if (/\btomorrow\b/i.test(text)) return 17;
  if (!LOOKS_AHEAD.test(text)) {
    if (/\b(?:dinner|supper|tonight|this evening)\b/i.test(text)) return 18;
    if (/\blunch\b/i.test(text)) return 13;
    if (/\bbreakfast\b/i.test(text)) return 9;
  }
  // The night is behind them by morning, and a night shift ended hours ago.
  if (/\b(?:sleep|slept|shift)\b/i.test(text)) return 0;
  return looksBack(text) ? 12 : 0;
}

/** Whether it's too early in the day to ask. Past midnight it's still the evening before. */
export function tooEarly(text: string, hour: number): boolean {
  return readyAt(text) > (hour < 4 ? 24 : hour);
}

const matching = (found: string, word: string) => (/^[A-Z]/.test(found) ? word[0].toUpperCase() + word.slice(1) : word);

/**
 * A question as it reads on yesterday's page. Only for showing: a page keeps its own words, and
 * "How did today go?" is right when reading Sunday's page later. What looks ahead stays as it
 * is, because the writer is answering it now.
 */
export function asYesterday(text: string): string {
  let out = text;
  if (looksBack(text)) {
    out = out
      .replace(/\byesterday\b/gi, "the day before")
      .replace(/\bwould you do\b/gi, "would you have done")
      .replace(/\btoday['’]s\b/gi, (m) => matching(m, "yesterday’s"))
      .replace(/\b(?:today|your day|my day)\b/gi, (m) => matching(m, "yesterday"))
      .replace(/\btonight\b/gi, (m) => matching(m, "last night"))
      .replace(/\bthis (morning|evening)\b/gi, (m, part: string) => matching(m, `yesterday ${part.toLowerCase()}`))
      .replace(/\b(dinner|supper)\?$/i, "$1 last night?")
      .replace(/\b(breakfast|lunch)\?$/i, "$1 yesterday?");
  }
  return out.replace(/(?<!\bby )\btomorrow\b/gi, (m) => matching(m, "today"));
}

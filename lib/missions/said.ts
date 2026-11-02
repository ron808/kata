/**
 * What a message asks of a mission, when the words alone settle it. In focus most messages are
 * short orders ("done", "skip the laundry", "where are we"), and answering those in code costs
 * no tokens and can't go wrong. Anything else goes to the model.
 */

export type Asked =
  | { is: "list"; day: "today" | "tomorrow"; items: string[] }
  | { is: "focus"; on: string; length: string }
  | { is: "unfocus" }
  | { is: "where" }
  | { is: "next" }
  | { is: "done"; task: string }
  | { is: "skip"; task: string }
  | { is: "start"; task: string }
  | { is: "pause" }
  | { is: "stuck"; on: string }
  | { is: "add"; items: string[] }
  | { is: "finish" }
  | { is: "drop" }
  | { is: "report"; named: boolean }
  | { is: "again" };

const POLITE = "(?:(?:ok(?:ay)?|hey|so|right|alright|please|let['’]?s|lets|can (?:we|you)|could (?:we|you)|i (?:want|wanna|need|would like|['’]d like)(?: to)?|help me|time to)[,\\s]+)*";
const END = "[\\s.!?]*$";

const MAKE = "(?:(?:create|make|start|do|set up|build|write|plan|get|draw up|put together)\\s+)";
const NEW_LIST = new RegExp(
  `^${POLITE}(?:${MAKE}(?:a\\s+|an\\s+|my\\s+|the\\s+|our\\s+)?(?:new\\s+)?(?:quick\\s+)?(?:to-?\\s?do(?:\\s*list)?|task\\s*list|check\\s?list|list|mission)|(?:a\\s+|my\\s+|new\\s+)?(?:to-?\\s?do(?:\\s*list)?|task\\s*list)|(?:a\\s+)?new\\s+(?:list|mission))\\b(?:\\s+(?:for|of)\\s+(today|tomorrow|tonight|the day))?(?:\\s*(?::|-|–|—|with|,)\\s*(.+))?${END}`,
  "i"
);

// "I've got a lot on today: the deck, the gym and the bank", "today I need to: …": a list in all but name.
const LOT_ON = new RegExp(
  `^${POLITE}(?:(?:i\\s+(?:have|['’]ve got|got)|there['’]?s|so)\\s+(?:a lot|lots|loads|a few things|a bunch|so much|plenty|stuff)(?:\\s+(?:on|to do|to get done|going on))?(?:\\s+(today|tonight|tomorrow|this (?:morning|afternoon|evening)))?|(today|tonight|tomorrow)\\s*,?\\s*i\\s+(?:need|have|want|got)\\s+to)\\s*[:\\-–—]\\s*(.+?)${END}`,
  "i"
);

const FOCUS_ON = new RegExp(
  `^${POLITE}(?:(?:start|begin|enter|turn on|go into|switch (?:on|to)|put me in(?:to)?|do)\\s+)?(?:(?:a|some|the)\\s+)?focus(?:\\s+(?:mode|time|session))?(?:\\s+on\\s+(.+?))?(?:\\s+for\\s+(.+?))?${END}`,
  "i"
);
const FOCUS_OFF = new RegExp(
  `^${POLITE}(?:(?:stop|end|exit|leave|quit|turn off|switch off|get out of|come out of|done with)\\s+(?:the\\s+|this\\s+)?focus(?:\\s+(?:mode|time|session))?|(?:go\\s+)?back to normal|normal mode)${END}`,
  "i"
);

const WHERE = new RegExp(`^${POLITE}(?:where (?:are|were) we(?: at| on (?:it|this|that))?|how(?:['’]s| is| are) (?:it|we|things|this) (?:going|doing)|how are we doing|status|progress|what['’]?s left|what is left|how much (?:time )?(?:is |do we have |have we got )?left|how long (?:is )?left|time left|check (?:in|progress))${END}`, "i");
const NEXT = new RegExp(`^${POLITE}(?:what['’]?s next|what is next|what now|what should i do(?: now| next)?|next|next one|what['’]?s up next)${END}`, "i");
const DONE = new RegExp(`^${POLITE}(?:(?:i['’]?m |i am |that['’]?s |it['’]?s |we['’]?re |all )?(?:done|finished|completed)(?:\\s+(?:with\\s+)?(?:the\\s+|my\\s+)?(.+?))?|(?:i\\s+)?(?:finished|completed)\\s+(?:the\\s+|my\\s+)?(.+?)|mark\\s+(?:the\\s+|my\\s+)?(.+?)\\s+(?:as\\s+)?done|(.+?)\\s+(?:is|['’]s)\\s+done)${END}`, "i");
const SKIP = new RegExp(`^${POLITE}(?:skip|drop|forget)(?:\\s+(?:the\\s+|my\\s+)?(.+?))?${END}`, "i");
const START = new RegExp(`^${POLITE}(?:start|begin|on to|moving (?:on )?to|switch to|back to|now doing|work(?:ing)? on|do)\\s+(?:the\\s+|my\\s+)?(.+?)${END}`, "i");
const PAUSE = new RegExp(`^${POLITE}(?:pause|stop the timer|hold on|break|take a break|taking a break)(?:\\s+(?:it|this|that|the timer))?${END}`, "i");
const STUCK = new RegExp(`^${POLITE}(?:i['’]?m |i am |we['’]?re |it['’]?s )?stuck(?:\\s+on\\s+(.+?))?${END}`, "i");
const ADD = new RegExp(`^${POLITE}(?:add|also|plus)\\s+(.+?)${END}`, "i");
const FINISH = new RegExp(`^${POLITE}(?:wrap(?:ping)?(?: it| this| things)? up|end (?:the |this )?(?:mission|list)|finish (?:the |this )?(?:mission|list)|we['’]?re (?:all )?done here|that['’]?s it for (?:today|now)|call it a day)${END}`, "i");
const DROP = new RegExp(`^${POLITE}(?:kill (?:it|this|the (?:mission|list))|drop (?:the |this )(?:mission|list)|abandon (?:it|the (?:mission|list))|scrap (?:it|the (?:mission|list))|cancel (?:the |this )(?:mission|list))${END}`, "i");
const REPORT = new RegExp(`^${POLITE}(?:(?:give|show|get|make)(?: me)?\\s+)?(?:(?:a|the|my)\\s+)?(mission\\s+)?(?:report|recap|debrief|summary)(?:\\s+(?:of|on|for)\\s+(?:the |this |that |my )(?:mission|list))?${END}`, "i");
const HOW_DID = new RegExp(`^${POLITE}(?:how did (?:we|i|it) (?:do|go)|what did (?:we|i) (?:get done|achieve|finish)|what (?:have|did) (?:we|i) (?:done|achieved|got done))${END}`, "i");
const AGAIN = new RegExp(`^${POLITE}(?:run|do|start)\\s+(?:it|that|the (?:mission|list)|that (?:mission|list)|the last (?:mission|list|one))\\s+again${END}`, "i");

const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

/**
 * A list as people type one: commas, semicolons, new lines, "then". "And" splits only short
 * pieces ("gym and taxes"), so a task with "and" in its name stays one task.
 */
export function listItems(text: string): string[] {
  return text
    .split(/\s*(?:[,;\n•]|\band then\b|\bthen\b|&)\s*/i)
    .flatMap((part) => {
      const pieces = part.split(/\s+and\s+/i);
      return pieces.length > 1 && pieces.every((p) => words(p) >= 1 && words(p) <= 4) ? pieces : [part];
    })
    .map((s) => s.trim().replace(/^(?:and|also|plus)\s+/i, ""))
    .filter(Boolean);
}

export function whatAsked(raw: string): Asked | null {
  const said = raw.trim();
  if (!said || said.length > 400) return null;

  const off = FOCUS_OFF.test(said);
  if (off) return { is: "unfocus" };
  const on = said.match(FOCUS_ON);
  if (on) return { is: "focus", on: on[1] ?? "", length: on[2] ?? "" };
  const list = said.match(NEW_LIST);
  if (list) return { is: "list", day: /tomorrow/i.test(list[1] ?? "") ? "tomorrow" : "today", items: listItems(list[2] ?? "") };
  const lot = said.match(LOT_ON);
  if (lot && listItems(lot[3]).length >= 2) return { is: "list", day: /tomorrow/i.test(lot[1] ?? lot[2] ?? "") ? "tomorrow" : "today", items: listItems(lot[3]) };

  if (WHERE.test(said)) return { is: "where" };
  if (NEXT.test(said)) return { is: "next" };
  if (FINISH.test(said)) return { is: "finish" };
  if (DROP.test(said)) return { is: "drop" };
  const report = said.match(REPORT);
  if (report) return { is: "report", named: Boolean(report[1]) || /mission|list/i.test(said) };
  if (HOW_DID.test(said)) return { is: "report", named: false };
  if (AGAIN.test(said)) return { is: "again" };
  const done = said.match(DONE);
  if (done) return { is: "done", task: done[1] ?? done[2] ?? done[3] ?? done[4] ?? "" };
  const stuck = said.match(STUCK);
  if (stuck) return { is: "stuck", on: stuck[1] ?? "" };
  if (PAUSE.test(said)) return { is: "pause" };
  const skip = said.match(SKIP);
  if (skip) return { is: "skip", task: skip[1] ?? "" };
  const start = said.match(START);
  if (start) return { is: "start", task: start[1] };
  const add = said.match(ADD);
  // "Add a question to my page", "add a habit": the app's other things, for the model.
  if (add && !/\b(?:questions?|page|habits?|threads?|memor(?:y|ies)|reminders?|notes?|friends?|@\w+)\b/i.test(add[1])) return { is: "add", items: listItems(add[1]) };
  return null;
}

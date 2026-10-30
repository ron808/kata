// Demo content for the Promises prototype. Fictional, shared cast from ../cast.
// Nothing here is real user data and nothing is saved or sent.

export interface PromiseItem {
  id: string;
  text: string;
  /** How many times it has been carried over to a new page. */
  carried: number;
  /** Cast ids of the people witnessing it (one to three). */
  witnesses: string[];
  /** Where it came from, when it wasn't typed on this page. */
  note?: string;
}

export const TODAY = { weekday: "Thursday", date: "29 October", page: 212 };

/** The page as it opens: five is the most a page holds. */
export const OPEN_PROMISES: PromiseItem[] = [
  {
    id: "halden",
    text: "Send the application to Halden Studio",
    carried: 2,
    witnesses: ["mira", "priya"],
  },
  { id: "nani", text: "Call Nani before her evening walk", carried: 0, witnesses: [] },
  { id: "words", text: "300 words before work", carried: 0, witnesses: [], note: "Day 12 of 40" },
  { id: "plant", text: "Repot the fig by the window", carried: 1, witnesses: [] },
];

export const CARRY_WORDS = ["Written today", "Carried once", "Carried twice", "Third day"];

/** The one that has been carried three times, for the third-carry prompt. */
export const THIRD_CARRY = {
  text: "Finish the portfolio case study",
  since: "Monday",
  days: ["Mon", "Tue", "Wed", "Thu"],
  firstStep: "Write just the opening paragraph",
  releasePlaceholder: "It’s the wrong case study. The new one is better.",
  askDraft: "Could someone read my portfolio case study and tell me what’s unclear?",
  suggested: ["mira", "kenji"],
  byDays: ["Friday", "Saturday", "Sunday"],
  reply: {
    from: "mira",
    text: "Send it over. I’ll read it with my coffee tomorrow and mark the dull bits.",
  },
  /** What the helper sends back once they've helped. */
  done: {
    when: "Friday, 8:12 am",
    text: "Done. Three notes in the margin. The middle drags, but the ending is the best thing you’ve made.",
  },
};

/** A promise someone else made, that you were asked to witness. */
export const WITNESS = {
  from: "lena",
  text: "Hand my thesis draft to Professor Weber",
  by: "Friday 6 November",
  made: "Monday 26 October",
  kept: "Wednesday 4 November",
  otherWitness: "ana",
  line: "Two days early. Thank you for being on the other end of it.",
};

/** The Sunday letter's promises section. */
export const LETTER = {
  range: "26 October – 1 November",
  shared: { kept: 11, of: 14 },
  private: { kept: 4, of: 9 },
  released: 2,
  opening:
    "This was a week of small, public promises. You said four of them out loud on Monday and kept every one by Wednesday. The ones you kept to yourself drifted, and two of them you let go with a sentence each. That isn’t failure. It is information.",
  kept: {
    text: "Send the application to Halden Studio",
    day: "Thursday 29 October",
    carried: 2,
    witnesses: ["mira", "priya"],
    line: "Carried twice, sent on the third morning.",
  },
  suggestion: {
    text: "Thank Mira for reading the case study",
    by: "Monday",
    why: "She read it the morning after you asked, with her coffee. A thank-you is a small promise, and an easy one to keep.",
  },
};

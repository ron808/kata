import type { RoleKey, ThreadKind, ThreadStatus } from "@/lib/types";

/**
 * Questions Kata can add to a day's page. Ids are stored inside page field ids
 * (`kata:<tag>:<id>`), so never rename one; retire it instead.
 */

export type QuestionTag =
  | "work"
  | "shipping"
  | "blockers"
  | "learning"
  | "health"
  | "sleep"
  | "fitness"
  | "food"
  | "mood"
  | "family"
  | "friends"
  | "love"
  | "money"
  | "job-hunt"
  | "interviews"
  | "study"
  | "creativity"
  | "design"
  | "writing"
  | "focus"
  | "gratitude"
  | "planning"
  | "reflection"
  // Everyday life, so the topics fit anyone's days.
  | "kids"
  | "home"
  | "pets"
  | "nature"
  | "faith"
  | "music"
  | "reading"
  | "travel"
  | "rest"
  | "caring"
  | "community"
  | RoleKey;

export interface BankQuestion {
  id: string;
  /** May contain {thread}, filled with the thread's name. */
  text: string;
  tags: QuestionTag[];
  /** Thread kinds a {thread} question suits. */
  kinds?: ThreadKind[];
  /** Only for threads in this state (a stuck question doesn't suit something that's just waiting). */
  status?: ThreadStatus[];
  when: "morning" | "evening" | "any";
  /** About a working day, so it waits out the weekend, except for people whose days off move. */
  workday?: boolean;
}

const WORKISH: ThreadKind[] = ["project", "task", "goal", "learning"];

export const QUESTION_BANK: BankQuestion[] = [
  // About one thread
  { id: "t-next-step", text: "What's the smallest next step on {thread}?", tags: ["planning", "work"], kinds: WORKISH, when: "any" },
  { id: "t-moved", text: "What moved on {thread} today?", tags: ["work", "shipping", "reflection"], kinds: WORKISH, when: "evening" },
  { id: "t-unclear", text: "What's still unclear about {thread}?", tags: ["work", "planning"], kinds: ["project", "task", "learning"], when: "any" },
  { id: "t-finished", text: "What would make {thread} feel finished?", tags: ["work", "planning", "shipping"], kinds: ["project", "goal"], when: "any" },
  { id: "t-cut", text: "If {thread} had to be done this week, what would you drop?", tags: ["shipping", "work", "planning"], kinds: ["project"], when: "any" },
  { id: "t-help", text: "Who could help with {thread}?", tags: ["work", "blockers"], kinds: ["project", "task", "goal"], when: "any" },
  { id: "t-risk", text: "What's the hardest part of {thread} right now?", tags: ["work", "planning"], kinds: ["project"], when: "any" },
  { id: "t-in-the-way", text: "What's in the way of {thread}, in one sentence?", tags: ["blockers"], kinds: ["project", "task", "goal", "learning", "other"], status: ["stuck"], when: "any" },
  { id: "t-try-today", text: "What's one thing you could try on {thread} today?", tags: ["blockers", "focus"], kinds: WORKISH, status: ["stuck"], when: "morning" },
  { id: "t-unblock", text: "Who could unblock {thread}?", tags: ["blockers", "work"], kinds: ["project", "task"], status: ["stuck"], when: "any" },
  { id: "t-know", text: "What do you know for sure about the problem with {thread}?", tags: ["blockers", "reflection"], kinds: ["project", "task"], status: ["stuck"], when: "any" },
  { id: "t-while-wait", text: "What can you do on {thread} while you wait?", tags: ["blockers", "planning"], kinds: ["project", "task", "goal", "other"], status: ["waiting"], when: "any" },
  { id: "t-follow-up", text: "When will you follow up on {thread}?", tags: ["blockers", "planning"], kinds: ["project", "task", "person", "other"], status: ["waiting"], when: "any" },
  { id: "t-decide", text: "What decision about {thread} are you putting off?", tags: ["planning", "work"], kinds: ["project", "goal"], when: "any" },
  { id: "t-proud", text: "What part of {thread} are you proud of so far?", tags: ["reflection", "work"], kinds: ["project", "goal", "learning"], when: "any" },
  { id: "t-next-piece", text: "What's the next bit of {thread} you could finish?", tags: ["shipping"], kinds: ["project"], when: "any" },
  { id: "t-other-where", text: "Where does {thread} stand today?", tags: ["reflection"], kinds: ["other", "project"], when: "any" },
  { id: "t-habit-feel", text: "How did {thread} feel today?", tags: ["health", "fitness"], kinds: ["habit"], when: "evening" },
  { id: "t-habit-easier", text: "What made {thread} easier or harder today?", tags: ["health", "fitness", "reflection"], kinds: ["habit"], when: "evening" },
  { id: "t-habit-tomorrow", text: "When will {thread} fit in next?", tags: ["planning", "health"], kinds: ["habit"], when: "any" },
  { id: "t-goal-week", text: "What did you do for {thread} this week?", tags: ["reflection", "planning"], kinds: ["goal"], when: "any" },
  { id: "t-goal-right", text: "Is {thread} still the right goal? Why?", tags: ["reflection"], kinds: ["goal"], when: "any" },
  { id: "t-goal-measure", text: "How will you know {thread} is going well?", tags: ["planning", "reflection"], kinds: ["goal"], when: "any" },
  { id: "t-learn-clicked", text: "What clicked about {thread} today?", tags: ["learning", "study"], kinds: ["learning"], when: "evening" },
  { id: "t-learn-confusing", text: "What's still confusing about {thread}?", tags: ["learning", "study"], kinds: ["learning"], when: "any" },
  { id: "t-learn-explain", text: "How would you explain {thread} to a friend?", tags: ["learning", "study"], kinds: ["learning"], when: "any" },
  { id: "t-event-well", text: "What would make {thread} go well?", tags: ["planning"], kinds: ["event"], when: "any" },
  { id: "t-event-prep", text: "What's left to prepare for {thread}?", tags: ["planning", "interviews"], kinds: ["event"], when: "any" },
  { id: "t-event-remember", text: "What do you want to remember about {thread}?", tags: ["reflection"], kinds: ["event"], when: "evening" },
  { id: "t-person-mind", text: "What's on your mind about {thread}?", tags: ["family", "friends", "love"], kinds: ["person"], when: "any" },
  { id: "t-person-next", text: "When will you next see or talk to {thread}?", tags: ["family", "friends", "love"], kinds: ["person"], when: "any" },
  { id: "t-health-week", text: "How is {thread} compared with last week?", tags: ["health"], kinds: ["health"], when: "any" },
  { id: "t-health-helps", text: "What helps {thread} most?", tags: ["health"], kinds: ["health"], when: "any" },

  // Work and shipping
  { id: "work-time", text: "What took most of your time today, and was it worth it?", tags: ["work", "reflection"], workday: true, when: "evening" },
  { id: "work-avoid", text: "What did you put off today?", tags: ["work", "focus"], workday: true, when: "evening" },
  { id: "work-again", text: "If you could redo part of today, what would you change?", tags: ["work", "reflection"], workday: true, when: "evening" },
  { id: "work-energy", text: "What gave you energy today, and what drained it?", tags: ["work", "mood"], workday: true, when: "evening" },
  { id: "work-one-thing", text: "What's the one thing that has to happen today?", tags: ["work", "planning", "focus"], when: "morning" },
  { id: "work-conversation", text: "Which conversation today mattered most?", tags: ["work"], workday: true, when: "evening" },
  { id: "ship-today", text: "What did you ship today, however small?", tags: ["shipping", "work"], workday: true, when: "evening" },
  { id: "ship-tomorrow", text: "What could you ship by tomorrow?", tags: ["shipping", "planning"], when: "any" },
  { id: "ship-closest", text: "What's closest to done right now?", tags: ["shipping", "focus"], when: "any" },

  // Blockers
  { id: "blk-slow", text: "What's slowing you down this week?", tags: ["blockers", "work"], when: "any" },
  { id: "blk-waiting", text: "What are you waiting on, and from whom?", tags: ["blockers"], when: "any" },
  { id: "blk-ask", text: "What could you ask for help with?", tags: ["blockers", "work"], when: "any" },

  // Learning and study
  { id: "learn-new", text: "What did you learn today that you didn't know yesterday?", tags: ["learning", "reflection"], when: "evening" },
  { id: "learn-question", text: "What question are you carrying around at the moment?", tags: ["learning", "reflection"], when: "any" },
  { id: "learn-month", text: "What do you want to understand better by the end of the month?", tags: ["learning", "planning"], when: "any" },
  { id: "learn-best", text: "What's the best thing you read or watched this week?", tags: ["learning", "creativity"], when: "any" },
  { id: "study-stuck", text: "What did you study today, and what stuck?", tags: ["study", "learning"], when: "evening" },
  { id: "study-hard", text: "What's the hardest topic coming up?", tags: ["study", "planning"], when: "any" },
  { id: "study-explain", text: "What from today could you explain without notes?", tags: ["study", "learning"], when: "evening" },
  { id: "study-first", text: "What will you study first tomorrow?", tags: ["study", "planning"], when: "evening" },

  // Health, sleep, fitness, food
  { id: "health-body", text: "How did your body feel today?", tags: ["health"], when: "evening" },
  { id: "health-did", text: "What did you do for your health today?", tags: ["health", "fitness"], when: "evening" },
  { id: "health-water", text: "Did you drink enough water today?", tags: ["health", "food"], when: "evening" },
  { id: "health-outside", text: "Did you get outside today?", tags: ["health", "mood"], when: "evening" },
  { id: "sleep-last", text: "How did you sleep, and did anything get in the way?", tags: ["sleep", "health"], when: "morning" },
  { id: "sleep-bed", text: "What time do you want to be in bed tonight?", tags: ["sleep", "planning"], when: "evening" },
  { id: "sleep-wind", text: "What would help you wind down tonight?", tags: ["sleep"], when: "evening" },
  { id: "sleep-pattern", text: "What's been helping your sleep lately, and what hasn't?", tags: ["sleep", "reflection"], when: "any" },
  { id: "fit-move", text: "How did you move today?", tags: ["fitness", "health"], when: "evening" },
  { id: "fit-next", text: "What's your next workout, and when?", tags: ["fitness", "planning"], when: "any" },
  { id: "fit-strong", text: "What felt strong today?", tags: ["fitness"], when: "evening" },
  { id: "fit-training", text: "What are you training for right now?", tags: ["fitness", "planning"], when: "any" },
  { id: "food-good", text: "What did you eat today that made you feel good?", tags: ["food", "health"], when: "evening" },
  { id: "food-screen", text: "Did you eat away from a screen today?", tags: ["food", "focus"], when: "evening" },
  { id: "food-dinner", text: "What's for dinner, and is it sorted?", tags: ["food", "planning"], when: "morning" },

  // Mood
  { id: "mood-lift", text: "What lifted your mood today?", tags: ["mood", "gratitude"], when: "evening" },
  { id: "mood-drain", text: "What drained you today?", tags: ["mood", "reflection"], when: "evening" },
  { id: "mood-stayed", text: "What feeling stayed with you today?", tags: ["mood", "reflection"], when: "evening" },
  { id: "mood-need", text: "What do you need more of this week?", tags: ["mood", "planning"], when: "any" },
  { id: "mood-weight", text: "What's weighing on you, if anything?", tags: ["mood"], when: "any" },

  // People
  { id: "fam-talk", text: "Who in your family did you talk to this week?", tags: ["family"], when: "any" },
  { id: "fam-plan", text: "What would you like to do with your family soon?", tags: ["family", "planning"], when: "any" },
  { id: "fam-notice", text: "What did you notice about someone at home today?", tags: ["family", "love"], when: "evening" },
  { id: "fr-while", text: "Who haven't you talked to in a while?", tags: ["friends"], when: "any" },
  { id: "fr-see", text: "Which friend would you like to see this month?", tags: ["friends", "planning"], when: "any" },
  { id: "fr-laugh", text: "Who made you laugh recently?", tags: ["friends", "mood"], when: "any" },
  { id: "love-appreciate", text: "What did you appreciate about your partner today?", tags: ["love", "gratitude"], when: "evening" },
  { id: "love-small", text: "What's one small thing you could do for your partner this week?", tags: ["love", "planning"], when: "any" },
  { id: "love-time", text: "When did you last spend time together without phones?", tags: ["love"], when: "any" },

  // Money
  { id: "money-worth", text: "What did you spend money on today that was worth it?", tags: ["money"], when: "evening" },
  { id: "money-decision", text: "Is there a money decision you're putting off?", tags: ["money", "planning"], when: "any" },
  { id: "money-month", text: "How does this month's spending feel so far?", tags: ["money", "reflection"], when: "any" },

  // Job hunt and interviews
  { id: "job-excited", text: "Which application are you most excited about, and why?", tags: ["job-hunt"], when: "any" },
  { id: "job-hear-back", text: "Which company would you most like to hear back from?", tags: ["job-hunt"], when: "any" },
  { id: "job-intro", text: "Who could introduce you somewhere?", tags: ["job-hunt", "friends"], when: "any" },
  { id: "job-sent", text: "What did you send out today?", tags: ["job-hunt", "shipping"], when: "evening" },
  { id: "job-energy", text: "How is the search affecting your energy?", tags: ["job-hunt", "mood"], when: "any" },
  { id: "int-better", text: "Which interview question would you like to answer better next time?", tags: ["interviews", "job-hunt"], when: "any" },
  { id: "int-story", text: "What's one story you want ready for your next interview?", tags: ["interviews"], when: "any" },
  { id: "int-ask", text: "What do you want to ask them in your next interview?", tags: ["interviews"], when: "any" },

  // Making things
  { id: "cre-made", text: "What did you make today?", tags: ["creativity"], when: "evening" },
  { id: "cre-idea", text: "What idea keeps coming back?", tags: ["creativity", "reflection"], when: "any" },
  { id: "cre-looking", text: "Whose work have you been looking at lately?", tags: ["creativity", "design"], when: "any" },
  { id: "des-decision", text: "What design decision did you make today, and why?", tags: ["design", "work"], when: "evening" },
  { id: "des-feedback", text: "What feedback changed your mind recently?", tags: ["design", "work"], when: "any" },
  { id: "des-sketch", text: "What did you sketch or prototype today?", tags: ["design", "creativity"], when: "evening" },
  { id: "des-people", text: "What did you learn about the people you design for this week?", tags: ["design", "learning"], when: "any" },
  { id: "wr-sentence", text: "What's a sentence from today you'd keep?", tags: ["writing", "creativity"], when: "evening" },
  { id: "wr-one-line", text: "What are you trying to say, in one line?", tags: ["writing"], when: "any" },
  { id: "wr-words", text: "What did you write today, and how much?", tags: ["writing"], when: "evening" },

  // Focus and planning
  { id: "foc-best", text: "When did you focus best today?", tags: ["focus", "reflection"], when: "evening" },
  { id: "foc-pull", text: "What pulled your attention away today?", tags: ["focus"], when: "evening" },
  { id: "foc-protect", text: "What will you protect time for tomorrow?", tags: ["focus", "planning"], when: "evening" },
  { id: "foc-drop", text: "What could you drop from this week?", tags: ["focus", "planning"], when: "any" },
  { id: "plan-tomorrow", text: "What would make tomorrow a good day?", tags: ["planning"], when: "evening" },
  { id: "plan-week", text: "What's on your plate this week?", tags: ["planning", "work"], when: "any" },
  { id: "plan-first", text: "What will you do first tomorrow?", tags: ["planning", "focus"], when: "evening" },
  { id: "plan-no", text: "What will you say no to this week?", tags: ["planning", "focus"], when: "any" },

  // Gratitude and reflection
  { id: "gr-remember", text: "What's one thing from today you'd like to remember?", tags: ["gratitude", "reflection"], when: "evening" },
  { id: "gr-helped", text: "Who helped you today?", tags: ["gratitude", "friends"], when: "evening" },
  { id: "gr-unplanned", text: "What went right today that you didn't plan?", tags: ["gratitude", "mood"], when: "evening" },
  { id: "ref-surprise", text: "What surprised you today?", tags: ["reflection"], when: "evening" },
  { id: "ref-differently", text: "What would you do differently today?", tags: ["reflection"], when: "evening" },
  { id: "ref-pattern", text: "What keeps showing up in your days lately?", tags: ["reflection", "mood"], when: "any" },

  // Roles
  { id: "dev-debug", text: "What did you debug today, and what was the cause?", tags: ["developer", "work"], workday: true, when: "evening" },
  { id: "dev-proud", text: "What code are you proud of this week?", tags: ["developer", "shipping"], when: "any" },
  { id: "dev-refactor", text: "What would you refactor if you had a free afternoon?", tags: ["developer", "work"], when: "any" },
  { id: "dev-review", text: "What did a code review teach you recently?", tags: ["developer", "learning"], when: "any" },
  { id: "dsg-weakest", text: "What's the weakest part of what you're designing right now?", tags: ["designer", "design"], when: "any" },
  { id: "dsg-reference", text: "What reference are you looking at this week?", tags: ["designer", "creativity"], when: "any" },
  { id: "fdr-decision", text: "What decision are you putting off?", tags: ["founder", "planning"], when: "any" },
  { id: "fdr-customer", text: "What did a customer tell you this week?", tags: ["founder", "work"], when: "any" },
  { id: "fdr-risk", text: "What worries you most about the business right now?", tags: ["founder", "planning"], when: "any" },
  { id: "fdr-hire", text: "Who do you need on the team next?", tags: ["founder", "planning"], when: "any" },
  { id: "js-open", text: "How many applications are still open right now?", tags: ["job_seeker", "job-hunt"], when: "any" },
  { id: "js-practice", text: "What are you getting better at?", tags: ["job_seeker", "interviews"], when: "evening" },
  { id: "stu-confused", text: "What's still confusing you?", tags: ["student", "study"], when: "any" },
  { id: "stu-clicked", text: "What finally made sense lately?", tags: ["student", "study"], when: "any" },
  { id: "stu-deadline", text: "What's the next deadline, and how ready are you?", tags: ["student", "planning"], when: "any" },
  { id: "cus-stood-out", text: "What stood out about today?", tags: ["custom", "reflection"], when: "evening" },
  { id: "tch-next", text: "What are you getting ready to teach next?", tags: ["teacher"], when: "any" },
  { id: "tch-good", text: "What's been good about teaching lately?", tags: ["teacher"], when: "any" },
  { id: "hc-easier", text: "What would make your next shift easier?", tags: ["healthcare"], when: "any" },
  { id: "hc-switch", text: "What helps you switch off after work?", tags: ["healthcare", "rest"], when: "any" },
  { id: "stu-next", text: "What's the next thing you need to understand?", tags: ["student"], when: "any" },
  { id: "stu-easier", text: "What would make studying easier right now?", tags: ["student"], when: "any" },
  { id: "js-next", text: "What's the next application or conversation to move on?", tags: ["job_seeker"], when: "any" },
  { id: "js-going", text: "What's keeping you going in the search?", tags: ["job_seeker"], when: "any" },
  { id: "par-plate", text: "What would take one thing off your plate right now?", tags: ["parent"], when: "any" },
  { id: "par-small", text: "What's one small thing you're looking forward to?", tags: ["parent"], when: "any" },
  { id: "ret-try", text: "What have you been meaning to try?", tags: ["retired"], when: "any" },
  { id: "ret-busy", text: "What's been keeping you busy lately?", tags: ["retired"], when: "any" },
  { id: "cus-lately", text: "What's been on your mind lately?", tags: ["custom"], when: "any" },
  { id: "cus-soon", text: "What's one thing you'd like to get to soon?", tags: ["custom"], when: "any" },
  { id: "cus-mind", text: "What's on your mind right now?", tags: ["custom", "mood"], when: "any" },
  { id: "fl-owed", text: "Is anyone waiting on an invoice from you?", tags: ["freelancer", "money"], when: "any" },
  { id: "fl-client", text: "Which client needs your attention this week?", tags: ["freelancer", "work"], when: "any" },
  { id: "fl-next", text: "Where might your next piece of work come from?", tags: ["freelancer", "planning"], when: "any" },
  { id: "tch-landed", text: "Which moment in class has stayed with you lately?", tags: ["teacher", "work"], workday: true, when: "evening" },
  { id: "tch-student", text: "Which student are you thinking about?", tags: ["teacher", "reflection"], when: "any" },
  { id: "tch-tomorrow", text: "What's the one thing to get ready for your next lesson?", tags: ["teacher", "planning"], when: "evening" },
  { id: "hc-shift", text: "What's stayed with you from your last shift?", tags: ["healthcare", "work"], when: "any" },
  { id: "hc-rest", text: "When do you get to rest next?", tags: ["healthcare", "rest"], when: "any" },
  { id: "hc-remember", text: "What from work would you rather leave at work?", tags: ["healthcare", "reflection"], when: "evening" },
  { id: "sw-next", text: "What do you want to get done before your next shift?", tags: ["shift_worker", "planning"], when: "any" },
  { id: "sw-sleep", text: "How did you sleep around your last shift?", tags: ["shift_worker", "sleep"], when: "any" },
  { id: "sw-off", text: "What do you want to do with your next day off?", tags: ["shift_worker", "rest"], when: "any" },
  { id: "cr-made", text: "What's one thing you made that you're glad about?", tags: ["creative", "creativity"], when: "evening" },
  { id: "cr-fed", text: "What's been feeding your work lately?", tags: ["creative", "creativity"], when: "any" },
  { id: "cr-stuck", text: "What could you try on the piece you're stuck on?", tags: ["creative", "blockers"], when: "any" },
  { id: "par-win", text: "What's one small thing that went well?", tags: ["parent", "family"], when: "evening" },
  { id: "par-you", text: "When did you get a moment for yourself?", tags: ["parent", "rest"], when: "evening" },
  { id: "par-week", text: "What's coming up this week that you need to plan for?", tags: ["parent", "planning"], when: "any" },
  { id: "ath-session", text: "How did your last session feel?", tags: ["athlete", "fitness"], when: "evening" },
  { id: "ath-body", text: "What does your body need right now?", tags: ["athlete", "health"], when: "any" },
  { id: "ath-next", text: "What's the next session, and what's it for?", tags: ["athlete", "planning"], when: "any" },
  { id: "wb-helped", text: "What usually helps when a day is hard?", tags: ["wellbeing", "mood"], when: "evening" },
  { id: "wb-kind", text: "What's one kind thing you can do for yourself today?", tags: ["wellbeing", "rest"], when: "morning" },
  { id: "wb-notice", text: "How are you, honestly, right now?", tags: ["wellbeing", "mood"], when: "any" },
  { id: "ret-enjoyed", text: "What did you enjoy today?", tags: ["retired", "gratitude"], when: "evening" },
  { id: "ret-forward", text: "What's coming up that you're glad about?", tags: ["retired", "planning"], when: "any" },
  { id: "ret-people", text: "Who would you like to see soon?", tags: ["retired", "friends"], when: "any" },

  // Everyday life
  { id: "kid-laugh", text: "What made the kids laugh today?", tags: ["kids", "family"], when: "evening" },
  { id: "kid-proud", text: "What did one of them do that made you proud?", tags: ["kids", "gratitude"], when: "any" },
  { id: "kid-need", text: "What do they need from you this week?", tags: ["kids", "planning"], when: "any" },
  { id: "home-sorted", text: "What's one thing at home you'd like sorted this week?", tags: ["home", "planning"], when: "any" },
  { id: "home-felt", text: "How did home feel today?", tags: ["home", "mood"], when: "evening" },
  { id: "home-fix", text: "What small change would make home easier?", tags: ["home"], when: "any" },
  { id: "pet-today", text: "What did your pet get up to today?", tags: ["pets"], when: "evening" },
  { id: "pet-needs", text: "Does your pet need anything this week?", tags: ["pets", "planning"], when: "any" },
  { id: "pet-moment", text: "What was your favourite moment with them today?", tags: ["pets", "gratitude"], when: "evening" },
  { id: "nat-outside", text: "When did you get outside today?", tags: ["nature", "health"], when: "evening" },
  { id: "nat-noticed", text: "What did you notice outside today?", tags: ["nature", "reflection"], when: "evening" },
  { id: "nat-growing", text: "What's growing, or what needs doing outside?", tags: ["nature", "home"], when: "any" },
  { id: "faith-thankful", text: "What are you thankful for today?", tags: ["faith", "gratitude"], when: "any" },
  { id: "faith-carry", text: "What are you carrying into today?", tags: ["faith", "reflection"], when: "morning" },
  { id: "faith-practice", text: "How did your practice feel today?", tags: ["faith"], when: "evening" },
  { id: "mus-listening", text: "What have you been listening to?", tags: ["music"], when: "any" },
  { id: "mus-played", text: "What did you play or practise today?", tags: ["music", "creativity"], when: "evening" },
  { id: "mus-trouble", text: "Which song or part is giving you trouble?", tags: ["music", "blockers"], when: "any" },
  { id: "read-now", text: "What are you reading at the moment?", tags: ["reading", "learning"], when: "any" },
  { id: "read-line", text: "What's a line from your reading that stayed with you?", tags: ["reading", "reflection"], when: "any" },
  { id: "read-next", text: "What do you want to read next?", tags: ["reading"], when: "any" },
  { id: "trv-next", text: "Where would you like to go next?", tags: ["travel"], when: "any" },
  { id: "trv-plan", text: "What's left to plan for your next trip?", tags: ["travel", "planning"], when: "any" },
  { id: "trv-remember", text: "What from this trip do you want to remember?", tags: ["travel", "reflection"], when: "evening" },
  { id: "rest-when", text: "When did you rest today?", tags: ["rest", "health"], when: "evening" },
  { id: "rest-recharge", text: "What would actually recharge you this week?", tags: ["rest", "planning"], when: "any" },
  { id: "rest-no", text: "What could you say no to this week?", tags: ["rest", "focus"], when: "any" },
  { id: "care-today", text: "Who did you look after today, and how did it go?", tags: ["caring", "family"], when: "evening" },
  { id: "care-easier", text: "What would make looking after them easier this week?", tags: ["caring", "planning"], when: "any" },
  { id: "care-you", text: "What did you do for yourself today?", tags: ["caring", "rest"], when: "evening" },
  { id: "com-helped", text: "Who did you help, or who helped you, today?", tags: ["community", "gratitude"], when: "evening" },
  { id: "com-talked", text: "Who did you talk to today that you don't usually?", tags: ["community", "friends"], when: "evening" },
  { id: "com-give", text: "Is there something you'd like to give time to?", tags: ["community", "planning"], when: "any" },
];

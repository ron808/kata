// Demo people for local development: the Lab's cast (components/lab/cast.ts) as real accounts,
// with moments, reactions, replies, shared threads and follows among them.
//
//   npm run seed:social
//   npm run seed:social -- --follow you@example.com   also connects that account to the cast
//
// Insert-only and idempotent: anything already there is skipped, and existing documents are only
// ever touched by $inc on the counts that a document inserted by this run adds to. Refuses to run
// against anything but a local database. Prints counts only.
//
// The schemas below mirror lib/db/models/*.ts field for field (and index for index, since mongoose
// builds the indexes from them). Keep them in sync when a model changes.

import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const { Schema } = mongoose;

// ── Environment ─────────────────────────────────────────────────────────────

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readMongoUri() {
  let text;
  try {
    text = readFileSync(path.join(root, ".env.local"), "utf8");
  } catch {
    return null;
  }
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?MONGODB_URI\s*=\s*(.*?)\s*$/);
    if (match) return match[1].replace(/^(['"])(.*)\1$/, "$2");
  }
  return null;
}

/** Every host in the URI is localhost or 127.0.0.1. mongodb+srv always means a remote cluster. */
function isLocal(uri) {
  const match = uri.match(/^mongodb:\/\/(?:[^@/]*@)?([^/?#]+)/);
  if (!match) return false;
  return match[1]
    .split(",")
    .every((host) => ["localhost", "127.0.0.1"].includes(host.replace(/:\d+$/, "").toLowerCase()));
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

const args = process.argv.slice(2);
const followAt = args.indexOf("--follow");
const followEmail = followAt === -1 ? null : args[followAt + 1]?.trim().toLowerCase();
if (followAt !== -1 && !followEmail) fail("Usage: npm run seed:social -- [--follow <email>]");

const uri = readMongoUri();
if (!uri) fail("MONGODB_URI is not set in .env.local.");
if (!isLocal(uri)) fail("Refusing to seed: MONGODB_URI must point at localhost or 127.0.0.1.");

// ── Schemas (mirroring lib/db/models) ───────────────────────────────────────

const CHECK_INS = ["morning", "evening", "both"];
const MOMENT_KINDS = ["win", "ship", "thought", "question", "milestone", "page"];
const VISIBILITIES = ["public", "friends"];
const REACTION_KINDS = ["nice", "same", "go", "hug"];
const NOTIFICATION_KINDS = ["follow", "reaction", "reply"];
const THREAD_KINDS = ["project", "task", "goal", "habit", "person", "event", "health", "learning", "other"];
const THREAD_STATUSES = ["moving", "stuck", "waiting", "done", "paused"];

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, default: "Custom" },
    timezone: { type: String, default: "UTC" },
    activeTemplateId: { type: Schema.Types.ObjectId, ref: "Template", default: null },
    streak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    totalEntries: { type: Number, default: 0 },
    totalWords: { type: Number, default: 0 },
    lastEntryDate: { type: Date, default: null },
    lastWeeklyDigest: { type: Date, default: null },
    lastMonthlyDigest: { type: Date, default: null },
    handle: { type: String, default: null, lowercase: true, trim: true },
    bio: { type: String, default: "", maxlength: 160 },
    isPublic: { type: Boolean, default: false },
    interests: [{ type: String }],
    checkIn: { type: String, enum: CHECK_INS, default: "morning" },
    onboardedAt: { type: Date, default: null },
    followerCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
    hue: { type: Number, default: () => Math.floor(Math.random() * 8) },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);
UserSchema.index({ handle: 1 }, { unique: true, partialFilterExpression: { handle: { $type: "string" } } });
UserSchema.index({ isPublic: 1, followerCount: -1 });

const MomentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, trim: true, maxlength: 500 },
    kind: { type: String, enum: MOMENT_KINDS, default: "thought" },
    tags: [{ type: String }],
    threadTitle: { type: String, default: null, maxlength: 60 },
    visibility: { type: String, enum: VISIBILITIES, default: "public" },
    entryId: { type: Schema.Types.ObjectId, ref: "Entry", default: null },
    reactions: {
      nice: { type: Number, default: 0 },
      same: { type: Number, default: 0 },
      go: { type: Number, default: 0 },
      hug: { type: Number, default: 0 },
    },
    replyCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);
MomentSchema.index({ userId: 1, createdAt: -1 });
MomentSchema.index({ visibility: 1, createdAt: -1 });
MomentSchema.index({ tags: 1, createdAt: -1 });

const FollowSchema = new Schema(
  {
    followerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    followeeId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);
FollowSchema.index({ followerId: 1, followeeId: 1 }, { unique: true });
FollowSchema.index({ followeeId: 1, createdAt: -1 });

const ReactionSchema = new Schema(
  {
    momentId: { type: Schema.Types.ObjectId, ref: "Moment", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    kind: { type: String, enum: REACTION_KINDS, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);
ReactionSchema.index({ momentId: 1, userId: 1, kind: 1 }, { unique: true });

const ReplySchema = new Schema(
  {
    momentId: { type: Schema.Types.ObjectId, ref: "Moment", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, trim: true, maxlength: 500 },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);
ReplySchema.index({ momentId: 1, createdAt: 1 });

const NotificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    kind: { type: String, enum: NOTIFICATION_KINDS, required: true },
    momentId: { type: Schema.Types.ObjectId, ref: "Moment", default: null },
    reaction: { type: String, enum: [...REACTION_KINDS, null], default: null },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

const ThreadLogSchema = new Schema(
  {
    at: { type: Date, default: Date.now },
    text: { type: String, default: "", maxlength: 500 },
    status: { type: String, enum: [...THREAD_STATUSES, null], default: null },
    from: { type: String, enum: ["you", "kata", "page"], default: "you" },
  },
  { _id: false }
);

const ThreadSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true, maxlength: 60 },
    key: { type: String, required: true },
    kind: { type: String, enum: THREAD_KINDS, default: "other" },
    status: { type: String, enum: THREAD_STATUSES, default: "moving" },
    tags: [{ type: String }],
    nextStep: { type: String, default: "", maxlength: 140 },
    lastNote: { type: String, default: "", maxlength: 280 },
    dueAt: { type: Date, default: null },
    lastTouchedAt: { type: Date, default: Date.now },
    touchCount: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    hue: { type: Number, default: 0 },
    shared: { type: Boolean, default: false },
    source: { type: String, enum: ["kata", "page", "manual"], default: "manual" },
    archived: { type: Boolean, default: false },
    log: { type: [ThreadLogSchema], default: [] },
  },
  { timestamps: true }
);
ThreadSchema.index({ userId: 1, key: 1 }, { unique: true });
ThreadSchema.index({ userId: 1, archived: 1, lastTouchedAt: -1 });

const User = mongoose.model("User", UserSchema);
const Moment = mongoose.model("Moment", MomentSchema);
const Follow = mongoose.model("Follow", FollowSchema);
const Reaction = mongoose.model("Reaction", ReactionSchema);
const Reply = mongoose.model("Reply", ReplySchema);
const Notification = mongoose.model("Notification", NotificationSchema);
const Thread = mongoose.model("Thread", ThreadSchema);

// ── The cast ────────────────────────────────────────────────────────────────

const HOUR = 3_600_000;
const now = Date.now();
/** A time `days` (fractional is fine) before the seed runs. */
const ago = (days) => new Date(now - days * 24 * HOUR);

const PEOPLE = [
  {
    id: "mira",
    name: "Mira Okafor",
    handle: "mira",
    role: "Designer",
    timezone: "Europe/Lisbon",
    hue: 0,
    joined: 46,
    bio: "Type and interface designer in Lisbon. Rebuilding my portfolio one case study at a time.",
    interests: ["typography", "portfolio", "ceramics", "design systems"],
    threads: [
      { title: "Portfolio rebuild", kind: "project", status: "moving", touched: 0.8, hue: 0 },
      { title: "Wheel-throwing class", kind: "learning", status: "moving", touched: 4.6, hue: 3 },
    ],
    moments: [
      {
        key: "case-study",
        kind: "ship",
        days: 0.9,
        thread: "Portfolio rebuild",
        tags: ["portfolio", "writing"],
        text: "Shipped the transit app case study. Cut it from 2,400 words to 600, and it reads better for it: one problem, three decisions, the before and after.",
      },
      {
        key: "typeface",
        kind: "thought",
        days: 3.2,
        tags: ["typography"],
        text: "Every typeface I've chosen by scrolling a specimen page, I've regretted. Every one I chose by setting a real paragraph from the project, I haven't.",
      },
      {
        key: "cylinder",
        kind: "win",
        days: 5.1,
        visibility: "friends",
        thread: "Wheel-throwing class",
        tags: ["ceramics"],
        text: "Pulled my first cylinder on the wheel that didn't collapse. It leans a little to the left, but it's standing on the shelf.",
      },
      {
        key: "nda",
        kind: "question",
        days: 8.4,
        tags: ["portfolio"],
        text: "How do you show work that's under NDA in a portfolio? Blur it, rebuild it with fake data, or only write about it?",
      },
    ],
  },
  {
    id: "arjun",
    name: "Arjun Rao",
    handle: "arjun",
    role: "Founder",
    timezone: "Asia/Kolkata",
    hue: 1,
    joined: 52,
    bio: "Building a small invoicing tool for freelancers in India. Two co-founders, one office plant.",
    interests: ["startups", "product", "fundraising", "cricket"],
    threads: [
      { title: "Invoicing beta", kind: "project", status: "moving", touched: 1.7, hue: 1 },
      { title: "Seed round", kind: "goal", status: "waiting", touched: 3.9, hue: 5 },
    ],
    moments: [
      {
        key: "hundredth",
        kind: "milestone",
        days: 1.8,
        thread: "Invoicing beta",
        tags: ["startups"],
        text: "Our 100th paying customer: a wedding photographer in Pune. I called to thank her and she was very confused about why a software company was calling.",
      },
      {
        key: "investors",
        kind: "thought",
        days: 3.9,
        visibility: "friends",
        thread: "Seed round",
        tags: ["fundraising"],
        text: "Investor meeting number fourteen. The questions keep getting better, which I suspect means my answers are getting worse.",
      },
      {
        key: "gst",
        kind: "ship",
        days: 6.2,
        thread: "Invoicing beta",
        tags: ["product"],
        text: "GST-ready invoices are live. It took three weeks, and the tax rules took two of them.",
      },
      {
        key: "weekends",
        kind: "question",
        days: 9.3,
        tags: ["startups", "rest"],
        text: "Founders who stopped working weekends: what did you drop first, and what broke when you did?",
      },
      {
        key: "sleep",
        kind: "win",
        days: 0.6,
        visibility: "friends",
        tags: ["rest"],
        text: "Slept eight hours. First time since March.",
      },
    ],
  },
  {
    id: "lena",
    name: "Lena Fischer",
    handle: "lena",
    role: "Student",
    timezone: "Europe/Berlin",
    hue: 2,
    joined: 33,
    bio: "Second-year physics at TU Berlin. Learning to explain things out loud before the exam does it for me.",
    interests: ["physics", "studying", "running"],
    threads: [
      { title: "Thermodynamics exam", kind: "event", status: "moving", touched: 1.1, hue: 2 },
      { title: "Couch to 10k", kind: "habit", status: "moving", touched: 2.9, hue: 6 },
    ],
    moments: [
      {
        key: "entropy",
        kind: "win",
        days: 1.2,
        thread: "Thermodynamics exam",
        tags: ["physics", "studying"],
        text: "Explained entropy to my flatmate without notes. She asked one question I couldn't answer, so that's tomorrow's page.",
      },
      {
        key: "five-k",
        kind: "milestone",
        days: 2.9,
        thread: "Couch to 10k",
        tags: ["running"],
        text: "Ran 5k without stopping. Week six of the plan, right on schedule, and slower than everyone else in Tiergarten.",
      },
      {
        key: "flashcards",
        kind: "question",
        days: 5.4,
        tags: ["studying"],
        text: "Does anyone have a way to make flashcards for derivations, not just facts? Mine turn into a picture of the answer.",
      },
      {
        key: "rereading",
        kind: "page",
        days: 7.2,
        tags: ["studying"],
        text: "I keep rereading the chapter instead of doing the problems. Rereading feels like work. It isn't.",
      },
    ],
  },
  {
    id: "theo",
    name: "Theo Lindqvist",
    handle: "theo",
    role: "Writer",
    timezone: "Europe/Stockholm",
    hue: 3,
    joined: 58,
    bio: "Writing a novel about a lighthouse keeper's daughter. Five hundred words before coffee, most days.",
    interests: ["writing", "fiction", "walking", "books"],
    threads: [{ title: "Novel draft", kind: "project", status: "moving", touched: 0.4, hue: 4 }],
    moments: [
      {
        key: "forty-k",
        kind: "milestone",
        days: 2.1,
        thread: "Novel draft",
        tags: ["writing", "fiction"],
        text: "The draft crossed 40,000 words. Chapter eleven finally knows what it's about.",
      },
      {
        key: "sea",
        kind: "page",
        days: 4.3,
        tags: ["writing"],
        text: "The sea doesn't care about the plot, and that's the most useful note I've had all month.",
      },
      {
        key: "no-phone",
        kind: "thought",
        days: 6.5,
        tags: ["walking", "writing"],
        text: "Walked to Skeppsholmen and back without my phone. Came home with three lines of dialogue and cold ears.",
      },
      {
        key: "chapter-one",
        kind: "win",
        days: 8.8,
        visibility: "friends",
        thread: "Novel draft",
        tags: ["writing"],
        text: "Sent chapter one to my writing group. Terrified, in a useful way.",
      },
      {
        key: "reading",
        kind: "question",
        days: 0.7,
        tags: ["books"],
        text: "What are you reading this week? I need something with short chapters for the tram.",
      },
    ],
  },
  {
    id: "priya",
    name: "Priya Nair",
    handle: "priya",
    role: "Job Seeker",
    timezone: "America/Toronto",
    hue: 4,
    joined: 29,
    bio: "Data analyst between jobs. Applying with care, not volume. SQL, small dashboards, long walks by the lake.",
    interests: ["interviews", "sql", "dataviz", "walking"],
    threads: [
      { title: "Job search", kind: "goal", status: "moving", touched: 1.0, hue: 7 },
      { title: "SQL practice", kind: "learning", status: "moving", touched: 5.0, hue: 2 },
    ],
    moments: [
      {
        key: "second-round",
        kind: "win",
        days: 1.0,
        thread: "Job search",
        tags: ["interviews"],
        text: "Second-round interview with a public health data team. They asked about my messiest dataset and for once I had a good story ready.",
      },
      {
        key: "four",
        kind: "thought",
        days: 3.4,
        thread: "Job search",
        tags: ["applications"],
        text: "Sent four applications this week instead of twenty. Each one had a real cover letter. It already feels less like shouting into a well.",
      },
      {
        key: "library",
        kind: "ship",
        days: 5.0,
        thread: "SQL practice",
        tags: ["dataviz", "sql"],
        text: "Published a small dashboard of Toronto library branch hours against foot traffic. Built it for practice; learned more about messy CSVs than about libraries.",
      },
      {
        key: "why-leave",
        kind: "question",
        days: 8.1,
        visibility: "friends",
        tags: ["interviews"],
        text: "How do you answer \"why did you leave your last job\" when the honest answer is \"the whole team was dissolved\"?",
      },
    ],
  },
  {
    id: "kenji",
    name: "Kenji Mori",
    handle: "kenji",
    role: "Developer",
    timezone: "Asia/Tokyo",
    hue: 5,
    joined: 64,
    bio: "Backend developer in Kyoto. Rust at work, a slow side project at home. Tea before standup.",
    interests: ["rust", "opensource", "tea", "cycling"],
    threads: [
      { title: "Tea timer app", kind: "project", status: "moving", touched: 2.3, hue: 5 },
      { title: "Payments service rewrite", kind: "project", status: "stuck", touched: 1.4, hue: 1 },
    ],
    moments: [
      {
        key: "tea-timer",
        kind: "ship",
        days: 2.3,
        thread: "Tea timer app",
        tags: ["sideproject", "tea"],
        text: "Released v0.3 of my tea timer. It now knows that gyokuro wants cooler water than sencha, and it stops nagging after the second steep.",
      },
      {
        key: "deleting",
        kind: "thought",
        days: 4.1,
        thread: "Payments service rewrite",
        tags: ["rust"],
        text: "Spent the morning deleting code. The service is 1,200 lines lighter and does exactly the same thing.",
      },
      {
        key: "side-project",
        kind: "question",
        days: 6.0,
        tags: ["sideproject"],
        text: "How do you keep a side project alive when your day job is also programming?",
      },
      {
        key: "flaky",
        kind: "win",
        days: 1.4,
        thread: "Payments service rewrite",
        tags: ["rust", "testing"],
        text: "Fixed the flaky test that has haunted CI since August. It was a timezone. It's always a timezone.",
      },
      {
        key: "kamo",
        kind: "page",
        days: 7.9,
        visibility: "friends",
        tags: ["cycling"],
        text: "Cycled along the Kamo river before work and thought about nothing for forty minutes, which was the point.",
      },
    ],
  },
  {
    // The cast's id for Dina is "ana".
    id: "ana",
    name: "Dina Duarte",
    handle: "dina",
    role: "Teacher",
    timezone: "Europe/Lisbon",
    hue: 6,
    joined: 38,
    bio: "Primary school teacher in Porto. Twenty-six eight-year-olds and one class tortoise called Fernando.",
    interests: ["teaching", "reading", "gardening"],
    threads: [
      { title: "Reading corner", kind: "project", status: "done", touched: 4.0, hue: 6 },
      { title: "Balcony garden", kind: "habit", status: "moving", touched: 2.2, hue: 3 },
    ],
    moments: [
      {
        key: "read-aloud",
        kind: "win",
        days: 1.1,
        tags: ["teaching"],
        text: "A boy who wouldn't read aloud in September read a whole page to the class today. Nobody laughed. Everybody clapped, including Fernando, probably.",
      },
      {
        key: "corner",
        kind: "ship",
        days: 4.0,
        thread: "Reading corner",
        tags: ["teaching", "reading"],
        text: "The reading corner is finished: two beanbags, one rug, forty-one donated books and a sign the children painted themselves.",
      },
      {
        key: "marking",
        kind: "thought",
        days: 6.3,
        visibility: "friends",
        tags: ["teaching"],
        text: "Marking at the kitchen table again. I need to stop promising myself Sunday evenings back.",
      },
      {
        key: "wound-up",
        kind: "question",
        days: 9.1,
        tags: ["teaching"],
        text: "Teachers: what's your end-of-day routine for a class that's too wound up to listen to anything?",
      },
    ],
  },
  {
    id: "nani",
    name: "Nani",
    handle: "nani",
    role: "Grandmother",
    timezone: "Asia/Kolkata",
    hue: 7,
    joined: 27,
    bio: "Grandmother, cook, retired maths teacher. My grandson set this up for me. I write a little every evening.",
    interests: ["cooking", "gardening", "family", "walking"],
    threads: [
      { title: "Recipe book for the grandchildren", kind: "project", status: "moving", touched: 1.9, hue: 0 },
      { title: "Morning walk", kind: "habit", status: "moving", touched: 0.5, hue: 4 },
    ],
    moments: [
      {
        key: "twentieth",
        kind: "milestone",
        days: 1.9,
        thread: "Recipe book for the grandchildren",
        tags: ["cooking", "family"],
        text: "Wrote down the twentieth recipe for the grandchildren's book. Pesarattu, the way my mother made it, with the ginger chopped and not grated.",
      },
      {
        key: "curry-leaf",
        kind: "page",
        days: 5.2,
        tags: ["gardening"],
        text: "The curry leaf plant has come back after the heat. I said good morning to it. It did not reply.",
      },
      {
        key: "long-division",
        kind: "thought",
        days: 7.0,
        visibility: "friends",
        tags: ["family"],
        text: "My grandson asked how I learned long division. I told him: on a slate, with a teacher who never smiled. He did not believe me about the slate.",
      },
      {
        key: "temple",
        kind: "win",
        days: 0.5,
        visibility: "friends",
        thread: "Morning walk",
        tags: ["walking"],
        text: "Walked to the temple and back without stopping to rest. Forty minutes.",
      },
    ],
  },
];

/** follower → followee. Both directions make friends, who see each other's friends-only moments. */
const FOLLOWS = [
  ["mira", "theo"], ["theo", "mira"],
  ["mira", "ana"], ["ana", "mira"],
  ["mira", "kenji"], ["kenji", "mira"],
  ["arjun", "kenji"], ["kenji", "arjun"],
  ["arjun", "priya"], ["priya", "arjun"],
  ["lena", "priya"], ["priya", "lena"],
  ["lena", "theo"], ["theo", "lena"],
  ["theo", "nani"], ["nani", "theo"],
  ["nani", "ana"], ["ana", "nani"],
  ["kenji", "lena"],
  ["priya", "mira"],
  ["ana", "lena"],
  ["arjun", "mira"],
  ["nani", "kenji"],
];

/** "person.moment": { reaction: [who] }. Friends-only moments only get reactions from friends. */
const REACTIONS = {
  "mira.case-study": { nice: ["theo", "kenji", "priya"], go: ["arjun"] },
  "mira.typeface": { same: ["theo", "kenji"], nice: ["ana"] },
  "mira.cylinder": { nice: ["theo"], go: ["ana", "kenji"] },
  "mira.nda": { same: ["priya", "kenji"] },
  "arjun.hundredth": { nice: ["kenji", "priya", "mira", "lena"], go: ["theo"] },
  "arjun.investors": { same: ["kenji"], hug: ["priya"] },
  "arjun.gst": { nice: ["kenji"] },
  "arjun.weekends": { same: ["mira", "priya"] },
  "arjun.sleep": { nice: ["kenji", "priya"] },
  "lena.entropy": { nice: ["priya", "theo"], go: ["kenji"] },
  "lena.five-k": { go: ["priya", "theo", "ana"], nice: ["nani"] },
  "lena.flashcards": { same: ["priya", "kenji"] },
  "lena.rereading": { same: ["priya", "theo", "mira"] },
  "theo.forty-k": { go: ["mira", "lena", "nani"], nice: ["ana"] },
  "theo.sea": { nice: ["mira", "nani"] },
  "theo.no-phone": { same: ["mira"], nice: ["lena"] },
  "theo.chapter-one": { go: ["mira"], hug: ["nani"] },
  "theo.reading": { nice: ["lena"] },
  "priya.second-round": { go: ["arjun", "lena", "mira"] },
  "priya.four": { nice: ["arjun", "lena"], same: ["kenji"] },
  "priya.library": { nice: ["arjun", "kenji"] },
  "priya.why-leave": { hug: ["arjun", "lena"] },
  "kenji.tea-timer": { nice: ["mira", "arjun", "lena"] },
  "kenji.deleting": { nice: ["arjun"], same: ["mira"] },
  "kenji.side-project": { same: ["arjun", "lena", "priya"] },
  "kenji.flaky": { same: ["arjun", "mira"], nice: ["nani"] },
  "kenji.kamo": { nice: ["mira"] },
  "ana.read-aloud": { hug: ["mira", "nani"], nice: ["theo", "lena"] },
  "ana.corner": { nice: ["mira", "nani", "lena"] },
  "ana.marking": { hug: ["nani"], same: ["mira"] },
  "ana.wound-up": { same: ["nani"] },
  "nani.twentieth": { nice: ["theo", "ana"], hug: ["mira"] },
  "nani.curry-leaf": { nice: ["theo", "ana", "kenji"] },
  "nani.long-division": { nice: ["theo"], same: ["ana"] },
  "nani.temple": { go: ["theo", "ana"] },
};

/** Replies, `hours` after the moment. */
const REPLIES = [
  { on: "mira.nda", by: "theo", hours: 2, text: "Write about it. The thinking is the part they're hiring." },
  { on: "mira.nda", by: "kenji", hours: 5, text: "Rebuild the key screen with fake data and label it as a reconstruction. Nobody minds." },
  { on: "arjun.hundredth", by: "priya", hours: 3, text: "This is lovely. Did she stay on the call in the end?" },
  { on: "arjun.hundredth", by: "arjun", hours: 4, text: "She did. She asked whether we do discounts." },
  { on: "lena.flashcards", by: "kenji", hours: 6, text: "Put the first and last line on the card and fill in the middle from memory." },
  { on: "lena.flashcards", by: "priya", hours: 9, text: "I used to film myself doing them on a whiteboard. Painful to watch, but it worked." },
  { on: "theo.reading", by: "mira", hours: 1, text: "Flights, by Olga Tokarczuk. Some chapters are a page long." },
  { on: "theo.reading", by: "nani", hours: 3, text: "Malgudi Days, by R. K. Narayan. Short stories, and kind ones." },
  { on: "priya.why-leave", by: "lena", hours: 2, text: "Just say it. \"The team was dissolved\" is a complete sentence." },
  { on: "priya.why-leave", by: "arjun", hours: 7, text: "Say it plainly, then talk about what you want next. That's the part they'll remember." },
  { on: "kenji.side-project", by: "arjun", hours: 4, text: "Make it small enough to ship on a Sunday morning." },
  { on: "ana.wound-up", by: "mira", hours: 5, text: "My sister does two minutes of silence with the lights off. She says it's the best two minutes of her day." },
  { on: "ana.wound-up", by: "nani", hours: 12, text: "Forty years of teaching: a song. Everyone sings, so nobody can talk." },
  { on: "nani.curry-leaf", by: "theo", hours: 8, text: "It's listening. Plants are just slow to answer." },
];

/** With --follow: the account follows these five, and the first three follow it back. */
const FOLLOWED_BY_TARGET = ["mira", "kenji", "nani", "arjun", "theo"];
const FOLLOW_BACK = ["mira", "kenji", "nani"];

// The demo should obey the rules it demonstrates: only friends react to or reply on friends-only moments.
{
  const follows = new Set(FOLLOWS.map(([a, b]) => `${a}>${b}`));
  const friends = (a, b) => follows.has(`${a}>${b}`) && follows.has(`${b}>${a}`);
  const moments = new Map(PEOPLE.flatMap((p) => p.moments.map((m) => [`${p.id}.${m.key}`, { ...m, author: p.id }])));
  const reach = [
    ...Object.entries(REACTIONS).flatMap(([on, byKind]) => Object.values(byKind).flat().map((by) => ({ on, by }))),
    ...REPLIES,
  ];
  for (const { on, by } of reach) {
    const moment = moments.get(on);
    if (!moment) fail(`Seed data: unknown moment ${on}.`);
    if (moment.visibility === "friends" && by !== moment.author && !friends(by, moment.author)) {
      fail(`Seed data: ${by} can't see ${on}.`);
    }
  }
}

// ── Writing ─────────────────────────────────────────────────────────────────

const counts = Object.fromEntries(
  ["people", "moments", "threads", "follows", "reactions", "replies", "notifications"].map((k) => [
    k,
    { created: 0, existing: 0 },
  ])
);

/** Inserts `doc` unless `filter` already matches. Returns the document's id and whether it's new. */
async function insertOnce(Model, label, filter, doc) {
  const found = await Model.findOne(filter).select("_id").lean();
  if (found) {
    counts[label].existing++;
    return { id: found._id, created: false };
  }
  try {
    const inserted = await Model.create(doc);
    counts[label].created++;
    return { id: inserted._id, created: true };
  } catch (err) {
    if (err?.code !== 11000) throw err;
    counts[label].existing++;
    return { id: (await Model.findOne(filter).select("_id").lean())?._id ?? null, created: false };
  }
}

async function freeHandle(base) {
  for (let n = 1; ; n++) {
    const handle = n === 1 ? base : `${base}_${n}`;
    if (!(await User.exists({ handle }))) return handle;
  }
}

const threadKey = (title) => title.toLowerCase().replace(/\s+/g, " ").trim();

async function follow(followerId, followeeId, createdAt) {
  const { created } = await insertOnce(
    Follow,
    "follows",
    { followerId, followeeId },
    { followerId, followeeId, createdAt }
  );
  if (created) {
    await User.updateOne({ _id: followeeId }, { $inc: { followerCount: 1 } });
    await User.updateOne({ _id: followerId }, { $inc: { followingCount: 1 } });
  }
  return created;
}

async function seed() {
  const target = followEmail ? await User.findOne({ email: followEmail }).select("_id").lean() : null;
  if (followEmail && !target) fail("No account has the --follow email.");

  const ids = new Map();
  for (const person of PEOPLE) {
    const email = `${person.id}@demo.kata.local`;
    const existing = await User.findOne({ email }).select("_id").lean();
    if (existing) {
      counts.people.existing++;
      ids.set(person.id, existing._id);
      continue;
    }
    const { id } = await insertOnce(User, "people", { email }, {
      name: person.name,
      email,
      // A hash of a random secret nobody keeps: the account can't be signed into.
      passwordHash: await bcrypt.hash(randomBytes(32).toString("base64url"), 10),
      role: person.role,
      timezone: person.timezone,
      handle: await freeHandle(person.handle),
      bio: person.bio,
      isPublic: true,
      interests: person.interests,
      hue: person.hue,
      createdAt: ago(person.joined),
    });
    ids.set(person.id, id);
  }

  for (const person of PEOPLE) {
    const userId = ids.get(person.id);
    for (const thread of person.threads) {
      const key = threadKey(thread.title);
      await insertOnce(Thread, "threads", { userId, key }, {
        userId,
        title: thread.title,
        key,
        kind: thread.kind,
        status: thread.status,
        lastTouchedAt: ago(thread.touched),
        touchCount: 4 + Math.floor(Math.random() * 9),
        hue: thread.hue,
        shared: true,
        source: "manual",
      });
    }
  }

  const moments = new Map();
  for (const person of PEOPLE) {
    const userId = ids.get(person.id);
    for (const m of person.moments) {
      const createdAt = ago(m.days);
      const { id } = await insertOnce(Moment, "moments", { userId, text: m.text }, {
        userId,
        text: m.text,
        kind: m.kind,
        tags: m.tags,
        threadTitle: m.thread ?? null,
        visibility: m.visibility ?? "public",
        createdAt,
      });
      moments.set(`${person.id}.${m.key}`, { id, createdAt });
    }
  }

  for (const [follower, followee] of FOLLOWS) {
    await follow(ids.get(follower), ids.get(followee), ago(10 + Math.random() * 20));
  }

  for (const [on, byKind] of Object.entries(REACTIONS)) {
    const moment = moments.get(on);
    for (const [kind, people] of Object.entries(byKind)) {
      for (const [i, who] of people.entries()) {
        const userId = ids.get(who);
        const { created } = await insertOnce(Reaction, "reactions", { momentId: moment.id, userId, kind }, {
          momentId: moment.id,
          userId,
          kind,
          createdAt: new Date(Math.min(now, moment.createdAt.getTime() + (i + 1) * 1.5 * HOUR)),
        });
        if (created) await Moment.updateOne({ _id: moment.id }, { $inc: { [`reactions.${kind}`]: 1 } });
      }
    }
  }

  for (const reply of REPLIES) {
    const moment = moments.get(reply.on);
    const userId = ids.get(reply.by);
    const { created } = await insertOnce(Reply, "replies", { momentId: moment.id, userId, text: reply.text }, {
      momentId: moment.id,
      userId,
      text: reply.text,
      createdAt: new Date(Math.min(now, moment.createdAt.getTime() + reply.hours * HOUR)),
    });
    if (created) await Moment.updateOne({ _id: moment.id }, { $inc: { replyCount: 1 } });
  }

  if (!target) return;
  for (const who of FOLLOWED_BY_TARGET) {
    if (String(ids.get(who)) !== String(target._id)) await follow(target._id, ids.get(who), ago(0.2));
  }
  for (const [i, who] of FOLLOW_BACK.entries()) {
    const actorId = ids.get(who);
    const createdAt = ago(0.15 - i * 0.04);
    if (String(actorId) === String(target._id) || !(await follow(actorId, target._id, createdAt))) continue;
    await insertOnce(
      Notification,
      "notifications",
      { userId: target._id, actorId, kind: "follow", momentId: null },
      { userId: target._id, actorId, kind: "follow", momentId: null, createdAt }
    );
  }
}

try {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5_000 });
  await Promise.all(mongoose.modelNames().map((name) => mongoose.model(name).init()));
  await seed();
  console.log("Demo cast seeded.");
  for (const [label, { created, existing }] of Object.entries(counts)) {
    console.log(`  ${label.padEnd(14)} ${String(created).padStart(3)} new  ${String(existing).padStart(3)} already there`);
  }
} catch (err) {
  // Driver messages can quote the connection string; never print it.
  fail(`Seeding failed: ${String(err?.message ?? err).replace(/mongodb(?:\+srv)?:\/\/\S+/g, "<MONGODB_URI>")}`);
} finally {
  await mongoose.disconnect();
}

import { connectDB } from "@/lib/db/mongoose";
import { Moment } from "@/lib/db/models/Moment";
import { Notification } from "@/lib/db/models/Notification";
import { Thread } from "@/lib/db/models/Thread";
import { User } from "@/lib/db/models/User";
import type { MomentT, NotificationT, PersonT, ThreadKind, ThreadStatus } from "@/lib/types";
import { HANDLE_PATTERN, normalizeHandle, suggestHandle } from "./handles";
import { PERSON_FIELDS, momentsFor, notificationsFor, peopleFor, toProfile, type ProfileT } from "./dto";
import { feed, type FeedOptions, type FeedPage } from "./feed";
import { discoverPeople, suggestedPeople, type PeopleFilters } from "./people";
import { visibleTo } from "./visibility";

// Server-side loaders for pages and the API alike. Each takes the signed-in viewer's id.

const PROFILE_MOMENTS = 20;
const SHARED_THREADS = 12;
const NOTIFICATIONS = 50;

/** A thread its owner chose to show, as "working on". Nothing else about their threads leaves. */
export interface SharedThreadT {
  title: string;
  kind: ThreadKind;
  status: ThreadStatus;
  lastTouchedAt: string;
}

export interface ProfilePageT {
  person: PersonT;
  moments: MomentT[];
  sharedThreads: SharedThreadT[];
}

export async function loadMe(viewerId: string): Promise<ProfileT | null> {
  await connectDB();
  const user = await User.findById(viewerId).select(`${PERSON_FIELDS} isPublic interests`).lean();
  if (!user) return null;
  return toProfile(user, user.handle ? undefined : await suggestHandle(user.name));
}

export async function loadFeed(viewerId: string, options: FeedOptions): Promise<FeedPage> {
  await connectDB();
  return feed(viewerId, options);
}

/** Anyone signed in can open a profile by handle; what's on it depends on who's looking. */
export async function loadProfile(viewerId: string, rawHandle: string): Promise<ProfilePageT | null> {
  const handle = normalizeHandle(rawHandle);
  if (!HANDLE_PATTERN.test(handle)) return null;
  await connectDB();
  const user = await User.findOne({ handle }).select(PERSON_FIELDS).lean();
  if (!user) return null;
  const [person] = await peopleFor(viewerId, [user]);
  if (!person) return null;

  const friends = person.isFollowing && person.followsYou;
  const [moments, threads] = await Promise.all([
    Moment.find({ userId: user._id, ...visibleTo(viewerId, friends ? [user._id] : []) })
      .sort({ createdAt: -1, _id: -1 })
      .limit(PROFILE_MOMENTS)
      .lean(),
    Thread.find({ userId: user._id, shared: true, archived: false })
      .select("title kind status lastTouchedAt")
      .sort({ lastTouchedAt: -1 })
      .limit(SHARED_THREADS)
      .lean(),
  ]);
  return {
    person,
    moments: await momentsFor(viewerId, moments),
    sharedThreads: threads.map((t) => ({
      title: t.title,
      kind: t.kind,
      status: t.status,
      lastTouchedAt: t.lastTouchedAt.toISOString(),
    })),
  };
}

export async function loadPeople(
  viewerId: string,
  filters: PeopleFilters = {}
): Promise<{ people: PersonT[]; suggested: PersonT[] }> {
  await connectDB();
  const [people, suggested] = await Promise.all([
    discoverPeople(viewerId, filters),
    suggestedPeople(viewerId),
  ]);
  return { people, suggested };
}

export async function loadNotifications(
  viewerId: string
): Promise<{ items: NotificationT[]; unread: number }> {
  await connectDB();
  const [items, unread] = await Promise.all([
    Notification.find({ userId: viewerId })
      .sort({ createdAt: -1, _id: -1 })
      .limit(NOTIFICATIONS)
      .lean(),
    Notification.countDocuments({ userId: viewerId, read: false }),
  ]);
  return { items: await notificationsFor(items), unread };
}

export async function unreadCount(viewerId: string): Promise<number> {
  await connectDB();
  return Notification.countDocuments({ userId: viewerId, read: false });
}

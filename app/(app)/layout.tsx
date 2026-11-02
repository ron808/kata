import { redirect } from "next/navigation";
import { Types } from "mongoose";
import { auth } from "@/lib/auth/authOptions";
import { connectDB } from "@/lib/db/mongoose";
import { User } from "@/lib/db/models/User";
import { hueOf } from "@/lib/social/dto";
import { unreadCount } from "@/lib/social/load";
import { unreadMessages } from "@/lib/social/messages";
import { companionHueOf, companionNameOf, nicknameOf } from "@/lib/companion/name";
import { localDay, validTimeZone } from "@/lib/companion/time";
import { focusState } from "@/lib/missions";
import { AppShell, type ShellUser } from "@/components/shared/AppShell";

async function loadShell(id: string, fallback: { name: string; email: string }): Promise<{ user: ShellUser; unread: number; messages: number }> {
  const base = { ...fallback, handle: null, timezone: null, hue: hueOf({ _id: new Types.ObjectId(id) }), names: { name: companionNameOf(null), nickname: nicknameOf(fallback), hue: null }, focus: null, focusTheme: "sea" as const };
  try {
    await connectDB();
    const [doc, unread, messages] = await Promise.all([
      User.findById(id).select("name handle hue timezone companionName nickname companionHue focusMissionId focusTheme").lean(),
      unreadCount(id),
      unreadMessages(id),
    ]);
    if (!doc) return { user: base, unread: 0, messages: 0 };
    const user = { ...base, name: doc.name || base.name, handle: doc.handle ?? null, timezone: doc.timezone ?? null, hue: hueOf(doc) };
    const focusTheme = doc.focusTheme ?? "sea";
    const focus = doc.focusMissionId ? await focusState(id, doc.focusMissionId, focusTheme, localDay(validTimeZone(doc.timezone))) : null;
    return { user: { ...user, focus, focusTheme, names: { name: companionNameOf(doc), nickname: nicknameOf({ ...doc, name: user.name }), hue: companionHueOf(doc) } }, unread, messages };
  } catch {
    // No database: the shell still renders; pages explain what's missing.
    return { user: base, unread: 0, messages: 0 };
  }
}

export default async function AuthedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { user, unread, messages } = await loadShell(session.user.id, {
    name: session.user.name ?? "Writer",
    email: session.user.email ?? "",
  });
  return (
    <AppShell user={user} unread={unread} messages={messages}>
      {children}
    </AppShell>
  );
}

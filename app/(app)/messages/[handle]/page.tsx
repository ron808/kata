import { notFound } from "next/navigation";
import { auth } from "@/lib/auth/authOptions";
import { connectDB } from "@/lib/db/mongoose";
import { User } from "@/lib/db/models/User";
import { validTimeZone } from "@/lib/companion/time";
import { listConversations, openConversation } from "@/lib/social/messages";
import { AppPage, PageHeader } from "@/components/shared/AppPage";
import { Chat } from "@/components/messages/Chat";
import { ConversationList } from "@/components/messages/ConversationList";

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  return { title: `@${handle} · Messages · Kata` };
}

/**
 * A conversation with someone. On a phone it's the whole page; on a desktop the list sits
 * beside it. `?draft=` starts the box with words to send (from a gallery page, say).
 */
export default async function ConversationPage({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ draft?: string }>;
}) {
  const [{ handle }, { draft }, session] = await Promise.all([params, searchParams, auth()]);
  const me = session!.user.id;
  await connectDB();
  // Opened first, so the list beside it no longer counts it as unread.
  const [open, user] = await Promise.all([openConversation(me, handle), User.findById(me).select("timezone").lean()]);
  if (!open) notFound();
  const list = await listConversations(me);

  return (
    <AppPage className="max-lg:!pb-2 max-lg:!pt-4">
      <div className="max-lg:hidden">
        <PageHeader kicker="Messages" title="Messages" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:mt-8 lg:grid-cols-12">
        <div className="min-w-0 max-lg:hidden lg:col-span-5">
          <ConversationList initial={list} active={open.person.handle} />
        </div>
        <div className="min-w-0 lg:col-span-7">
          <Chat key={open.person.handle} initial={open} draft={typeof draft === "string" ? draft.slice(0, 600) : ""} tz={validTimeZone(user?.timezone)} />
        </div>
      </div>
    </AppPage>
  );
}

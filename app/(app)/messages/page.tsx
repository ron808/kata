import { auth } from "@/lib/auth/authOptions";
import { connectDB } from "@/lib/db/mongoose";
import { listConversations } from "@/lib/social/messages";
import { AppPage, PageHeader } from "@/components/shared/AppPage";
import { Icon } from "@/components/shared/Icon";
import { ConversationList } from "@/components/messages/ConversationList";
import type { ConversationT } from "@/lib/types";

export const metadata = { title: "Messages · Kata" };

export default async function MessagesPage() {
  const session = await auth();
  let list: ConversationT[] | null = null;
  try {
    await connectDB();
    list = await listConversations(session!.user.id);
  } catch (err) {
    console.error("messages:load", err);
  }

  return (
    <AppPage>
      <PageHeader
        kicker="Messages"
        title="Messages"
        lede="Write to people who follow you back. Only the two of you see a conversation."
      />
      {list ? (
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-5">
            <ConversationList initial={list} />
          </div>
          <div className="card hidden min-h-[22rem] place-items-center p-8 text-center lg:col-span-7 lg:grid">
            <div className="max-w-[22rem]">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-full border-2 border-edge bg-sun text-on-sun">
                <Icon name="chat" className="h-6 w-6" />
              </span>
              <p className="mt-4 font-display text-display-s">Pick someone to write to</p>
              <p className="mt-2 text-ink/70">Or start from a friend’s profile: once you follow each other, it has a Message button.</p>
            </div>
          </div>
        </div>
      ) : (
        <p role="alert" data-hue="0" className="mt-8 rounded-md border-2 border-edge bg-tint px-4 py-3 font-medium text-deep">
          Messages can’t load right now. Reload in a moment.
        </p>
      )}
    </AppPage>
  );
}

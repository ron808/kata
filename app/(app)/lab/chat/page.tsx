import { AppPage, PageHeader } from "@/components/shared/AppPage";
import { ChatLooks } from "@/components/lab/chat/ChatLooks";

export const metadata = { title: "Chat looks · The Lab · Kata" };

export default function Page() {
  return (
    <AppPage>
      <PageHeader
        kicker="The Lab"
        title="Three looks for the chat"
        lede="The same conversation, the same buttons and the same rules, drawn three ways. Try each one, then say which to keep."
      />
      <div className="mt-8">
        <ChatLooks />
      </div>
    </AppPage>
  );
}

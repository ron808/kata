import { auth } from "@/lib/auth/authOptions";
import { loadMe, loadNotifications } from "@/lib/social/load";
import { AppPage, PageHeader } from "@/components/shared/AppPage";
import { NotificationList } from "@/components/people/NotificationList";
import { PeopleProvider } from "@/components/people/viewer";
import { notificationExtras } from "./extras";

export const metadata = { title: "Notifications · Kata" };

export default async function NotificationsPage() {
  const session = await auth();
  const viewerId = session!.user.id;

  const data = await Promise.all([loadNotifications(viewerId), loadMe(viewerId)])
    .then(async ([notes, me]) => ({ notes, me, extras: await notificationExtras(viewerId, notes.items) }))
    .catch((err) => {
      console.error("notifications:load", err);
      return null;
    });

  if (!data) {
    return (
      <AppPage width="text">
        <PageHeader title="Notifications" />
        <p role="alert" data-hue="0" className="mt-8 rounded-md border-2 border-edge bg-tint px-4 py-3 font-medium text-deep">
          Kata can’t reach the database right now. Reload in a moment.
        </p>
      </AppPage>
    );
  }

  const { notes, me, extras } = data;
  return (
    <PeopleProvider handle={me?.handle ?? null} suggested={me?.suggestedHandle}>
      <AppPage width="text">
        <NotificationList items={notes.items} unread={notes.unread} myHandle={me?.handle ?? null} extras={extras} />
      </AppPage>
    </PeopleProvider>
  );
}

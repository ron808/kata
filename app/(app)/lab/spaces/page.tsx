import { auth } from "@/lib/auth/authOptions";
import { contextFor } from "@/lib/companion/engine";
import { hueOf } from "@/lib/social/dto";
import { AppPage, PageHeader } from "@/components/shared/AppPage";
import { SpacesLab } from "@/components/lab/spaces/SpacesLab";
import { ME } from "@/components/lab/spaces/data";

export const metadata = { title: "Spaces · The Lab · Kata" };

export default async function Page() {
  const session = await auth();
  // The writer's own day and colour, so their threads and face look as they do elsewhere.
  const { day, tz, now, user } = await contextFor(session!.user.id);
  const name = user.name?.trim() || "You";
  return (
    <AppPage>
      <PageHeader
        kicker="The Lab"
        title="Three ways to share with a few people"
        lede="Your threads are private. These are three ways to share some of them with a few people you pick, and no one else. The people and threads in them are made up. Try each one, then say which to keep."
      />
      <div className="mt-8">
        <SpacesLab me={{ id: ME, name, first: name.split(/\s+/)[0], hue: hueOf(user) }} today={day} tz={tz} now={now.toISOString()} />
      </div>
    </AppPage>
  );
}

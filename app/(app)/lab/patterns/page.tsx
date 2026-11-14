import { auth } from "@/lib/auth/authOptions";
import { contextFor } from "@/lib/companion/engine";
import { AppPage, PageHeader } from "@/components/shared/AppPage";
import { PatternLooks } from "@/components/lab/patterns/PatternLooks";

export const metadata = { title: "Patterns · The Lab · Kata" };

export default async function Page() {
  const session = await auth();
  // The writer's own day, so the example's two months end yesterday for them.
  const { day } = await contextFor(session!.user.id);
  return (
    <AppPage>
      <PageHeader
        kicker="The Lab"
        title="Three ways to show patterns"
        lede="What went with better and worse moods and energy, on two months of made-up days, worked out exactly as the app does. Try each one, then say which to keep."
      />
      <div className="mt-8">
        <PatternLooks today={day} />
      </div>
    </AppPage>
  );
}

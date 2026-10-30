import { auth } from "@/lib/auth/authOptions";
import { ensureWeekly, listBreakdowns } from "@/lib/breakdowns";
import { contextFor } from "@/lib/companion/engine";
import { namesFor } from "@/lib/companion/naming";
import { AppPage, EmptyNote, PageHeader, Section } from "@/components/shared/AppPage";
import { BreakdownList } from "@/components/breakdowns/BreakdownList";
import { BreakdownView } from "@/components/breakdowns/BreakdownView";
import { MakeBreakdown } from "@/components/breakdowns/MakeBreakdown";
import type { BreakdownT } from "@/lib/types";

export const metadata = { title: "Breakdowns · Kata" };

async function load(userId: string): Promise<{ items: BreakdownT[]; today: string; tz: string } | null> {
  try {
    const ctx = await contextFor(userId);
    // Last week's comes the first time they look after it ends.
    await ensureWeekly(ctx).catch((err) => console.error("breakdowns:weekly", err));
    return { items: await listBreakdowns(userId), today: ctx.day, tz: ctx.tz };
  } catch (err) {
    console.error("breakdowns:load", err);
    return null;
  }
}

export default async function BreakdownsPage() {
  const session = await auth();
  const [data, { name }] = await Promise.all([load(session!.user.id), namesFor(session!.user.id)]);
  const [latest, ...earlier] = data?.items ?? [];
  return (
    <AppPage>
      <PageHeader
        kicker="How your time went"
        title="Breakdowns"
        lede={`What got done, what’s stuck, your habits, numbers and moods, with a score out of 10. One comes every Monday for the week before. For any other stretch, pick it here or ask ${name}.`}
      />
      {data ? (
        <div className="mt-8 grid grid-cols-1 gap-8">
          <MakeBreakdown />
          {latest ? (
            <BreakdownView b={latest} today={data.today} tz={data.tz} name={name} />
          ) : (
            <EmptyNote>No breakdowns yet. Pick a stretch above or ask {name}. Your first weekly one comes on Monday.</EmptyNote>
          )}
          {earlier.length ? (
            <Section title="Earlier" id="earlier">
              <BreakdownList items={earlier} today={data.today} />
            </Section>
          ) : null}
        </div>
      ) : (
        <p role="alert" data-hue="0" className="mt-8 rounded-md border-2 border-edge bg-tint px-4 py-3 font-medium text-deep">
          Kata can’t reach the database right now. Reload in a moment.
        </p>
      )}
    </AppPage>
  );
}

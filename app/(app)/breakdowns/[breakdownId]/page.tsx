import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth/authOptions";
import { getBreakdown, listBreakdowns } from "@/lib/breakdowns";
import { contextFor } from "@/lib/companion/engine";
import { namesFor } from "@/lib/companion/naming";
import { AppPage, Section } from "@/components/shared/AppPage";
import { BreakdownList } from "@/components/breakdowns/BreakdownList";
import { BreakdownView } from "@/components/breakdowns/BreakdownView";
import { Icon } from "@/components/shared/Icon";

export const metadata = { title: "Breakdown · Kata" };

export default async function BreakdownPage(props: { params: Promise<{ breakdownId: string }> }) {
  const [session, { breakdownId }] = await Promise.all([auth(), props.params]);
  const userId = session!.user.id;
  const [ctx, { name }] = await Promise.all([contextFor(userId), namesFor(userId)]);
  const [b, items] = await Promise.all([getBreakdown(userId, breakdownId), listBreakdowns(userId)]);
  if (!b) notFound();
  return (
    <AppPage>
      <Link href="/breakdowns" className="link inline-flex min-h-11 items-center gap-2 font-semibold">
        <Icon name="arrow-left" className="h-4 w-4" />
        All breakdowns
      </Link>
      <div className="mt-4">
        <BreakdownView b={b} today={ctx.day} tz={ctx.tz} name={name} heading="h1" />
      </div>
      {items.length > 1 ? (
        <Section title="Other breakdowns" id="others" className="mt-12">
          <BreakdownList items={items} today={ctx.day} current={b._id} />
        </Section>
      ) : null}
    </AppPage>
  );
}

import { auth } from "@/lib/auth/authOptions";
import { contextFor } from "@/lib/companion/engine";
import { namesFor } from "@/lib/companion/naming";
import { listMissions, toMissionT } from "@/lib/missions";
import { AppPage, PageHeader, Section } from "@/components/shared/AppPage";
import { MissionCard, PastMission } from "@/components/missions/MissionCard";
import { NewMission } from "@/components/missions/NewMission";
import type { MissionT } from "@/lib/types";

export const metadata = { title: "Missions · Kata" };

async function load(userId: string): Promise<{ open: MissionT[]; past: MissionT[] } | null> {
  try {
    const ctx = await contextFor(userId);
    const { open, past } = await listMissions(ctx);
    return { open: open.map((m) => toMissionT(m, ctx)), past: past.map((m) => toMissionT(m, ctx)) };
  } catch (err) {
    console.error("missions:load", err);
    return null;
  }
}

export default async function MissionsPage({ searchParams }: { searchParams: Promise<{ left?: string }> }) {
  const session = await auth();
  const [data, { name }, { left }] = await Promise.all([load(session!.user.id), namesFor(session!.user.id), searchParams]);
  return (
    <AppPage>
      <PageHeader
        kicker="For today, or for as long as it takes"
        title="Missions"
        lede={`A list of things to get through, with timers if you want them. Focus turns everything else off until you’re done, and ${name} asks only about what you’re doing.`}
      />
      {left ? (
        <p role="status" data-hue="1" className="mt-6 rounded-md border-2 border-edge bg-tint px-4 py-3 font-medium text-deep">
          Focus was left on, so the clocks stopped at the last thing you did. Your list is still here.
        </p>
      ) : null}
      {data ? (
        <div className="mt-8 grid grid-cols-1 gap-8">
          {data.open.length ? (
            <Section title="Going now" id="going">
              <div className="grid grid-cols-1 gap-4">
                {data.open.map((m) => (
                  <MissionCard key={m._id} mission={m} />
                ))}
              </div>
            </Section>
          ) : null}
          <Section title="Start one" id="start">
            <NewMission />
          </Section>
          {data.past.length ? (
            <Section title="Earlier" id="earlier">
              <ul className="card divide-y-2 divide-edge/15 px-5 py-1">
                {data.past.map((m) => (
                  <PastMission key={m._id} mission={m} />
                ))}
              </ul>
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

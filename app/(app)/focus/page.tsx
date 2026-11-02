import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/authOptions";
import { contextFor } from "@/lib/companion/engine";
import { focusedMission, toMissionT } from "@/lib/missions";
import { AppPage } from "@/components/shared/AppPage";
import { FocusScreen } from "@/components/focus/FocusScreen";

export const metadata = { title: "Focus · Kata" };

async function load(userId: string) {
  try {
    const ctx = await contextFor(userId);
    const { mission, leftAt } = await focusedMission(ctx);
    return { ctx, mission: mission ? toMissionT(mission, ctx) : null, leftAt };
  } catch (err) {
    console.error("focus:load", err);
    return null;
  }
}

export default async function FocusPage() {
  const session = await auth();
  const data = await load(session!.user.id);
  if (!data) {
    return (
      <AppPage width="text">
        <p role="alert" data-hue="0" className="rounded-md border-2 border-edge bg-tint px-4 py-3 font-medium text-deep">
          Kata can’t reach the database right now. Reload in a moment.
        </p>
      </AppPage>
    );
  }
  // Nothing in focus, or it was left on and stopped: the missions page says where things stand.
  if (!data.mission) redirect(data.leftAt ? "/missions?left=1" : "/missions");
  return <FocusScreen key={data.mission._id} mission={data.mission} theme={data.ctx.user.focusTheme ?? "sea"} />;
}

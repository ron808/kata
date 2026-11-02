import { notFound } from "next/navigation";
import { auth } from "@/lib/auth/authOptions";
import { contextFor } from "@/lib/companion/engine";
import { getMission, toMissionT } from "@/lib/missions";
import { AppPage } from "@/components/shared/AppPage";
import { MissionView } from "@/components/missions/MissionView";

export const metadata = { title: "Mission · Kata" };

export default async function MissionPage({ params }: { params: Promise<{ missionId: string }> }) {
  const session = await auth();
  const { missionId } = await params;
  const ctx = await contextFor(session!.user.id);
  const mission = await getMission(ctx, missionId);
  if (!mission) notFound();
  return (
    <AppPage width="text">
      <MissionView key={String(mission._id)} mission={toMissionT(mission, ctx)} />
    </AppPage>
  );
}

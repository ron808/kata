import { BeginSection } from "@/components/landing/BeginSection";
import { Hero } from "@/components/landing/Hero";
import { MindScene } from "@/components/landing/MindScene";
import { PeopleSection } from "@/components/landing/PeopleSection";
import { PrivateSection } from "@/components/landing/PrivateSection";
import { QuestionsSection } from "@/components/landing/QuestionsSection";
import { RolesSection } from "@/components/landing/RolesSection";
import Scenes from "@/components/landing/Scenes";
import { SessionCheck } from "@/components/landing/Session";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { formatDate } from "@/lib/utils/dates";

// Static and cached for everyone; regenerated hourly so the server-rendered date is
// today's (UTC). Who's signed in is checked in the browser (SessionCheck).
export const revalidate = 3600;

export default function LandingPage() {
  const now = new Date();
  return (
    <>
      <SiteHeader />
      <main id="main">
        <Hero />
        <MindScene />
        <QuestionsSection todayLong={formatDate(now, "long", "UTC")} />
        <PeopleSection />
        <RolesSection />
        <PrivateSection />
        <BeginSection todayWeekday={formatDate(now, "weekday", "UTC")} />
      </main>
      <SiteFooter />
      <SessionCheck />
      <Scenes />
    </>
  );
}

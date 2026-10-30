import { AppPage, PageHeader } from "@/components/shared/AppPage";
import { LabIndex } from "@/components/lab/LabIndex";

export const metadata = { title: "The Lab · Kata" };

export default function LabPage() {
  return (
    <AppPage>
      <PageHeader
        kicker="The Lab"
        title={
          <>
            What Kata could <em className="text-accent">become.</em>
          </>
        }
        lede="Sixteen agents each looked at Kata through a different lens and came back with 96 ideas for memories, people and doing things together. They were folded into sixteen concepts and scored by three judges. The top seven are built below as clickable prototypes with demo data. Try each one and give it a verdict."
      />
      <LabIndex />
    </AppPage>
  );
}

import { auth } from "@/lib/auth/authOptions";
import { LooksPreview } from "@/components/looks/LooksPreview";
import { lookFonts } from "@/components/looks/fonts";
import { formatDate } from "@/lib/utils/dates";

export const metadata = { title: "Three looks · Kata" };

export default async function LooksPage() {
  const session = await auth();
  const first = session?.user?.name?.trim().split(/\s+/)[0] ?? "";
  return (
    <div className={lookFonts}>
      <LooksPreview first={first} date={formatDate(new Date(), "long", "UTC")} />
    </div>
  );
}
